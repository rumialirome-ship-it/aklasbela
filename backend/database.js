
const path = require('path');
const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');

const DB_PATH = path.join(__dirname, 'database.sqlite');
let db;

// --- ROBUST PKT MARKET TIMING ENGINE ---
function getGameCycle(drawTime) {
    if (!drawTime || typeof drawTime !== 'string' || !drawTime.includes(':')) {
        return { openTime: new Date(0), closeTime: new Date(0) };
    }

    // Get current time in Pakistan Standard Time
    const nowUTC = new Date();
    const pktString = nowUTC.toLocaleString("en-US", { timeZone: "Asia/Karachi" });
    const nowPKT = new Date(pktString);
    
    const [drawH, drawM] = drawTime.split(':').map(Number);
    
    // 1. Determine when the CURRENT market cycle started (Always 4:00 PM PKT)
    let cycleStartPKT = new Date(nowPKT);
    cycleStartPKT.setHours(16, 0, 0, 0);
    
    // If it's currently before 4 PM, the cycle we are in started yesterday
    if (nowPKT.getHours() < 16) {
        cycleStartPKT.setDate(cycleStartPKT.getDate() - 1);
    }

    // 2. Determine when THIS SPECIFIC DRAW closes relative to that cycle start
    let drawClosePKT = new Date(cycleStartPKT);
    drawClosePKT.setHours(drawH, drawM, 0, 0);

    // If the draw hour is before 4 PM (e.g., 00:55, 02:10), 
    // it happens on the calendar day AFTER the cycle started.
    if (drawH < 16) {
        drawClosePKT.setDate(drawClosePKT.getDate() + 1);
    }

    // Return UTC equivalents for the server to compare
    // Note: We use the timestamp diff to adjust the original UTC 'now'
    const offset = drawClosePKT.getTime() - cycleStartPKT.getTime();
    const openUTC = new Date(cycleStartPKT.toLocaleString("en-US", { timeZone: "UTC" })); // Rough conversion
    
    // Simplest approach: compare everything in PKT context
    return { nowPKT, cycleStartPKT, drawClosePKT };
}

function isGameOpen(drawTime) {
    if (!drawTime) return false;
    const { nowPKT, cycleStartPKT, drawClosePKT } = getGameCycle(drawTime);
    // Open if: Now is after 4 PM opening AND before the scheduled draw
    return nowPKT >= cycleStartPKT && nowPKT < drawClosePKT;
}

const connect = () => {
    try {
        db = new Database(DB_PATH, { timeout: 5000 });
        db.pragma('journal_mode = WAL');
        db.pragma('foreign_keys = ON');
        
        try {
            db.prepare("ALTER TABLE games ADD COLUMN isVisible INTEGER DEFAULT 1").run();
        } catch (e) {}

        console.log('[DB] Database connected.');
        return true;
    } catch (error) {
        console.error('[DB] Connection failed:', error.message);
        return false;
    }
};

const isSchemaValid = () => {
    try {
        if (!db) return false;
        const stmt = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='admins'");
        const result = stmt.get();
        return !!result;
    } catch (error) {
        return false;
    }
};

const findAccountById = (id, table) => {
    if (!db) return null;
    try {
        const stmt = db.prepare(`SELECT * FROM ${table} WHERE LOWER(id) = LOWER(?)`);
        const account = stmt.get(id);
        if (!account) return null;
        
        if (table !== 'games') {
            account.ledger = db.prepare('SELECT * FROM ledgers WHERE LOWER(accountId) = LOWER(?) ORDER BY timestamp ASC').all(id);
        } else {
            account.isMarketOpen = isGameOpen(account.drawTime);
            account.isVisible = !!account.isVisible;
        }
        
        // CRITICAL FIX: Robust JSON parsing with fallback to prevents 'null' property errors
        const defaultPrizeRates = { oneDigitOpen: 90, oneDigitClose: 90, twoDigit: 900 };
        const defaultBetLimits = { oneDigit: 1000, twoDigit: 5000, perDraw: 20000 };

        if (account.prizeRates && typeof account.prizeRates === 'string') {
            try { account.prizeRates = JSON.parse(account.prizeRates); } catch(e) { account.prizeRates = defaultPrizeRates; }
        } else if (!account.prizeRates && table !== 'games') {
            account.prizeRates = defaultPrizeRates;
        }

        if (account.betLimits && typeof account.betLimits === 'string') {
            try { account.betLimits = JSON.parse(account.betLimits); } catch(e) { account.betLimits = defaultBetLimits; }
        } else if (!account.betLimits && table === 'users') {
            account.betLimits = defaultBetLimits;
        }
        
        if ('isRestricted' in account) account.isRestricted = !!account.isRestricted;
        
        return account;
    } catch (e) {
        console.error('[DB] findAccountById error:', e);
        return null;
    }
};

const findAccountForLogin = (loginId) => {
    if (!db) return { account: null, role: null };
    const lowerCaseLoginId = loginId.toLowerCase();
    const tables = [{ name: 'users', role: 'USER' }, { name: 'dealers', role: 'DEALER' }, { name: 'admins', role: 'ADMIN' }];
    for (const tableInfo of tables) {
        try {
            const stmt = db.prepare(`SELECT * FROM ${tableInfo.name} WHERE LOWER(id) = ?`);
            const account = stmt.get(lowerCaseLoginId);
            if (account) return { account, role: tableInfo.role };
        } catch (e) {}
    }
    return { account: null, role: null };
};

const updatePassword = (accountId, contact, newPassword) => {
    if (!db) return false;
    const tables = ['users', 'dealers'];
    for (const table of tables) {
        try {
            const result = db.prepare(`UPDATE ${table} SET password = ? WHERE LOWER(id) = LOWER(?) AND contact = ?`).run(newPassword, accountId, contact);
            if (result.changes > 0) return true;
        } catch (e) {}
    }
    return false;
};

const getAllFromTable = (table, withLedger = false) => {
    if (!db) return [];
    try {
        return db.prepare(`SELECT * FROM ${table}`).all().map(acc => {
            try {
                if (withLedger && acc.id) acc.ledger = db.prepare('SELECT * FROM ledgers WHERE LOWER(accountId) = LOWER(?) ORDER BY timestamp ASC').all(acc.id);
                if (table === 'games' && acc.drawTime) {
                    acc.isMarketOpen = isGameOpen(acc.drawTime);
                    acc.isVisible = !!acc.isVisible;
                }
                
                // Deep null safety for list results
                if (acc.prizeRates && typeof acc.prizeRates === 'string') {
                    try { acc.prizeRates = JSON.parse(acc.prizeRates); } catch(e) { acc.prizeRates = { oneDigitOpen: 0, oneDigitClose: 0, twoDigit: 0 }; }
                }
                if (acc.betLimits && typeof acc.betLimits === 'string') {
                    try { acc.betLimits = JSON.parse(acc.betLimits); } catch(e) { acc.betLimits = { oneDigit: 0, twoDigit: 0, perDraw: 0 }; }
                }

                if (table === 'bets' && acc.numbers && typeof acc.numbers === 'string') acc.numbers = JSON.parse(acc.numbers);
                if ('isRestricted' in acc) acc.isRestricted = !!acc.isRestricted;
            } catch (e) { console.error(`[DB] Row parse error in ${table}:`, e); }
            return acc;
        });
    } catch (err) {
        console.error(`[DB] Fetch failed for ${table}:`, err.message);
        return [];
    }
};

const runInTransaction = (fn) => {
    if (!db) throw new Error("Database not connected");
    return db.transaction(fn)();
};

const toggleGameVisibility = (id) => {
    const game = db.prepare('SELECT isVisible FROM games WHERE id = ?').get(id);
    if (!game) return null;
    const newStatus = game.isVisible ? 0 : 1;
    db.prepare('UPDATE games SET isVisible = ? WHERE id = ?').run(newStatus, id);
    return findAccountById(id, 'games');
};

const addLedgerEntry = (accountId, accountType, description, debit, credit) => {
    const table = accountType.toLowerCase() + 's';
    const account = db.prepare(`SELECT wallet FROM ${table} WHERE LOWER(id) = LOWER(?)`).get(accountId);
    const lastBalance = account ? account.wallet : 0;
    if (debit > 0 && accountType !== 'ADMIN' && lastBalance < debit) {
        throw { status: 400, message: `Insufficient funds available.` };
    }
    const newBalance = lastBalance - debit + credit;
    db.prepare('INSERT INTO ledgers (id, accountId, accountType, timestamp, description, debit, credit, balance) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(uuidv4(), accountId, accountType, new Date().toISOString(), description, debit, credit, newBalance);
    db.prepare(`UPDATE ${table} SET wallet = ? WHERE LOWER(id) = LOWER(?)`).run(newBalance, accountId);
};

const declareWinnerForGame = (gameId, winningNumber) => {
    let finalGame;
    runInTransaction(() => {
        const game = db.prepare('SELECT * FROM games WHERE id = ?').get(gameId);
        if (!game || game.winningNumber) throw { status: 400, message: 'Winner already declared for this session.' };
        if (game.name === 'AK') {
            db.prepare('UPDATE games SET winningNumber = ? WHERE id = ?').run(`${winningNumber}_`, gameId);
        } else if (game.name === 'AKC') {
            db.prepare('UPDATE games SET winningNumber = ? WHERE id = ?').run(winningNumber, gameId);
            const akGame = db.prepare("SELECT * FROM games WHERE name = 'AK'").get();
            if (akGame && akGame.winningNumber && akGame.winningNumber.endsWith('_')) {
                db.prepare("UPDATE games SET winningNumber = ? WHERE name = 'AK'").run(akGame.winningNumber.slice(0, 1) + winningNumber);
            }
        } else {
            db.prepare('UPDATE games SET winningNumber = ? WHERE id = ?').run(winningNumber, gameId);
        }
        finalGame = findAccountById(gameId, 'games');
    });
    return finalGame;
};

const updateWinningNumber = (gameId, newWinningNumber) => {
    let updatedGame;
    runInTransaction(() => {
        const game = db.prepare('SELECT * FROM games WHERE id = ?').get(gameId);
        if (!game || !game.winningNumber || game.payoutsApproved) throw { status: 400, message: 'Cannot update results after approval.' };
        if (game.name === 'AK') {
            const closeDigit = game.winningNumber.endsWith('_') ? '_' : game.winningNumber.slice(1, 2);
            db.prepare('UPDATE games SET winningNumber = ? WHERE id = ?').run(newWinningNumber + closeDigit, gameId);
        } else if (game.name === 'AKC') {
            db.prepare('UPDATE games SET winningNumber = ? WHERE id = ?').run(newWinningNumber, gameId);
            const akGame = db.prepare("SELECT * FROM games WHERE name = 'AK'").get();
            if (akGame && akGame.winningNumber && !akGame.winningNumber.endsWith('_')) {
                db.prepare("UPDATE games SET winningNumber = ? WHERE name = 'AK'").run(akGame.winningNumber.slice(0, 1) + newWinningNumber);
            }
        } else {
            db.prepare('UPDATE games SET winningNumber = ? WHERE id = ?').run(newWinningNumber, gameId);
        }
        updatedGame = findAccountById(gameId, 'games');
    });
    return updatedGame;
};

const approvePayoutsForGame = (gameId) => {
    let updatedGame;
    runInTransaction(() => {
        const game = db.prepare('SELECT * FROM games WHERE id = ?').get(gameId);
        if (!game || !game.winningNumber || game.payoutsApproved || (game.name === 'AK' && game.winningNumber.endsWith('_'))) throw { status: 400, message: "Payout conditions not met." };
        const winningBets = db.prepare('SELECT * FROM bets WHERE gameId = ?').all(gameId).map(b => ({ ...b, numbers: JSON.parse(b.numbers) }));
        const allUsers = Object.fromEntries(getAllFromTable('users').map(u => [u.id, u]));
        const allDealers = Object.fromEntries(getAllFromTable('dealers').map(d => [d.id, d]));
        const admin = findAccountById('Guru', 'admins');
        const getMultiplier = (r, t) => {
            if (!r) return 0;
            return t === "1 Digit Open" ? r.oneDigitOpen : t === "1 Digit Close" ? r.oneDigitClose : r.twoDigit;
        };
        winningBets.forEach(bet => {
            const wins = bet.numbers.filter(n => {
                if (bet.subGameType === "1 Digit Open") return game.winningNumber.length === 2 && n === game.winningNumber[0];
                if (bet.subGameType === "1 Digit Close") return game.name === 'AKC' ? n === game.winningNumber : (game.winningNumber.length === 2 && n === game.winningNumber[1]);
                return n === game.winningNumber;
            });
            if (wins.length > 0) {
                const user = allUsers[bet.userId], dealer = allDealers[bet.dealerId];
                if (!user || !dealer) return;
                const userPrize = wins.length * bet.amountPerNumber * getMultiplier(user.prizeRates, bet.subGameType);
                const dProfit = wins.length * bet.amountPerNumber * (getMultiplier(dealer.prizeRates, bet.subGameType) - getMultiplier(user.prizeRates, bet.subGameType));
                addLedgerEntry(user.id, 'USER', `Prize: ${game.name}`, 0, userPrize);
                addLedgerEntry(admin.id, 'ADMIN', `Payout: ${user.name}`, userPrize, 0);
                addLedgerEntry(dealer.id, 'DEALER', `Profit Share: ${game.name}`, 0, dProfit);
                addLedgerEntry(admin.id, 'ADMIN', `Dealer Share: ${dealer.name}`, dProfit, 0);
            }
        });
        db.prepare('UPDATE games SET payoutsApproved = 1 WHERE id = ?').run(gameId);
        updatedGame = findAccountById(gameId, 'games');
    });
    return updatedGame;
};

const getFinancialSummary = () => {
    if (!db) return null;
    const games = db.prepare('SELECT * FROM games WHERE winningNumber IS NOT NULL').all();
    const allBets = db.prepare('SELECT * FROM bets').all().map(b => ({...b, numbers: JSON.parse(b.numbers)}));
    const allUsers = Object.fromEntries(getAllFromTable('users').map(u => [u.id, u])), allDealers = Object.fromEntries(getAllFromTable('dealers').map(d => [d.id, d]));
    const getMultiplier = (r, t) => {
        if (!r) return 0;
        return t === "1 Digit Open" ? r.oneDigitOpen : t === "1 Digit Close" ? r.oneDigitClose : r.twoDigit;
    };
    const summary = games.map(game => {
        const gameBets = allBets.filter(b => b.gameId === game.id);
        const totalStake = gameBets.reduce((s, b) => s + b.totalAmount, 0);
        let payouts = 0, dProfit = 0;
        if (!game.winningNumber.endsWith('_')) {
            gameBets.forEach(bet => {
                const wins = bet.numbers.filter(n => {
                    if (bet.subGameType === "1 Digit Open") return game.winningNumber.length === 2 && n === game.winningNumber[0];
                    if (bet.subGameType === "1 Digit Close") return game.name === 'AKC' ? n === game.winningNumber : (game.winningNumber.length === 2 && n === game.winningNumber[1]);
                    return n === game.winningNumber;
                });
                if (wins.length > 0) {
                    const u = allUsers[bet.userId], d = allDealers[bet.dealerId];
                    if (u && d) {
                        payouts += wins.length * bet.amountPerNumber * getMultiplier(u.prizeRates, bet.subGameType);
                        dProfit += wins.length * bet.amountPerNumber * (getMultiplier(d.prizeRates, bet.subGameType) - getMultiplier(u.prizeRates, bet.subGameType));
                    }
                }
            });
        }
        const comms = gameBets.reduce((s, b) => {
            const u = allUsers[b.userId], d = allDealers[b.dealerId];
            return u && d ? s + (b.totalAmount * (u.commissionRate / 100)) + (b.totalAmount * ((d.commissionRate - u.commissionRate) / 100)) : s;
        }, 0);
        return { gameName: game.name, winningNumber: game.winningNumber, totalStake, totalPayouts: payouts, totalDealerProfit: dProfit, totalCommissions: comms, netProfit: totalStake - payouts - dProfit - comms };
    });
    const totals = summary.reduce((t, g) => { t.totalStake += g.totalStake; t.totalPayouts += g.totalPayouts; t.totalDealerProfit += g.totalDealerProfit; t.totalCommissions += g.totalCommissions; t.netProfit += g.netProfit; return t; }, { totalStake: 0, totalPayouts: 0, totalDealerProfit: 0, totalCommissions: 0, netProfit: 0 });
    return { games: summary.sort((a,b) => a.gameName.localeCompare(b.gameName)), totals, totalBets: allBets.length };
};

const createDealer = (d) => {
    const existing = findAccountForLogin(d.id);
    if (existing.account) throw { status: 400, message: `Login ID "${d.id}" is already active.` };
    db.prepare('INSERT INTO dealers (id, name, password, area, contact, wallet, commissionRate, isRestricted, prizeRates, avatarUrl) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(d.id, d.name, d.password, d.area, d.contact, d.wallet || 0, d.commissionRate, 0, JSON.stringify(d.prizeRates), d.avatarUrl);
    if (d.wallet > 0) addLedgerEntry(d.id, 'DEALER', 'Initialization Liquidity', 0, d.wallet);
    return findAccountById(d.id, 'dealers');
};

const updateDealer = (d, originalId) => {
    if (d.id.toLowerCase() !== originalId.toLowerCase() && findAccountForLogin(d.id).account) throw { status: 400, message: `New ID "${d.id}" already in use.` };
    db.prepare('UPDATE dealers SET id = ?, name = ?, password = ?, area = ?, contact = ?, commissionRate = ?, prizeRates = ?, avatarUrl = ? WHERE LOWER(id) = LOWER(?)').run(d.id, d.name, d.password, d.area, d.contact, d.commissionRate, JSON.stringify(d.prizeRates), d.avatarUrl, originalId);
    if (d.id !== originalId) {
        db.prepare('UPDATE users SET dealerId = ? WHERE LOWER(dealerId) = LOWER(?)').run(d.id, originalId);
        db.prepare('UPDATE bets SET dealerId = ? WHERE LOWER(dealerId) = LOWER(?)').run(d.id, originalId);
        db.prepare('UPDATE ledgers SET accountId = ? WHERE LOWER(accountId) = LOWER(?) AND accountType = ?').run(d.id, originalId, 'DEALER');
    }
    return findAccountById(d.id, 'dealers');
};

const findUsersByDealerId = (id) => db.prepare('SELECT id FROM users WHERE LOWER(dealerId) = LOWER(?)').all(id).map(u => findAccountById(u.id, 'users'));
const findBetsByDealerId = (id) => db.prepare('SELECT * FROM bets WHERE LOWER(dealerId) = LOWER(?) ORDER BY timestamp DESC').all(id).map(b => ({ ...b, numbers: JSON.parse(b.numbers) }));
const findBetsByUserId = (id) => db.prepare('SELECT * FROM bets WHERE LOWER(userId) = LOWER(?) ORDER BY timestamp DESC').all(id).map(b => ({ ...b, numbers: JSON.parse(b.numbers) }));
const findBetsByGameId = (id) => db.prepare('SELECT * FROM bets WHERE gameId = ?').all(id).map(b => ({ ...b, numbers: JSON.parse(b.numbers) }));

const findUserByDealer = (uId, dId) => { 
    const stmt = db.prepare('SELECT * FROM users WHERE LOWER(id) = LOWER(?) AND LOWER(dealerId) = LOWER(?)');
    const userRow = stmt.get(uId, dId);
    if (!userRow) return null;
    return findAccountById(userRow.id, 'users'); 
};

const createUser = (u, dId, dep = 0) => {
    const existing = findAccountForLogin(u.id);
    if (existing.account) throw { status: 400, message: `The member ID "${u.id}" is already registered.` };
    
    const dealer = findAccountById(dId, 'dealers');
    const depositAmount = Number(dep) || 0;
    if (isNaN(depositAmount) || depositAmount < 0) throw { status: 400, message: 'Invalid funding value.' };
    if (!dealer || dealer.wallet < depositAmount) throw { status: 400, message: 'Dealer liquidity insufficient for allocation.' };
    
    runInTransaction(() => {
        const betLimits = u.betLimits || { oneDigit: 1000, twoDigit: 5000, perDraw: 20000 };
        db.prepare('INSERT INTO users (id, name, password, dealerId, area, contact, wallet, commissionRate, isRestricted, prizeRates, betLimits, avatarUrl) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(u.id, u.name, u.password, dId, u.area, u.contact, 0, u.commissionRate, 0, JSON.stringify(u.prizeRates), JSON.stringify(betLimits), u.avatarUrl);
        if (depositAmount > 0) { 
            addLedgerEntry(dId, 'DEALER', `User Allocation: ${u.name}`, depositAmount, 0); 
            addLedgerEntry(u.id, 'USER', `Liquidity From Dealer`, 0, depositAmount); 
        }
    });
    return findAccountById(u.id, 'users');
};

const updateUser = (u, uId, dId) => {
    const existing = findUserByDealer(uId, dId);
    if (!existing) throw { status: 404, message: "Member account not found." };
    runInTransaction(() => {
        db.prepare('UPDATE users SET id = ?, name = ?, password = ?, area = ?, contact = ?, commissionRate = ?, prizeRates = ?, betLimits = ?, avatarUrl = ? WHERE LOWER(id) = LOWER(?)').run(u.id, u.name, u.password || existing.password, u.area, u.contact, u.commissionRate, JSON.stringify(u.prizeRates), JSON.stringify(u.betLimits), u.avatarUrl, uId);
        if (u.id.toLowerCase() !== uId.toLowerCase()) {
            db.prepare('UPDATE bets SET userId = ? WHERE LOWER(userId) = LOWER(?)').run(u.id, uId);
            db.prepare('UPDATE ledgers SET accountId = ? WHERE LOWER(accountId) = LOWER(?) AND accountType = ?').run(u.id, uId, 'USER');
        }
    });
    return findAccountById(u.id, 'users');
};

const updateUserByAdmin = (u, uId) => {
    const existing = db.prepare('SELECT * FROM users WHERE LOWER(id) = LOWER(?)').get(uId);
    if (!existing) throw { status: 404, message: "Member account not found." };
    runInTransaction(() => {
        db.prepare('UPDATE users SET name = ?, password = ?, area = ?, contact = ?, commissionRate = ?, prizeRates = ?, betLimits = ?, avatarUrl = ? WHERE LOWER(id) = LOWER(?)').run(u.name, u.password || existing.password, u.area, u.contact, u.commissionRate, JSON.stringify(u.prizeRates), JSON.stringify(u.betLimits), u.avatarUrl, uId);
    });
    return findAccountById(uId, 'users');
};

const deleteUserByDealer = (uId, dId) => {
    const user = findUserByDealer(uId, dId);
    if (!user) throw { status: 404, message: "Member account not found." };
    runInTransaction(() => {
        db.prepare('DELETE FROM ledgers WHERE LOWER(accountId) = LOWER(?) AND accountType = ?').run(uId, 'USER');
        db.prepare('DELETE FROM bets WHERE LOWER(userId) = LOWER(?)').run(uId);
        db.prepare('DELETE FROM users WHERE LOWER(id) = LOWER(?)').run(uId);
    });
    return true;
};

const toggleAccountRestrictionByAdmin = (id, type) => {
    let result;
    runInTransaction(() => {
        const table = type.toLowerCase() + 's';
        const acc = db.prepare(`SELECT isRestricted FROM ${table} WHERE LOWER(id) = LOWER(?)`).get(id);
        if (!acc) throw { status: 404, message: 'Account node offline.' };
        const status = acc.isRestricted ? 0 : 1;
        db.prepare(`UPDATE ${table} SET isRestricted = ? WHERE LOWER(id) = LOWER(?)`).run(status, id);
        if (type.toLowerCase() === 'dealer') db.prepare(`UPDATE users SET isRestricted = ? WHERE LOWER(dealerId) = LOWER(?)`).run(status, id);
        result = findAccountById(id, table);
    });
    return result;
};

const toggleUserRestrictionByDealer = (uId, dId) => {
    const user = db.prepare('SELECT isRestricted FROM users WHERE LOWER(id) = LOWER(?) AND LOWER(dealerId) = LOWER(?)').get(uId, dId);
    if (!user) throw { status: 404, message: 'Member node offline.' };
    db.prepare('UPDATE users SET isRestricted = ? WHERE LOWER(id) = LOWER(?)').run(user.isRestricted ? 0 : 1, uId);
    return findAccountById(uId, 'users');
};

const createBet = (b) => db.prepare('INSERT INTO bets (id, userId, dealerId, gameId, subGameType, numbers, amountPerNumber, totalAmount, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(b.id, b.userId, b.dealerId, b.gameId, b.subGameType, b.numbers, b.amountPerNumber, b.totalAmount, b.timestamp);

const getNumberStakeSummary = ({ gameId, dealerId, date }) => {
    if (!db) return null;
    let query = 'SELECT gameId, subGameType, numbers, amountPerNumber, totalAmount FROM bets';
    const params = [], cond = [];
    if (gameId) { cond.push('gameId = ?'); params.push(gameId); }
    if (dealerId) { cond.push('LOWER(dealerId) = LOWER(?)'); params.push(dealerId); }
    if (date) { cond.push('date(timestamp) = ?'); params.push(date); }
    if (cond.length > 0) query += ' WHERE ' + cond.join(' AND ');
    const bets = db.prepare(query).all(...params);
    const summary = { '2-digit': new Map(), '1-open': new Map(), '1-close': new Map(), 'game-breakdown': new Map() };
    bets.forEach(b => {
        summary['game-breakdown'].set(b.gameId, (summary['game-breakdown'].get(b.gameId) || 0) + b.totalAmount);
        try {
            const nums = typeof b.numbers === 'string' ? JSON.parse(b.numbers) : b.numbers;
            const amt = b.amountPerNumber;
            let target;
            if (b.subGameType === '1 Digit Open') target = summary['1-open'];
            else if (b.subGameType === '1 Digit Close') target = summary['1-close'];
            else target = summary['2-digit'];
            nums.forEach(n => target.set(n, (target.get(n) || 0) + amt));
        } catch (e) {}
    });
    const sort = (m) => Array.from(m.entries()).map(([number, stake]) => ({ number, stake })).sort((a, b) => b.stake - a.stake);
    return { twoDigit: sort(summary['2-digit']), oneDigitOpen: sort(summary['1-open']), oneDigitClose: sort(summary['1-close']), gameBreakdown: Array.from(summary['game-breakdown'].entries()).map(([gameId, stake]) => ({ gameId, stake })) };
};

const placeBulkBets = (uId, gId, groups, placedBy = 'USER') => {
    let result = null;
    runInTransaction(() => {
        const user = findAccountById(uId, 'users');
        if (!user || user.isRestricted) throw { status: 403, message: 'Member node access restricted.' };
        const dealer = findAccountById(user.dealerId, 'dealers');
        const game = findAccountById(gId, 'games');
        if (!game) throw { status: 404, message: 'Market node unavailable.' };
        
        // Strictly verify the market is within its 4PM -> DrawTime window
        if (!isGameOpen(game.drawTime)) {
            throw { status: 400, message: `Market Closed: The entry cycle for ${game.name} has concluded.` };
        }

        const admin = findAccountById('Guru', 'admins');
        const globalLimits = db.prepare('SELECT * FROM number_limits').all();
        const existingBets = db.prepare('SELECT * FROM bets WHERE gameId = ?').all(gId);
        const userExistingTotal = existingBets.filter(b => b.userId === uId).reduce((s, b) => s + b.totalAmount, 0);
        const requestTotal = groups.reduce((s, g) => s + g.numbers.length * g.amountPerNumber, 0);
        
        // Defensive default for betLimits
        const activeLimits = user.betLimits || { oneDigit: 1000, twoDigit: 5000, perDraw: 20000 };

        if (activeLimits.perDraw > 0 && (userExistingTotal + requestTotal) > activeLimits.perDraw) {
            throw { status: 400, message: `Personal Cap Reached: Max entry for this draw is PKR ${activeLimits.perDraw}.` };
        }
        
        const numberStakeMap = new Map();
        existingBets.forEach(b => {
            const nums = typeof b.numbers === 'string' ? JSON.parse(b.numbers) : b.numbers;
            const type = b.subGameType;
            nums.forEach(n => {
                const key = `${type}_${n}`;
                numberStakeMap.set(key, (numberStakeMap.get(key) || 0) + b.amountPerNumber);
            });
        });

        groups.forEach(g => {
            const stake = g.amountPerNumber;
            const type = g.subGameType;
            const limitType = type === '1 Digit Open' ? '1-open' : type === '1 Digit Close' ? '1-close' : '2-digit';
            const userSingleLimit = limitType === '2-digit' ? activeLimits.twoDigit : activeLimits.oneDigit;
            
            g.numbers.forEach(n => {
                const key = `${type}_${n}`;
                const currentStake = numberStakeMap.get(key) || 0;
                const newStake = currentStake + stake;
                const globalLimit = globalLimits.find(l => l.gameType === limitType && l.numberValue === n);
                if (globalLimit && newStake > globalLimit.limitAmount) {
                    throw { status: 400, message: `Market Capacity: Position for '${n}' (${type}) is fully committed.` };
                }
                if (userSingleLimit > 0 && newStake > userSingleLimit) {
                    throw { status: 400, message: `Individual Cap: Position for '${n}' exceeds your personal PKR ${userSingleLimit} limit.` };
                }
            });
        });

        if (user.wallet < requestTotal) throw { status: 400, message: `Insufficient Balance: Node liquidity too low for entry.` };
        
        const userComm = requestTotal * (user.commissionRate / 100);
        const dComm = requestTotal * ((dealer.commissionRate - user.commissionRate) / 100);
        
        addLedgerEntry(user.id, 'USER', `Ticket Entry: ${game.name}`, requestTotal, 0);
        if (userComm > 0) addLedgerEntry(user.id, 'USER', `Entry Rebate`, 0, userComm);
        addLedgerEntry(admin.id, 'ADMIN', `Stake Entry: ${user.name}`, 0, requestTotal);
        if (userComm > 0) addLedgerEntry(admin.id, 'ADMIN', `Member Rebate`, userComm, 0);
        if (dComm > 0) { 
            addLedgerEntry(admin.id, 'ADMIN', `Dealer Rebate`, dComm, 0); 
            addLedgerEntry(dealer.id, 'DEALER', `Rebate from ${user.name}`, 0, dComm); 
        }

        const created = [];
        groups.forEach(g => {
            const b = { 
                id: uuidv4(), userId: uId, dealerId: dealer.id, gameId: game.id, 
                subGameType: g.subGameType, numbers: JSON.stringify(g.numbers), 
                amountPerNumber: g.amountPerNumber, totalAmount: g.numbers.length * g.amountPerNumber, 
                timestamp: new Date().toISOString() 
            };
            createBet(b); 
            created.push({ ...b, numbers: g.numbers });
        });
        result = created;
    });
    return result;
};

const updateGame = (id, data) => {
    if (!db) throw new Error("DB offline.");
    const allowed = ['name', 'drawTime'];
    const sets = [];
    const params = [];
    for (const key of allowed) {
        if (data[key] !== undefined) {
            sets.push(`${key} = ?`);
            params.push(data[key]);
        }
    }
    if (sets.length === 0) return findAccountById(id, 'games');
    params.push(id);
    db.prepare(`UPDATE games SET ${sets.join(', ')} WHERE id = ?`).run(...params);
    return findAccountById(id, 'games');
};

const updateGameDrawTime = (id, time) => {
    db.prepare('UPDATE games SET drawTime = ? WHERE id = ?').run(time, id);
    return findAccountById(id, 'games');
};

function getAllNumberLimits() {
    if (!db) return [];
    return db.prepare('SELECT * FROM number_limits').all();
}

function saveNumberLimit(limit) {
    const stmt = db.prepare('INSERT OR REPLACE INTO number_limits (gameType, numberValue, limitAmount) VALUES (?, ?, ?)');
    stmt.run(limit.gameType, limit.numberValue, limit.limitAmount);
    return db.prepare('SELECT * FROM number_limits WHERE gameType = ? AND numberValue = ?').get(limit.gameType, limit.numberValue);
}

function deleteNumberLimit(id) {
    db.prepare('DELETE FROM number_limits WHERE id = ?').run(id);
}

function resetAllGames() {
    try {
        runInTransaction(() => {
            db.prepare('UPDATE games SET winningNumber = NULL, payoutsApproved = 0').run();
            db.prepare('DELETE FROM bets').run(); 
        });
        console.log('[DB] Market reset for new daily window.');
    } catch (e) {
        console.error('[DB] Automatic reset failed:', e);
    }
}

module.exports = {
    connect, isSchemaValid, findAccountById, findAccountForLogin, updatePassword, getAllFromTable, runInTransaction, addLedgerEntry, createDealer, updateDealer, findUsersByDealerId, findUserByDealer, findBetsByUserId, createUser, updateUser, updateUserByAdmin, deleteUserByDealer, toggleAccountRestrictionByAdmin, toggleUserRestrictionByDealer, declareWinnerForGame, updateWinningNumber, approvePayoutsForGame, findBetsByDealerId, findBetsByGameId, toggleGameVisibility, getFinancialSummary, getNumberStakeSummary, placeBulkBets, updateGame, updateGameDrawTime, resetAllGames, getAllNumberLimits, saveNumberLimit, deleteNumberLimit
};
