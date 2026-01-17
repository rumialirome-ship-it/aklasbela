# A-Baba Exchange - Google Cloud Deployment Guide

Your project is located at: `~/aklasbela`

---

### **Step 1: The "Ultimate Fix" Command**
Run this **entire block** at once inside your terminal to fix the 500 error:

```bash
# 1. Fix Directory Permissions (Crucial for Nginx access to home)
sudo chmod +x /home/rumialirome
sudo chown -R $USER:$USER ~/aklasbela
sudo chmod -R 755 ~/aklasbela

# 2. Setup Environment & Database
cd ~/aklasbela/backend
if [ ! -f .env ]; then
  echo "JWT_SECRET=$(openssl rand -base64 32)" > .env
  echo "API_KEY=YOUR_GEMINI_API_KEY" >> .env
fi
npm install
npm run db:setup

# 3. Build Frontend & Start PM2
cd ~/aklasbela
npm install
npm run build
pm2 delete aklasbella || true
pm2 start backend/server.js --name aklasbella
pm2 save
```

---

### **Step 2: Correct Nginx Configuration**
The 500 error often happens if Nginx points to the wrong root.
Run: `sudo nano /etc/nginx/sites-available/aklasbela-tv.com`

**Paste this exact configuration:**
```nginx
server {
    listen 80;
    server_name aklasbela-tv.com www.aklasbela-tv.com;
    
    # Absolute path to your dist folder
    root /home/rumialirome/aklasbela/dist;
    index index.html;

    location / {
        try_files $uri /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
**Apply the config:**
```bash
sudo nginx -t && sudo systemctl restart nginx
```

---

### **Step 3: Verify the Fix**
1. **Test Frontend**: Visit `http://aklasbela-tv.com` (Should see landing page).
2. **Test Backend**: Visit `http://aklasbela-tv.com/api/health` (Should see {"status":"ok"}).
3. **Check Logs**: If still failing, run `pm2 logs aklasbella`.
