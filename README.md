# A-Baba Exchange - Security & Deployment Guide

Follow these steps to secure **https://aklasbela-tv.com**.

---

### **Step 1: Install SSL (HTTPS)**
Run these commands in your VM to get a free certificate:
```bash
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx -y
sudo certbot --nginx -d aklasbela-tv.com -d www.aklasbela-tv.com
```
*Note: This will automatically update your Nginx configuration.*

---

### **Step 2: Hardened Nginx Config**
Ensure your `/etc/nginx/sites-available/aklasbela-tv.com` looks like this after Certbot runs:

```nginx
server {
    listen 80;
    server_name aklasbela-tv.com www.aklasbela-tv.com;
    return 301 https://$host$request_uri; # Force HTTPS
}

server {
    listen 443 ssl;
    server_name aklasbela-tv.com www.aklasbela-tv.com;

    # Certbot will add SSL paths here...
    
    # Hide Nginx Version
    server_tokens off;

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
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

### **Step 3: Server Protection**
1. **Firewall (GCP Console)**:
   - Allow `TCP:80` (HTTP)
   - Allow `TCP:443` (HTTPS)
   - Allow `TCP:22` (SSH - restrict to your IP if possible)
   - **DENY** all other ports (like 3005). Nginx acts as the only gateway.

2. **Environment Protection**:
   ```bash
   cd ~/aklasbela/backend
   npm install # Install new security packages
   pm2 restart aklasbella
   ```

3. **Database Security**:
   Ensure `~/aklasbela/backend/database.sqlite` is not readable by anyone except the app user.
   ```bash
   chmod 600 ~/aklasbela/backend/database.sqlite
   ```
