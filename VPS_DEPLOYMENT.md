# VPS Deployment Guide

This guide will help you deploy the Payment Dashboard on your own VPS with a custom domain.

## Prerequisites

- A VPS with Ubuntu 20.04+ (or similar Linux distribution)
- Root or sudo access
- A domain name pointing to your VPS IP address
- SSH access to your VPS

## Step 1: Initial VPS Setup

### 1.1 Update System
```bash
sudo apt update && sudo apt upgrade -y
```

### 1.2 Install Node.js 18+
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
node --version  # Should show v18.x or higher
```

### 1.3 Install Nginx
```bash
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 1.4 Install PM2 (Process Manager)
```bash
sudo npm install -g pm2
```

### 1.5 Install Certbot (for SSL)
```bash
sudo apt install -y certbot python3-certbot-nginx
```

## Step 2: Clone and Setup Application

### 2.1 Clone Repository
```bash
cd /var/www
sudo git clone https://github.com/itsnavido/dashboard.git
sudo chown -R $USER:$USER /var/www/dashboard
cd dashboard
```

### 2.2 Setup Backend

```bash
cd backend
npm install

# Create .env file
nano .env
```

Add the following to `backend/.env`:
```env
# Google Sheets Configuration
GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
# OR use file path for local development
# GOOGLE_SHEETS_SERVICE_ACCOUNT_PATH=./service-account-key.json

GOOGLE_SHEETS_SPREADSHEET_ID=your-spreadsheet-id

# Discord OAuth Configuration
DISCORD_CLIENT_ID=your-discord-client-id
DISCORD_CLIENT_SECRET=your-discord-client-secret
DISCORD_CALLBACK_URL=https://yourdomain.com/api/auth/discord/callback

# Discord Webhook URL
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/your-webhook-url

# Session Secret (generate a random string)
SESSION_SECRET=your-random-session-secret-key-min-32-characters

# Frontend URL
FRONTEND_URL=https://yourdomain.com

# Node Environment
NODE_ENV=production
PORT=5000
```

### 2.3 Setup Frontend

```bash
cd ../frontend
npm install

# Create .env file
nano .env
```

Add the following to `frontend/.env`:
```env
VITE_API_URL=https://yourdomain.com
```

Build the frontend:
```bash
npm run build
```

## Step 3: Configure PM2

### 3.1 Start Backend with PM2

```bash
cd /var/www/dashboard/backend
pm2 start index.js --name "dashboard-backend"
pm2 save
pm2 startup  # Follow the instructions to enable PM2 on system boot
```

### 3.2 Verify Backend is Running

```bash
pm2 status
pm2 logs dashboard-backend
```

## Step 4: Configure Nginx

### 4.1 Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/dashboard
```

Add the following configuration:

```nginx
# Backend API
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Backend API proxy
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Frontend static files
    location / {
        root /var/www/dashboard/frontend/dist;
        try_files $uri $uri/ /index.html;
        index index.html;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

### 4.2 Enable Site

```bash
sudo ln -s /etc/nginx/sites-available/dashboard /etc/nginx/sites-enabled/
sudo nginx -t  # Test configuration
sudo systemctl reload nginx
```

## Step 5: Configure Domain DNS

### 5.1 DNS Configuration

In your domain registrar's DNS settings, add:

**Type A Record:**
- Name: `@` (or leave blank)
- Value: Your VPS IP address
- TTL: 3600 (or default)

**Type A Record (for www):**
- Name: `www`
- Value: Your VPS IP address
- TTL: 3600 (or default)

### 5.2 Verify DNS

Wait a few minutes, then verify:
```bash
ping yourdomain.com
# Should show your VPS IP
```

## Step 6: Setup SSL with Let's Encrypt

### 6.1 Obtain SSL Certificate

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Follow the prompts:
- Enter your email address
- Agree to terms
- Choose whether to redirect HTTP to HTTPS (recommended: Yes)

### 6.2 Auto-renewal

Certbot automatically sets up auto-renewal. Test it:
```bash
sudo certbot renew --dry-run
```

## Step 7: Update Environment Variables

### 7.1 Update Backend .env

After SSL is set up, update `backend/.env`:
```env
DISCORD_CALLBACK_URL=https://yourdomain.com/api/auth/discord/callback
FRONTEND_URL=https://yourdomain.com
```

### 7.2 Restart Backend

```bash
pm2 restart dashboard-backend
```

## Step 8: Update Discord OAuth Settings

1. Go to https://discord.com/developers/applications
2. Select your application
3. Go to OAuth2 → Redirects
4. Add: `https://yourdomain.com/api/auth/discord/callback`
5. Save changes

## Step 9: Firewall Configuration

### 9.1 Configure UFW (Ubuntu Firewall)

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

## Maintenance Commands

### View Logs
```bash
# Backend logs
pm2 logs dashboard-backend

# Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### Restart Services
```bash
# Restart backend
pm2 restart dashboard-backend

# Restart Nginx
sudo systemctl restart nginx
```

### Update Application
```bash
cd /var/www/dashboard
git pull origin main

# Backend
cd backend
npm install
pm2 restart dashboard-backend

# Frontend
cd ../frontend
npm install
npm run build
sudo systemctl reload nginx
```

## Troubleshooting

### Backend not starting
```bash
pm2 logs dashboard-backend
# Check for errors in logs
```

### Nginx 502 Bad Gateway
- Check if backend is running: `pm2 status`
- Check backend port: `sudo netstat -tlnp | grep 5000`
- Check Nginx error logs: `sudo tail -f /var/log/nginx/error.log`

### SSL Certificate Issues
```bash
sudo certbot certificates
sudo certbot renew
```

### Permission Issues
```bash
sudo chown -R $USER:$USER /var/www/dashboard
```

## Security Recommendations

1. **Keep system updated:**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Use strong passwords** for all services

3. **Enable fail2ban** to prevent brute force attacks:
   ```bash
   sudo apt install fail2ban
   sudo systemctl enable fail2ban
   ```

4. **Regular backups** of your application and database

5. **Monitor logs** regularly for suspicious activity

## Alternative: Using Docker (Optional)

If you prefer Docker, you can containerize the application. This requires additional setup with Docker and Docker Compose.

## Port Configuration

- **Backend**: Runs on port 5000 (internal, not exposed)
- **Nginx**: Listens on ports 80 (HTTP) and 443 (HTTPS)
- **Frontend**: Served as static files through Nginx

## Notes

- Replace `yourdomain.com` with your actual domain name throughout this guide
- The backend runs on port 5000 internally and is proxied through Nginx
- Frontend is built and served as static files
- PM2 keeps the backend running and restarts it if it crashes
- SSL certificates auto-renew every 90 days via Certbot

