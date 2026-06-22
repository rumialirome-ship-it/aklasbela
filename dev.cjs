const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const backendDir = path.join(__dirname, 'backend');
const dbPath = path.join(backendDir, 'database.sqlite');

// 1. Initialize SQLite database if it doesn't exist
if (!fs.existsSync(dbPath)) {
    console.log('[DEV] database.sqlite not found. Running database initializer...');
    try {
        execSync('node setup-database.js', { cwd: backendDir, stdio: 'inherit' });
        console.log('[DEV] Database setup complete!');
    } catch (error) {
        console.error('[DEV] Failed to set up database:', error);
    }
} else {
    console.log('[DEV] Found existing database.sqlite.');
}

// Ensure JWT_SECRET environment variable is set for dev server to run without issues
process.env.JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_jwt_signature_key_aklasbela_tv';
process.env.PORT = process.env.PORT || '3005';

console.log('[DEV] Starting services...');

// 2. Spawn backend server 프로세스
const backendProcess = spawn('node', ['server.js'], {
    cwd: backendDir,
    stdio: 'inherit',
    env: { ...process.env }
});

backendProcess.on('error', (err) => {
    console.error('[DEV] Failed to start backend:', err);
});

// 3. Spawn frontend Vite server 프로세스
// Bound to port 3000 and hosted on 0.0.0.0 so that AI Studio reverse proxy can route traffic correctly
const frontendProcess = spawn('npx', ['vite', '--port', '3000', '--host', '0.0.0.0'], {
    cwd: __dirname,
    stdio: 'inherit',
    env: { ...process.env }
});

frontendProcess.on('error', (err) => {
    console.error('[DEV] Failed to start frontend (Vite):', err);
});

// Handle graceful shutdown
const shutdown = () => {
    console.log('[DEV] Stopping services...');
    backendProcess.kill();
    frontendProcess.kill();
    process.exit();
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
