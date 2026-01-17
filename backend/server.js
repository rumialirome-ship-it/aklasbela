
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

// 1. Security Headers (Helmet)
app.use(helmet({
    contentSecurityPolicy: false, 
}));

// 2. Rate Limiting (Prevent Brute Force)
const apiLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, 
    max: 1000, 
    message: { message: 'Network busy. Please slow down.' }
});

const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, 
    max: 100, 
    message: { message: 'Too many login attempts. Contact support.' }
});

app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);

app.use(cors());
app.use(express.json());

// --- STRICT ENV VALIDATION ---
let JWT_SECRET = process.env.JWT_SECRET;
const API_KEY = process.env.API_KEY;

if (!JWT_SECRET) {
    // FALLBACK for boot-up only (PREVENTS 503)
    JWT_SECRET = "dev_secret_key_a_baba_exchange_2024";
    systemWarning = "Security Warning: Using default JWT secret. Setup required in .env.";
    console.warn(`[WARNING] ${systemWarning}`);
}

// --- DATABASE SETUP ---
const dbConnected = database.connect();
if (!dbConnected) {
    systemError = "Failed to connect to SQLite database. Check folder permissions.";
    console.error(`[CRITICAL] ${systemError}`);
} else if (!database.isSchemaValid()) {
    systemError = "Database schema not found. Run 'npm run db:setup' in the backend folder.";
    console.error(`[CRITICAL] ${systemError}`);
}

// --- MAINTENANCE MIDDLEWARE ---
app.use((req, res, next) => {
    // Only block on systemError (Database issues)
    if (systemError && req.path.startsWith('/api/')) {
        // Allow health check even in maintenance
        if (req.path === '/api/health') return next();
        return res.status(503).json({ message: systemError, maintenance: true });
    }
    next();
});

// --- HEALTH CHECK ---
app.get('/api/health', (req, res) => {
    res.json({ 
        status: systemError ? 'maintenance' : (systemWarning ? 'warning' : 'ok'), 
        error: systemError, 
        warning: systemWarning,
        branding: 'A-Baba Exchange' 
    });
});

// --- AUTOMATIC GAME RESET SCHEDULER ---
const PKT_OFFSET_HOURS = 5;
const RESET_HOUR_PKT = 16; 

function scheduleNextGameReset() {
    if (systemError && systemError.includes("Database")) return;
    const now = new Date();
    const resetHourUTC = RESET_HOUR_PKT - PKT_OFFSET_HOURS;
    let resetTime = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), resetHourUTC, 0, 5, 0));
    if (now >= resetTime) {
        resetTime.setUTCDate(resetTime.getUTCDate() + 1);
    }
    const delay = resetTime.getTime() - now.getTime();
    console.log(`[Scheduler] Next reset: ${resetTime.toISOString()}`);
    
    setTimeout(() => {
        try { database.resetAllGames(); } catch (e) { console.error('[Scheduler] Error:', e); }
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
    if (systemError && systemError.includes("Database")) {
        return res.status(503).json({ message: systemError, maintenance: true });
    }
    const games = database.getAllFromTable('games');
    res.json(games);
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

const PORT = process.env.PORT || 3005;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n============================================`);
    console.log(`🚀 A-Baba Exchange API running on port ${PORT}`);
    if (systemError) console.log(`⚠️ SYSTEM IN MAINTENANCE: ${systemError}`);
    if (systemWarning) console.log(`⚠️ SYSTEM WARNING: ${systemWarning}`);
    console.log(`============================================\n`);
    scheduleNextGameReset();
});
