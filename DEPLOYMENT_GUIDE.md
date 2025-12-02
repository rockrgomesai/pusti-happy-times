# MERN Application Deployment Guide - Ubuntu 24.04 VPS (Contabo)

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial VPS Setup](#initial-vps-setup)
3. [Install Required Software](#install-required-software)
4. [MongoDB Setup](#mongodb-setup)
5. [Application Deployment](#application-deployment)
6. [Nginx Configuration](#nginx-configuration)
7. [SSL Certificate Setup](#ssl-certificate-setup)
8. [Process Management with PM2](#process-management-with-pm2)
9. [Firewall Configuration](#firewall-configuration)
10. [Automated Deployment Script](#automated-deployment-script)
11. [Monitoring & Maintenance](#monitoring--maintenance)
12. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### What You Need

- Contabo VPS with Ubuntu 24.04
- Domain name pointed to your VPS IP (optional but recommended)
- SSH access to your VPS
- Git repository URL for your application
- Local terminal/SSH client

### Recommended VPS Specs

- **Minimum:** 2 CPU cores, 4GB RAM, 50GB SSD
- **Recommended:** 4 CPU cores, 8GB RAM, 100GB SSD

---

## Initial VPS Setup

### 1. Connect to Your VPS

```bash
ssh root@your_vps_ip
```

### 2. Update System Packages

```bash
# Update package list
apt update

# Upgrade installed packages
apt upgrade -y

# Install essential tools
apt install -y curl wget git build-essential software-properties-common
```

### 3. Create a Non-Root User (Security Best Practice)

```bash
# Create new user
adduser deployer

# Add user to sudo group
usermod -aG sudo deployer

# Switch to new user
su - deployer
```

### 4. Setup SSH Key Authentication (Optional but Recommended)

```bash
# On your local machine, generate SSH key if you don't have one
ssh-keygen -t ed25519 -C "your_email@example.com"

# Copy public key to VPS
ssh-copy-id deployer@your_vps_ip

# Test SSH login
ssh deployer@your_vps_ip
```

### 5. Configure SSH for Security

```bash
# Edit SSH config (as root or with sudo)
sudo nano /etc/ssh/sshd_config

# Make these changes:
# PermitRootLogin no
# PasswordAuthentication no  # Only if you setup SSH keys
# Port 2222  # Change default SSH port (optional)

# Restart SSH service
sudo systemctl restart sshd
```

---

## Install Required Software

### 1. Install Node.js 20.x (LTS)

```bash
# Install Node.js repository
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Install Node.js and npm
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x
```

### 2. Install MongoDB 7.0

```bash
# Import MongoDB public GPG key
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
   sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

# Create list file for MongoDB
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
   sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Update package database
sudo apt update

# Install MongoDB
sudo apt install -y mongodb-org

# Start and enable MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Verify MongoDB is running
sudo systemctl status mongod
```

### 3. Install Nginx

```bash
# Install Nginx
sudo apt install -y nginx

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Verify Nginx is running
sudo systemctl status nginx
```

### 4. Install PM2 (Process Manager)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Verify installation
pm2 --version
```

### 5. Install Certbot (for SSL)

```bash
# Install Certbot and Nginx plugin
sudo apt install -y certbot python3-certbot-nginx
```

---

## MongoDB Setup

### 1. Secure MongoDB Installation

```bash
# Connect to MongoDB shell
mongosh

# Switch to admin database
use admin

# Create admin user
db.createUser({
  user: "admin",
  pwd: "Amr@K0rboJOY",
  roles: [
    { role: "userAdminAnyDatabase", db: "admin" },
    { role: "readWriteAnyDatabase", db: "admin" },
    { role: "dbAdminAnyDatabase", db: "admin" }
  ]
})

# Exit MongoDB shell
exit
```

### 2. Enable MongoDB Authentication

```bash
# Edit MongoDB configuration
sudo nano /etc/mongod.conf

# Find and modify these sections:
# security:
#   authorization: enabled
#
# net:
#   port: 27017
#   bindIp: 127.0.0.1  # Only allow local connections

# Restart MongoDB
sudo systemctl restart mongod
```

### 3. Create Application Database and User

```bash
# Connect with admin credentials
mongosh -u admin -p --authenticationDatabase admin

# Create application database
use pusti_ht_db

# Create application user
db.createUser({
  user: "pusti_app",
  pwd: "PadMaM3ghnaJ",
  roles: [
    { role: "readWrite", db: "pusti_ht_db" }
  ]
})

# Verify user
db.getUsers()

# Exit
exit
```

### 4. Test MongoDB Connection

```bash
# Test connection with app user
# NOTE: If your password contains special characters like @, :, /, etc.
# you must URL-encode them. For example: @ becomes %40
mongosh "mongodb://pusti_app:YOUR_APP_PASSWORD_HERE@localhost:27017/pusti_ht_db?authSource=pusti_ht_db"

# Should connect successfully
exit
```

---

## Application Deployment

### 1. Clone Repository

```bash
# Navigate to home directory
cd ~

# Create applications directory
mkdir -p apps
cd apps

# Clone your repository
git clone https://github.com/rockrgomesai/pusti-happy-times.git
cd pusti-happy-times

# Verify files
ls -la
```

### 2. Setup Environment Variables

#### Backend Environment

```bash
# Create backend .env file
cd backend
nano .env
```

**Add the following content:**

```env
# Server Configuration
NODE_ENV=production
PORT=5000
HOST=0.0.0.0

# MongoDB Configuration
MONGODB_URI=mongodb://pusti_app:YOUR_APP_PASSWORD_HERE@localhost:27017/pusti_ht_db?authSource=pusti_ht_db

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_minimum_32_characters_long_random_string
JWT_EXPIRE=7d
JWT_COOKIE_EXPIRE=7

# CORS Configuration
FRONTEND_URL=https://yourdomain.com
ALLOWED_ORIGINS=https://yourdomain.com,http://localhost:3000

# Session Configuration
SESSION_SECRET=your_session_secret_key_minimum_32_characters_long

# File Upload Configuration
MAX_FILE_SIZE=5242880
FILE_UPLOAD_PATH=./public/uploads

# Email Configuration (if using email features)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
SMTP_FROM=noreply@yourdomain.com

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100

# Logging
LOG_LEVEL=info
```

#### Frontend Environment

```bash
# Create frontend .env file
cd ../frontend
nano .env.production
```

**Add the following content:**

```env
# API Configuration
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_API_BASE_URL=https://api.yourdomain.com/api

# Application Configuration
NEXT_PUBLIC_APP_NAME=Pusti Happy Times
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Feature Flags
NEXT_PUBLIC_ENABLE_PWA=true
NEXT_PUBLIC_ENABLE_ANALYTICS=false

# Environment
NODE_ENV=production
```

### 3. Install Dependencies

```bash
# Navigate to project root
cd ~/apps/pusti-happy-times

# Install backend dependencies
cd backend
npm ci --production

# Install frontend dependencies
cd ../frontend
npm ci --production

# Return to root
cd ..
```

### 4. Initialize Database with Seed Data

```bash
# Navigate to backend
cd backend

# Run seed scripts (adjust based on your scripts)
node create-roles.js
node create-users.js
node create-brands.js
node create-products.js
node add-distributor-permissions.js
node add-distributor-menu-items.js

# Any other initialization scripts you have
```

### 5. Build Frontend

```bash
# Navigate to frontend
cd ~/apps/pusti-happy-times/frontend

# Build Next.js application
npm run build

# Verify build
ls -la .next
```

---

## Nginx Configuration

### 1. Create Nginx Configuration for Backend API

```bash
# Create Nginx config file
sudo nano /etc/nginx/sites-available/pusti-api
```

**Add the following content:**

```nginx
# Backend API Configuration
server {
    listen 80;
    server_name api.yourdomain.com;  # Change to your API domain

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Rate limiting zone
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req zone=api_limit burst=20 nodelay;

    # Logging
    access_log /var/log/nginx/pusti-api-access.log;
    error_log /var/log/nginx/pusti-api-error.log;

    # Client body size limit (for file uploads)
    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static file serving for uploads
    location /uploads {
        alias /home/deployer/apps/pusti-happy-times/backend/public/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

### 2. Create Nginx Configuration for Frontend

```bash
# Create Nginx config file
sudo nano /etc/nginx/sites-available/pusti-frontend
```

**Add the following content:**

```nginx
# Frontend Configuration
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;  # Change to your domain

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Logging
    access_log /var/log/nginx/pusti-frontend-access.log;
    error_log /var/log/nginx/pusti-frontend-error.log;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 10240;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;
    gzip_disable "MSIE [1-6]\.";

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Next.js static files
    location /_next/static {
        proxy_pass http://localhost:3000;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Next.js images
    location /_next/image {
        proxy_pass http://localhost:3000;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Favicon
    location = /favicon.ico {
        proxy_pass http://localhost:3000;
        access_log off;
        log_not_found off;
    }
}
```

### 3. Enable Nginx Sites

```bash
# Create symbolic links to enable sites
sudo ln -s /etc/nginx/sites-available/pusti-api /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/pusti-frontend /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## SSL Certificate Setup

### 1. Obtain SSL Certificates with Let's Encrypt

```bash
# For API domain
sudo certbot --nginx -d api.yourdomain.com

# For frontend domain
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Follow the prompts:
# - Enter email address
# - Agree to terms of service
# - Choose to redirect HTTP to HTTPS (recommended)
```

### 2. Auto-Renewal Setup

```bash
# Test auto-renewal
sudo certbot renew --dry-run

# Certbot automatically sets up a cron job for renewal
# Verify cron job
sudo systemctl status certbot.timer
```

### 3. Setup Auto-Renewal Hook (Reload Nginx after renewal)

```bash
# Create renewal hook
sudo nano /etc/letsencrypt/renewal-hooks/post/reload-nginx.sh
```

**Add the following:**

```bash
#!/bin/bash
systemctl reload nginx
```

**Make it executable:**

```bash
sudo chmod +x /etc/letsencrypt/renewal-hooks/post/reload-nginx.sh
```

---

## Process Management with PM2

### 1. Create PM2 Ecosystem File

```bash
# Navigate to project root
cd ~/apps/pusti-happy-times

# Create ecosystem file
nano ecosystem.config.js
```

**Add the following content:**

```javascript
module.exports = {
  apps: [
    {
      name: "pusti-backend",
      cwd: "./backend",
      script: "./src/server.js",
      instances: 2, // Run 2 instances (cluster mode)
      exec_mode: "cluster",
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 5000,
      },
      error_file: "./logs/backend-error.log",
      out_file: "./logs/backend-out.log",
      log_file: "./logs/backend-combined.log",
      time: true,
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    },
    {
      name: "pusti-frontend",
      cwd: "./frontend",
      script: "npm",
      args: "start",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      error_file: "./logs/frontend-error.log",
      out_file: "./logs/frontend-out.log",
      log_file: "./logs/frontend-combined.log",
      time: true,
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    },
  ],
};
```

### 2. Create Logs Directory

```bash
# Create logs directories
mkdir -p ~/apps/pusti-happy-times/backend/logs
mkdir -p ~/apps/pusti-happy-times/frontend/logs
```

### 3. Start Applications with PM2

```bash
# Navigate to project root
cd ~/apps/pusti-happy-times

# Start applications
pm2 start ecosystem.config.js

# Save PM2 process list
pm2 save

# Setup PM2 to start on system boot
pm2 startup systemd

# Copy and run the command that PM2 outputs
# It will look something like:
# sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u deployer --hp /home/deployer
```

### 4. PM2 Useful Commands

```bash
# View running processes
pm2 list

# View logs
pm2 logs

# View logs for specific app
pm2 logs pusti-backend
pm2 logs pusti-frontend

# Monitor resources
pm2 monit

# Restart applications
pm2 restart all
pm2 restart pusti-backend
pm2 restart pusti-frontend

# Stop applications
pm2 stop all
pm2 stop pusti-backend

# Delete applications from PM2
pm2 delete all
pm2 delete pusti-backend

# Reload (zero-downtime restart)
pm2 reload all
```

---

## Firewall Configuration

### 1. Setup UFW (Uncomplicated Firewall)

```bash
# Install UFW if not already installed
sudo apt install -y ufw

# Allow SSH (IMPORTANT: Do this first!)
sudo ufw allow 2222/tcp  # If you changed SSH port
# OR
sudo ufw allow 22/tcp    # Default SSH port

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Deny direct access to Node.js ports
sudo ufw deny 3000/tcp
sudo ufw deny 5000/tcp

# Enable firewall
sudo ufw enable

# Check firewall status
sudo ufw status verbose
```

### 2. Additional Security Rules

```bash
# Rate limiting for SSH
sudo ufw limit 22/tcp

# Allow specific IP for MongoDB (if accessing remotely)
# sudo ufw allow from YOUR_IP_ADDRESS to any port 27017

# Deny all other incoming traffic by default
sudo ufw default deny incoming
sudo ufw default allow outgoing
```

---

## Automated Deployment Script

### Create a deployment script for easy updates

```bash
# Create deployment script
nano ~/deploy.sh
```

**Add the following content:**

```bash
#!/bin/bash

# Pusti Happy Times Deployment Script
# Usage: ./deploy.sh [branch-name]

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="$HOME/apps/pusti-happy-times"
BRANCH="${1:-main}"

echo -e "${GREEN}=== Pusti Happy Times Deployment ===${NC}"
echo -e "Branch: ${YELLOW}$BRANCH${NC}"
echo -e "App Directory: ${YELLOW}$APP_DIR${NC}"
echo ""

# Navigate to app directory
cd "$APP_DIR" || exit 1

# Backup current version
echo -e "${YELLOW}Creating backup...${NC}"
BACKUP_DIR="$HOME/backups/pusti-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$HOME/backups"
cp -r "$APP_DIR" "$BACKUP_DIR"
echo -e "${GREEN}✓ Backup created at: $BACKUP_DIR${NC}"

# Pull latest code
echo -e "${YELLOW}Pulling latest code from Git...${NC}"
git fetch origin
git checkout "$BRANCH"
git pull origin "$BRANCH"
echo -e "${GREEN}✓ Code updated${NC}"

# Install/update backend dependencies
echo -e "${YELLOW}Installing backend dependencies...${NC}"
cd backend
npm ci --production
echo -e "${GREEN}✓ Backend dependencies installed${NC}"

# Install/update frontend dependencies
echo -e "${YELLOW}Installing frontend dependencies...${NC}"
cd ../frontend
npm ci --production
echo -e "${GREEN}✓ Frontend dependencies installed${NC}"

# Build frontend
echo -e "${YELLOW}Building frontend...${NC}"
npm run build
echo -e "${GREEN}✓ Frontend built${NC}"

# Run database migrations/seeds if needed
# cd ../backend
# node migrations.js  # If you have migrations

# Restart applications
echo -e "${YELLOW}Restarting applications...${NC}"
pm2 restart pusti-backend
pm2 restart pusti-frontend
echo -e "${GREEN}✓ Applications restarted${NC}"

# Health check
echo -e "${YELLOW}Performing health check...${NC}"
sleep 5

if curl -f http://localhost:5000/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend is healthy${NC}"
else
    echo -e "${RED}✗ Backend health check failed${NC}"
    echo -e "${YELLOW}Rolling back...${NC}"
    rm -rf "$APP_DIR"
    cp -r "$BACKUP_DIR" "$APP_DIR"
    pm2 restart all
    echo -e "${RED}Deployment failed! Rolled back to previous version.${NC}"
    exit 1
fi

if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Frontend is healthy${NC}"
else
    echo -e "${RED}✗ Frontend health check failed${NC}"
fi

# Show PM2 status
echo -e "\n${GREEN}=== PM2 Status ===${NC}"
pm2 list

echo -e "\n${GREEN}=== Deployment Complete! ===${NC}"
echo -e "Backup location: ${YELLOW}$BACKUP_DIR${NC}"
```

**Make it executable:**

```bash
chmod +x ~/deploy.sh
```

**Usage:**

```bash
# Deploy main branch
./deploy.sh

# Deploy specific branch
./deploy.sh develop
```

---

## Monitoring & Maintenance

### 1. Setup Log Rotation

```bash
# Create logrotate config
sudo nano /etc/logrotate.d/pusti-app
```

**Add the following:**

```
/home/deployer/apps/pusti-happy-times/backend/logs/*.log
/home/deployer/apps/pusti-happy-times/frontend/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 deployer deployer
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
```

### 2. MongoDB Backup Script

```bash
# Create backup script
nano ~/backup-mongodb.sh
```

**Add the following:**

```bash
#!/bin/bash

# MongoDB Backup Script

BACKUP_DIR="$HOME/backups/mongodb"
DATE=$(date +%Y%m%d-%H%M%S)
DB_NAME="pusti_ht_db"
DB_USER="pusti_app"
DB_PASS="YOUR_APP_PASSWORD_HERE"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Dump database
mongodump \
    --uri="mongodb://$DB_USER:$DB_PASS@localhost:27017/$DB_NAME?authSource=$DB_NAME" \
    --out="$BACKUP_DIR/$DATE"

# Compress backup
cd "$BACKUP_DIR"
tar -czf "$DATE.tar.gz" "$DATE"
rm -rf "$DATE"

# Keep only last 7 days of backups
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR/$DATE.tar.gz"
```

**Make it executable and schedule:**

```bash
chmod +x ~/backup-mongodb.sh

# Add to crontab (daily at 2 AM)
crontab -e

# Add this line:
0 2 * * * /home/deployer/backup-mongodb.sh >> /home/deployer/logs/backup.log 2>&1
```

### 3. System Monitoring

```bash
# Install htop for better process monitoring
sudo apt install -y htop

# Install netdata for comprehensive monitoring
bash <(curl -Ss https://my-netdata.io/kickstart.sh)

# Access Netdata dashboard at: http://your_vps_ip:19999
```

### 4. Setup Alerts (Optional)

```bash
# Install and configure fail2ban
sudo apt install -y fail2ban

# Create local config
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
sudo nano /etc/fail2ban/jail.local

# Enable SSH protection
# [sshd]
# enabled = true
# port = 22
# logpath = /var/log/auth.log
# maxretry = 5
# bantime = 3600

# Restart fail2ban
sudo systemctl restart fail2ban
```

---

## Troubleshooting

### Common Issues and Solutions

#### 1. Application Not Starting

```bash
# Check PM2 logs
pm2 logs pusti-backend --lines 100
pm2 logs pusti-frontend --lines 100

# Check if ports are in use
sudo lsof -i :5000
sudo lsof -i :3000

# Restart applications
pm2 restart all
```

#### 2. MongoDB Connection Issues

```bash
# Check MongoDB status
sudo systemctl status mongod

# Check MongoDB logs
sudo tail -f /var/log/mongodb/mongod.log

# Test connection
mongosh "mongodb://pusti_app:PASSWORD@localhost:27017/pusti_ht_db?authSource=pusti_ht_db"

# Restart MongoDB
sudo systemctl restart mongod
```

#### 3. Nginx Issues

```bash
# Check Nginx status
sudo systemctl status nginx

# Test Nginx configuration
sudo nginx -t

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Restart Nginx
sudo systemctl restart nginx
```

#### 4. SSL Certificate Issues

```bash
# Check certificate status
sudo certbot certificates

# Renew certificates manually
sudo certbot renew

# Check certificate expiry
echo | openssl s_client -servername yourdomain.com -connect yourdomain.com:443 2>/dev/null | openssl x509 -noout -dates
```

#### 5. High Memory Usage

```bash
# Check memory usage
free -h
htop

# Restart PM2 apps
pm2 restart all

# Clear system cache
sudo sync && sudo sysctl -w vm.drop_caches=3
```

#### 6. Database Full

```bash
# Check disk space
df -h

# Check MongoDB database size
mongosh --eval "db.stats()"

# Clean up old backups
rm -rf ~/backups/mongodb/*

# Clean up old logs
pm2 flush
```

### Health Check Endpoints

Add these to your backend for monitoring:

```javascript
// backend/src/routes/health.js
router.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  });
});

router.get("/health/db", async (req, res) => {
  try {
    await mongoose.connection.db.admin().ping();
    res.status(200).json({ status: "ok", database: "connected" });
  } catch (error) {
    res.status(503).json({ status: "error", database: "disconnected" });
  }
});
```

---

## Performance Optimization

### 1. Enable Node.js Production Mode

Already set via `NODE_ENV=production` in .env files.

### 2. Enable Nginx Caching

```bash
sudo nano /etc/nginx/sites-available/pusti-frontend
```

Add caching configuration:

```nginx
# Add to http block in /etc/nginx/nginx.conf
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m max_size=1g inactive=60m use_temp_path=off;

# Then in your location block:
location / {
    proxy_cache my_cache;
    proxy_cache_valid 200 60m;
    proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
    proxy_cache_bypass $http_cache_control;
    add_header X-Cache-Status $upstream_cache_status;

    # ... rest of proxy settings
}
```

### 3. MongoDB Indexing

```javascript
// Create indexes for better query performance
// Run these in mongosh
use pusti_ht_db

db.users.createIndex({ email: 1 }, { unique: true })
db.users.createIndex({ "roles.role": 1 })
db.products.createIndex({ sku: 1 }, { unique: true })
db.distributor_stocks.createIndex({ distributor_id: 1, sku: 1 }, { unique: true })
// Add more indexes based on your queries
```

---

## Security Checklist

- [ ] Changed default SSH port
- [ ] Disabled root login
- [ ] Setup SSH key authentication
- [ ] Configured UFW firewall
- [ ] Enabled MongoDB authentication
- [ ] Setup fail2ban
- [ ] SSL certificates installed
- [ ] Strong passwords for all users
- [ ] Environment variables secured
- [ ] Regular backups configured
- [ ] Log rotation setup
- [ ] PM2 process monitoring enabled
- [ ] Nginx security headers configured
- [ ] Rate limiting enabled
- [ ] CORS properly configured

---

## Quick Reference Commands

```bash
# Application Management
pm2 list                          # List all processes
pm2 restart all                   # Restart all apps
pm2 logs                          # View logs
pm2 monit                         # Monitor resources

# Nginx
sudo systemctl restart nginx      # Restart Nginx
sudo nginx -t                     # Test config
sudo tail -f /var/log/nginx/error.log  # View error logs

# MongoDB
sudo systemctl restart mongod     # Restart MongoDB
mongosh                          # MongoDB shell

# System
htop                             # Process monitor
df -h                            # Disk space
free -h                          # Memory usage
sudo ufw status                  # Firewall status

# Deployment
cd ~/apps/pusti-happy-times && git pull && ./deploy.sh

# Backup
~/backup-mongodb.sh              # Run MongoDB backup
```

---

## Post-Deployment Testing

### 1. Test Backend API

```bash
# Health check
curl https://api.yourdomain.com/api/health

# Test authentication
curl -X POST https://api.yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'
```

### 2. Test Frontend

```bash
# Check if site loads
curl -I https://yourdomain.com

# Check SSL
curl -vI https://yourdomain.com 2>&1 | grep SSL
```

### 3. Performance Testing

```bash
# Install Apache Bench
sudo apt install -y apache2-utils

# Test API performance
ab -n 1000 -c 10 https://api.yourdomain.com/api/health

# Test frontend performance
ab -n 100 -c 5 https://yourdomain.com/
```

---

## Support & Resources

- **MongoDB Docs:** https://www.mongodb.com/docs/
- **Nginx Docs:** https://nginx.org/en/docs/
- **PM2 Docs:** https://pm2.keymetrics.io/docs/
- **Let's Encrypt:** https://letsencrypt.org/
- **Ubuntu Server Guide:** https://ubuntu.com/server/docs

---

## Conclusion

Your MERN application is now deployed on Ubuntu 24.04 VPS! 🚀

**Next Steps:**

1. Test all application features thoroughly
2. Monitor logs for any errors
3. Setup automated backups
4. Configure monitoring alerts
5. Document any custom configurations

**Important:** Keep your system updated regularly:

```bash
sudo apt update && sudo apt upgrade -y
```

Good luck with your deployment! 🎉
