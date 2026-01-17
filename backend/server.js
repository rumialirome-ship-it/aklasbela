
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
app.use(helmet({
    contentSecurityPolicy: false, // Set to false to allow cross-origin assets if needed for dev
}));

// 2. Rate Limiting (Prevent Brute Force) - Relaxed slightly for development/reliability
const apiLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 500, // 500 requests per 5 mins
    message: { message: 'Network busy. Please slow down.' }
});

const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50, // 50 login attempts per hour
    message: { message: 'Too many login attempts. Contact support.' }
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
    console.error('FATAL ERROR: JWT_SECRET is not defined in the .env file.');
    console.error('SERVER STOPPED: Create a .env file with JWT_SECRET=your_random_secret');
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
    console.log(`[Scheduler] Next game reset scheduled for ${resetTime.toISOString()}`);
    
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
    try {
        const games = database.getAllFromTable('games');
        res.json(games);
    } catch (err) {
        console.error('[API] Failed to fetch games:', err);
        res.status(500).json({ message: "Database read error" });
    }
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

const startServer = () => {
  try {
    database.connect();
    database.verifySchema();
    scheduleNextGameReset();
    const PORT = process.env.PORT || 3005;
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`\n============================================`);
        console.log(`🚀 A-Baba Exchange API running on port ${PORT}`);
        console.log(`🔗 Health Check: http://localhost:${PORT}/api/health`);
        console.log(`============================================\n`);
    });
  } catch (err) {
    console.error('[SERVER] Critical failure during startup:', err);
    process.exit(1);
  }
};
startServer();
