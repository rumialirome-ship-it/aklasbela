
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const authMiddleware = require('./authMiddleware');
const { GoogleGenAI } = require('@google/genai');
const database = require('./database');
const { v4: uuidv4 } = require('uuid');

const app = express();

// --- MAINTENANCE & WARNING CHECK ---
let systemError = null;
let systemWarning = null;

// 1. Security Headers
app.use(helmet({
    contentSecurityPolicy: false, 
}));

// 2. Rate Limiting
const apiLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, 
    max: 5000, 
    message: { message: 'Network busy. Please slow down.' }
});

app.use('/api/', apiLimiter);
app.use(cors());
app.use(express.json());

if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = "dev_secret_key_aklasbela_tv_2024";
    systemWarning = "Security Warning: Using default JWT secret.";
}
const JWT_SECRET = process.env.JWT_SECRET;
const API_KEY = process.env.API_KEY;

// Database Connection
const dbConnected = database.connect();
if (!dbConnected) {
    systemError = "Failed to connect to SQLite database.";
} else if (!database.isSchemaValid()) {
    systemError = "Database schema not found. Run setup.";
}

// Maintenance Middleware
app.use((req, res, next) => {
    if (systemError && req.path.startsWith('/api/')) {
        if (req.path === '/api/health' || req.path === '/api/games') return next();
        return res.status(503).json({ message: systemError, maintenance: true });
    }
    next();
});

// --- AUTHENTICATION ---
app.post('/api/auth/login', (req, res) => {
    const { loginId, password } = req.body;
    try {
        const { account, role } = database.findAccountForLogin(loginId);
        if (account && account.password === password) {
            const token = jwt.sign({ id: account.id, role }, JWT_SECRET, { expiresIn: '1d' });
            return res.json({ token, role, account });
        }
        res.status(401).json({ message: 'Invalid credentials.' });
    } catch (err) {
        res.status(500).json({ message: 'Login error.' });
    }
});

app.get('/api/auth/verify', authMiddleware, (req, res) => {
    const role = req.user.role;
    const table = role.toLowerCase() + 's';
    const account = database.findAccountById(req.user.id, table);
    if (!account) return res.status(404).json({ message: 'Account not found.' });
    res.json({ account, role });
});

// --- PUBLIC DATA ---
app.get('/api/games', (req, res) => {
    // Check if the request is from an admin (using a soft check or just filtering by default)
    // For simplicity, we'll return all games if the requester is verified as admin via token,
    // otherwise we filter.
    const authHeader = req.headers.authorization;
    let isAdmin = false;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, JWT_SECRET);
            if (decoded.role === 'ADMIN') isAdmin = true;
        } catch (e) {}
    }

    const allGames = database.getAllFromTable('games');
    if (isAdmin) {
        res.json(allGames);
    } else {
        res.json(allGames.filter(g => g.isVisible));
    }
});

// --- PRIVATE DATA FEEDS ---
app.get('/api/admin/data', authMiddleware, (req, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).end();
    res.json({
        account: database.findAccountById(req.user.id, 'admins'),
        dealers: database.getAllFromTable('dealers', true),
        users: database.getAllFromTable('users', true),
        bets: database.getAllFromTable('bets')
    });
});

app.get('/api/dealer/data', authMiddleware, (req, res) => {
    if (req.user.role !== 'DEALER') return res.status(403).end();
    res.json({
        account: database.findAccountById(req.user.id, 'dealers'),
        users: database.findUsersByDealerId(req.user.id),
        bets: database.findBetsByDealerId(req.user.id)
    });
});

app.get('/api/user/data', authMiddleware, (req, res) => {
    if (req.user.role !== 'USER') return res.status(403).end();
    res.json({
        account: database.findAccountById(req.user.id, 'users'),
        bets: database.findBetsByUserId(req.user.id)
    });
});

// --- ADMIN MANAGEMENT ---
app.post('/api/admin/dealers', authMiddleware, (req, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).end();
    try {
        const dealer = database.createDealer(req.body);
        res.status(201).json(dealer);
    } catch (e) { res.status(e.status || 500).json({ message: e.message }); }
});

app.put('/api/admin/dealers/:id', authMiddleware, (req, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).end();
    try {
        const dealer = database.updateDealer(req.body, req.params.id);
        res.json(dealer);
    } catch (e) { res.status(e.status || 500).json({ message: e.message }); }
});

app.post('/api/admin/topup/dealer', authMiddleware, (req, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).end();
    const { dealerId, amount } = req.body;
    try {
        database.runInTransaction(() => {
            database.addLedgerEntry(dealerId, 'DEALER', 'Admin Top-up', 0, amount);
            database.addLedgerEntry('Guru', 'ADMIN', `Top-up: ${dealerId}`, amount, 0);
        });
        res.json({ success: true });
    } catch (e) { res.status(400).json({ message: e.message }); }
});

app.post('/api/admin/withdraw/dealer', authMiddleware, (req, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).end();
    const { dealerId, amount } = req.body;
    try {
        database.runInTransaction(() => {
            database.addLedgerEntry(dealerId, 'DEALER', 'Admin Withdrawal', amount, 0);
            database.addLedgerEntry('Guru', 'ADMIN', `Withdrawal: ${dealerId}`, 0, amount);
        });
        res.json({ success: true });
    } catch (e) { res.status(400).json({ message: e.message }); }
});

app.get('/api/admin/summary', authMiddleware, (req, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).end();
    res.json(database.getFinancialSummary());
});

app.get('/api/admin/number-summary', authMiddleware, (req, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).end();
    res.json(database.getNumberStakeSummary(req.query));
});

app.post('/api/admin/games/:id/declare-winner', authMiddleware, (req, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).end();
    try {
        const game = database.declareWinnerForGame(req.params.id, req.body.winningNumber);
        res.json(game);
    } catch (e) { res.status(400).json({ message: e.message }); }
});

app.put('/api/admin/games/:id/update-winner', authMiddleware, (req, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).end();
    try {
        const game = database.updateWinningNumber(req.params.id, req.body.newWinningNumber);
        res.json(game);
    } catch (e) { res.status(400).json({ message: e.message }); }
});

app.put('/api/admin/games/:id/toggle-visibility', authMiddleware, (req, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).end();
    try {
        const game = database.toggleGameVisibility(req.params.id);
        res.json(game);
    } catch (e) { res.status(e.status || 500).json({ message: e.message }); }
});

app.post('/api/admin/games/:id/approve-payouts', authMiddleware, (req, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).end();
    try {
        const game = database.approvePayoutsForGame(req.params.id);
        res.json(game);
    } catch (e) { res.status(400).json({ message: e.message }); }
});

app.put('/api/admin/games/:id/draw-time', authMiddleware, (req, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).end();
    const game = database.updateGameDrawTime(req.params.id, req.body.newDrawTime);
    res.json(game);
});

// --- DEALER MANAGEMENT ---
app.post('/api/dealer/users', authMiddleware, (req, res) => {
    if (req.user.role !== 'DEALER') return res.status(403).end();
    try {
        const user = database.createUser(req.body.userData, req.user.id, req.body.initialDeposit);
        res.status(201).json(user);
    } catch (e) { res.status(e.status || 500).json({ message: e.message }); }
});

app.put('/api/dealer/users/:id', authMiddleware, (req, res) => {
    if (req.user.role !== 'DEALER') return res.status(403).end();
    try {
        const user = database.updateUser(req.body, req.params.id, req.user.id);
        res.json(user);
    } catch (e) { res.status(e.status || 500).json({ message: e.message }); }
});

app.delete('/api/dealer/users/:id', authMiddleware, (req, res) => {
    if (req.user.role !== 'DEALER') return res.status(403).end();
    try {
        database.deleteUserByDealer(req.params.id, req.user.id);
        res.json({ success: true });
    } catch (e) { res.status(e.status || 500).json({ message: e.message }); }
});

app.post('/api/dealer/topup/user', authMiddleware, (req, res) => {
    if (req.user.role !== 'DEALER') return res.status(403).end();
    const { userId, amount } = req.body;
    try {
        database.runInTransaction(() => {
            database.addLedgerEntry(userId, 'USER', 'Dealer Funding', 0, amount);
            database.addLedgerEntry(req.user.id, 'DEALER', `User Top-up: ${userId}`, amount, 0);
        });
        res.json({ success: true });
    } catch (e) { res.status(400).json({ message: e.message }); }
});

app.post('/api/dealer/withdraw/user', authMiddleware, (req, res) => {
    if (req.user.role !== 'DEALER') return res.status(403).end();
    const { userId, amount } = req.body;
    try {
        database.runInTransaction(() => {
            database.addLedgerEntry(userId, 'USER', 'Withdrawal to Dealer', amount, 0);
            database.addLedgerEntry(req.user.id, 'DEALER', `User Cash-out: ${userId}`, 0, amount);
        });
        res.json({ success: true });
    } catch (e) { res.status(400).json({ message: e.message }); }
});

// --- BETTING ---
app.post('/api/user/bets', authMiddleware, (req, res) => {
    try {
        const bets = database.placeBulkBets(req.user.id, req.body.gameId, req.body.betGroups);
        res.status(201).json(bets);
    } catch (e) { res.status(e.status || 500).json({ message: e.message }); }
});

app.post('/api/dealer/bets/bulk', authMiddleware, (req, res) => {
    if (req.user.role !== 'DEALER') return res.status(403).end();
    try {
        const bets = database.placeBulkBets(req.body.userId, req.body.gameId, req.body.betGroups, 'DEALER');
        res.status(201).json(bets);
    } catch (e) { res.status(e.status || 500).json({ message: e.message }); }
});

// --- UTILITIES ---
app.get('/api/health', (req, res) => {
    res.json({ status: systemError ? 'maintenance' : 'ok', error: systemError });
});

app.post('/api/user/ai-lucky-pick', authMiddleware, async (req, res) => {
    const { gameType, count = 5 } = req.body;
    if (!API_KEY) return res.status(503).json({ luckyNumbers: "11, 22, 33, 44, 55" });
    try {
        const ai = new GoogleGenAI({ apiKey: API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Generate ${count} unique lucky numbers for a "${gameType}" lottery. Output only numbers separated by commas.`,
        });
        res.json({ luckyNumbers: response.text.replace(/\s+/g, '') });
    } catch (error) {
        res.json({ luckyNumbers: "07, 18, 29, 42, 56" });
    }
});

const PORT = process.env.PORT || 3005;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server ready on port ${PORT}`);
});
