# A-Baba Exchange - Security & Deployment Guide

Follow these steps to secure and deploy **https://aklasbela-tv.com**.

---

### **How to Deploy alongside your Port 3001 Application**
Since you already have another application active on **Port 3001**, this application is pre-configured to run on **Port 3005** to prevent collisons. Both applications will run simultaneously without conflict.

---

### **Step-by-Step VPS Upload & Setup Process**

#### **1. Compile the Frontend Locally**
Before uploading, you must build the optimized frontend assets:
```bash
# In the root project folder
npm install
npm run build
```
This compilation creates a optimized static `/dist` folder in the root directory.

#### **2. Prepare the Deployment Bundle**
To keep files clean, you only need to upload the `/dist` folder and the `/backend` folder. You do NOT upload the root `node_modules` or development configs.
Your deployment structure on the VPS should look like this:
```text
/home/rumialirome/aklasbela/    <-- Main application folder
├── dist/                       <-- Frontend static build files (HTML/CSS/JS)
└── backend/                    <-- Backend server source files
    ├── package.json
    ├── server.js
    ├── database.js
    ├── authMiddleware.js
    ├── setup-database.js
    └── .env                    <-- Production environment file
```

#### **3. Upload Files to your VPS**
Run these upload commands from your local computer terminal (replace `vps-ip` with your system's actual IP address or terminal hostname):

```bash
# 1. Create directory structure on your VPS if it doesn't exist
ssh rumialirome@vps-ip "mkdir -p /home/rumialirome/aklasbela"

# 2. Upload the frontend distribution folder
scp -r ./dist rumialirome@vps-ip:/home/rumialirome/aklasbela/

# 3. Upload the backend folder (excluding node_modules or database files)
rsync -avz --exclude 'node_modules' --exclude 'database.sqlite' --exclude '*.log' ./backend rumialirome@vps-ip:/home/rumialirome/aklasbela/
```

#### **4. Setup and Package the Backend on the VPS**
SSH into your VPS and install dependencies inside the server directory:
```bash
# Connect to your VPS
ssh rumialirome@vps-ip

# Navigate to the backend folder
cd /home/rumialirome/aklasbela/backend

# Install node dependencies
npm install

# Build/initialize the SQLite Database Schema
npm run db:setup
```

#### **5. Create Environment File**
In the `/backend` folder on your VPS, create your custom environment file `.env`:
```env
PORT=3005
JWT_SECRET=use_a_custom_very_long_random_string_here
```
*Note: This port matches the proxy pass value in your Nginx configurations below.*

#### **6. Process Management with PM2**
Use PM2 to run the backend continuously in the background:
```bash
# Install PM2 globally if not already installed
sudo npm install -g pm2

# Start the application on the VPS
pm2 start server.js --name "aklasbela-tv"

# Ensure PM2 restarts your app if the VPS reboots
pm2 save
pm2 startup
```

---

### **Step 7: Install SSL (HTTPS)**
Run these commands in your VM to get a free certificate:
```bash
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx -y
sudo certbot --nginx -d aklasbela-tv.com -d www.aklasbela-tv.com
```
*Note: This will automatically update your Nginx configuration.*

---

### **Step 8: Hardened Nginx Config (Bulletproof Reverse Proxy)**
To prevent Nginx permission problems (usually caused by Nginx not being allowed to read files inside the `/home` directory of user `rumialirome`), the recommended and safest way is to configure Nginx as a **pure reverse proxy**. This delegates static file serving to your Node.js backend. 

Modify `/etc/nginx/sites-available/aklasbela-tv.com` to look exactly like this:

```nginx
server {
    listen 80;
    server_name aklasbela-tv.com www.aklasbela-tv.com;
    return 301 https://$host$request_uri; # Force HTTPS
}

server {
    listen 443 ssl;
    server_name aklasbela-tv.com www.aklasbela-tv.com;

    # Certbot will automatically insert SSL paths here...
    
    # Hide Nginx Version
    server_tokens off;

    # Forward all traffic directly to node backend running on Port 3005
    location / {
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

After editing, test and reload Nginx:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

### **Step 9: Server Protection**
1. **Firewall (GCP/VPS Firewall Rules)**:
   - Allow `TCP:80` (HTTP)
   - Allow `TCP:443` (HTTPS)
   - Allow `TCP:22` (SSH - restrict to your IP if possible)
   - **DENY** direct public access to port 3001 and port 3005. Nginx is the secure gateway.

2. **Database Security**:
   Ensure `~/aklasbela/backend/database.sqlite` is only readable/writable by the owner:
   ```bash
   chmod 600 /home/rumialirome/aklasbela/backend/database.sqlite
   ```

