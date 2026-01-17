# Aklasbela.tv - Google Cloud (GCP) Deployment & Domain Guide

This guide ensures your application is live on **https://aklasbela-tv.com**.

---

### **Step 1: Reserve a Static IP (Run in [CLOUD SHELL])**
```bash
gcloud compute addresses create aklasbela-static-ip --addresses 34.60.137.61 --region us-central1
```

### **Step 2: Point your Domain (DNS Settings)**
- **A Record**: Host `@` -> Value `34.60.137.61`
- **CNAME Record**: Host `www` -> Value `aklasbela-tv.com`

---

### **Step 3: Setup the VM (Run in [CLOUD SHELL])**
```bash
gcloud compute ssh aklasbela-vm --zone=us-central1-a
```

---

### **Step 4: Troubleshooting 500 Internal Server Error**
If you see a **500 Error**, it is likely because the backend is not running or permissions are wrong. Run these commands **[INSIDE VM]**:

1. **Check if the Backend is actually running**:
   ```bash
   pm2 status
   ```
   If it says `errored` or `stopped`, check the logs:
   ```bash
   pm2 logs aklasbella
   ```

2. **Fix Missing .env File**:
   The app will crash without a Secret Key. Create it:
   ```bash
   cd /var/www/html/aklasbela-tv/backend
   echo "JWT_SECRET=$(openssl rand -base64 32)" > .env
   echo "API_KEY=YOUR_GEMINI_API_KEY_HERE" >> .env
   pm2 restart aklasbella
   ```

3. **Fix Directory Permissions**:
   Nginx needs permission to read your files:
   ```bash
   sudo chown -R www-data:www-data /var/www/html/aklasbela-tv
   sudo chmod -R 755 /var/www/html/aklasbela-tv
   ```

4. **Initialize Database**:
   If you haven't run the setup yet:
   ```bash
   cd /var/www/html/aklasbela-tv/backend
   npm run db:setup
   pm2 restart aklasbella
   ```

---

### **Step 5: Full Deployment (Run [INSIDE VM])**
```bash
# Install Software
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs nginx sqlite3 certbot python3-certbot-nginx
sudo npm install -g pm2

# Deploy Code
cd /var/www/html
sudo git clone YOUR_REPO_URL aklasbela-tv
cd aklasbela-tv
npm install && npm run build
cd backend && npm install && npm run db:setup

# Start Process
pm2 start server.js --name aklasbella
pm2 save && pm2 startup
```
