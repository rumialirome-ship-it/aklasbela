# A-Baba Exchange - Google Cloud Deployment Guide

Your project is located at: `~/aklasbela`

---

### **Step 1: The "500 Error" Quick Fix**
Run these exact commands to fix permissions and environment variables:

```bash
# 1. Enter project
cd ~/aklasbela/backend

# 2. Create .env if missing (important for JWT)
if [ ! -f .env ]; then
  echo "JWT_SECRET=$(openssl rand -base64 32)" > .env
  echo "API_KEY=YOUR_GEMINI_API_KEY" >> .env
  echo "PROCESSED: Created new .env file."
fi

# 3. Fix Permissions so Nginx and PM2 can work
sudo chown -R $USER:$USER ~/aklasbela
sudo chmod -R 755 ~/aklasbela

# 4. Restart the app
pm2 restart aklasbella || pm2 start server.js --name aklasbella
```

---

### **Step 2: Update Nginx Configuration**
Update your Nginx file to point to the correct folder:
`sudo nano /etc/nginx/sites-available/aklasbela-tv.com`

**Paste this updated config:**
```nginx
server {
    listen 80;
    server_name aklasbela-tv.com www.aklasbela-tv.com;
    
    # Updated to your actual project path
    root /home/rumialirome/aklasbela/dist;
    index index.html;

    location / {
        try_files $uri /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:3005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
**Reload Nginx:**
`sudo nginx -t && sudo systemctl restart nginx`

---

### **Step 3: Domain & IP**
1. **Static IP**: Ensure `34.60.137.61` is reserved in GCP console.
2. **DNS**: Point `aklasbela-tv.com` A Record to `34.60.137.61`.
3. **SSL**: `sudo certbot --nginx -d aklasbela-tv.com`
