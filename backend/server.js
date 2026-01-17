
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

// 1. Security Headers (Helmet)
app.use(helmet());

// 2. Rate Limiting (Prevent Brute Force)
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per window
    message: { message: 'Too many requests from this IP, please try again later.' }
});

const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Limit login attempts to 10 per hour
    message: { message: 'Too many login attempts, please try again in an hour.' }
});

app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);

app.use(cors());
app.use(express.json());

// --- HEALTH CHECK ---
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString(), branding: 'A-Baba Exchange' });
});

// --- STRICT ENV VALIDATION ---
const JWT_SECRET = process.env.JWT_SECRET;
const API_KEY = process.env.API_KEY;

if (!JWT_SECRET) {
    console.error('FATAL ERROR: JWT_SECRET is not defined. The server will not start for security reasons.');
    process.exit(1);
}

// --- AUTOMATIC GAME RESET SCHEDULER ---
const PKT_OFFSET_HOURS = 5;
const RESET_HOUR_PKT = 16; // 4:00 PM PKT

function scheduleNextGameReset() {
    const now = new Date();
    const resetHourUTC = RESET_HOUR_PKT - PKT_OFFSET_HOURS;
    let resetTime = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), resetHourUTC, 0, 5, 0));
    if (now >= resetTime) {
        resetTime.setUTCDate(resetTime.getUTCDate() + 1);
    }
    const delay = resetTime.getTime() - now.getTime();
    setTimeout(() => {
        try { database.resetAllGames(); } catch (e) { console.error('[Scheduler] Reset error:', e); }
        scheduleNextGameReset();
    }, delay);
}

// --- AUTHENTICATION ROUTES ---
app.post('/api/auth/login', (req, res) => {
    const { loginId, password } = req.body;
    const { account, role } = database.findAccountForLogin(loginId);
    if (account && account.password === password) {
        const fullAccount = database.findAccountById(account.id, role.toLowerCase() + 's');
        const token = jwt.sign({ id: account.id, role }, JWT_SECRET, { expiresIn: '1d' });
        return res.json({ token, role, account: fullAccount });
    }
    res.status(401).json({ message: 'Invalid Account ID or Password.' });
});

app.get('/api/auth/verify', authMiddleware, (req, res) => {
    const role = req.user.role;
    const table = role.toLowerCase() + 's';
    const account = database.findAccountById(req.user.id, table);
    if (!account) return res.status(404).json({ message: 'Account not found.' });
    
    let extra = {};
    if (role === 'DEALER') {
        extra.users = database.findUsersByDealerId(req.user.id);
        extra.bets = database.findBetsByDealerId(req.user.id);
    } else if (role === 'USER') {
        extra.bets = database.findBetsByUserId(req.user.id);
    } else if (role === 'ADMIN') {
        extra.dealers = database.getAllFromTable('dealers', true);
        extra.users = database.getAllFromTable('users', true);
        extra.bets = database.getAllFromTable('bets');
    }
    res.json({ account, role, ...extra });
});

app.get('/api/games', (req, res) => {
    res.json(database.getAllFromTable('games'));
});

app.post('/api/user/ai-lucky-pick', authMiddleware, async (req, res) => {
    const { gameType, count = 5 } = req.body;
    if (!API_KEY) return res.status(503).json({ message: "AI services unavailable." });
    try {
        const ai = new GoogleGenAI({ apiKey: API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Generate ${count} unique lucky numbers for a "${gameType}" game. Return only numbers separated by commas.`,
            config: { temperature: 0.9 }
        });
        res.json({ luckyNumbers: response.text.replace(/\s+/g, '') });
    } catch (error) {
        res.status(500).json({ message: "Oracle is silent." });
    }
});

app.get('/api/user/data', authMiddleware, (req, res) => {
    if (req.user.role !== 'USER') return res.sendStatus(403);
    res.json({ 
        account: database.findAccountById(req.user.id, 'users'),
        games: database.getAllFromTable('games'), 
        bets: database.findBetsByUserId(req.user.id) 
    });
});

app.get('/api/dealer/data', authMiddleware, (req, res) => {
    if (req.user.role !== 'DEALER') return res.sendStatus(403);
    res.json({ 
        account: database.findAccountById(req.user.id, 'dealers'),
        users: database.findUsersByDealerId(req.user.id), 
        bets: database.findBetsByDealerId(req.user.id) 
    });
});

app.get('/api/admin/data', authMiddleware, (req, res) => {
    if (req.user.role !== 'ADMIN') return res.sendStatus(403);
    res.json({
        account: database.findAccountById(req.user.id, 'admins'),
        dealers: database.getAllFromTable('dealers', true),
        users: database.getAllFromTable('users', true),
        games: database.getAllFromTable('games'),
        bets: database.getAllFromTable('bets')
    });
});

app.post('/api/user/bets', authMiddleware, (req, res) => {
    if (req.user.role !== 'USER') return res.sendStatus(403);
    try { res.status(201).json(database.placeBulkBets(req.user.id, req.body.gameId, req.body.betGroups, 'USER')); }
    catch (e) { res.status(e.status || 400).json({ message: e.message }); }
});

app.post('/api/dealer/bets/bulk', authMiddleware, (req, res) => {
    if (req.user.role !== 'DEALER') return res.sendStatus(403);
    try { res.status(201).json(database.placeBulkBets(req.body.userId, req.body.gameId, req.body.betGroups, 'DEALER')); }
    catch (e) { res.status(e.status || 400).json({ message: e.message }); }
});

const startServer = () => {
  try {
    database.connect();
    database.verifySchema();
    scheduleNextGameReset();
    const PORT = process.env.PORT || 3005;
    app.listen(PORT, () => console.log(`>>> A-Baba SECURE Server running on port ${PORT} <<<`));
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};
startServer();
