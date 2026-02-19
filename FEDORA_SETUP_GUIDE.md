# Fedora 43 Setup Guide - Pusti Happy Times

**Target System:** Fedora 43 Desktop  
**Date:** February 19, 2026  
**Purpose:** Complete setup instructions for running the application on Fedora Linux

---

## Table of Contents

1. [Prerequisites Installation](#prerequisites-installation)
2. [Project Setup](#project-setup)
3. [Database Restoration](#database-restoration)
4. [Running the Application](#running-the-application)
5. [Service URLs](#service-urls)
6. [Troubleshooting](#troubleshooting)
7. [Production Setup (Optional)](#production-setup-optional)

---

## Prerequisites Installation

### 1. Update System

```bash
sudo dnf update -y
```

### 2. Install Docker & Docker Compose

```bash
# Install Docker
sudo dnf install -y dnf-plugins-core
sudo dnf config-manager --add-repo https://download.docker.com/linux/fedora/docker-ce.repo
sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Start Docker service
sudo systemctl start docker
sudo systemctl enable docker

# Add current user to docker group (no sudo needed)
sudo usermod -aG docker $USER
newgrp docker

# Verify installation
docker --version
docker compose version
```

### 3. Install Node.js 20.x

```bash
# Install Node.js via NodeSource repository
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs

# Verify installation
node --version    # Should show v20.x.x
npm --version     # Should show 10.x.x
```

### 4. Install Git (if not already installed)

```bash
sudo dnf install -y git
git --version
```

---

## Project Setup

### 1. Clone Repository

```bash
cd ~/
git clone <your-repository-url> pusti-ht-mern
cd pusti-ht-mern
```

**If already cloned, skip to step 2**

### 2. Setup Backend Environment Variables

```bash
cd ~/pusti-ht-mern/backend

# Copy environment template
cp .env.example .env

# Edit environment file
nano .env
```

**Update the following values in `.env`:**

```bash
# Database Configuration
MONGODB_URI_LOCAL=mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin

# Redis Configuration
REDIS_URL_LOCAL=redis://localhost:6379

# JWT Configuration (generate unique secrets)
JWT_SECRET=your-super-secret-jwt-key-$(date +%s | sha256sum | base64 | head -c 32)
JWT_REFRESH_SECRET=your-refresh-secret-$(date +%s | sha256sum | base64 | head -c 32)
JWT_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d

# Server Configuration
NODE_ENV=development
PORT=5000

# CORS Configuration
FRONTEND_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# Security
BCRYPT_SALT_ROUNDS=12
```

**Save and exit:** Ctrl+X, then Y, then Enter

### 3. Start Docker Services (MongoDB + Redis + Mongo Express)

```bash
cd ~/pusti-ht-mern

# Start MongoDB, Redis, and Mongo Express
docker compose up -d mongodb redis mongo-express

# Verify containers are running
docker ps
```

**Expected output:**
```
CONTAINER ID   IMAGE                 STATUS         PORTS
xxx            mongo:7.0             Up 10s         0.0.0.0:27017->27017/tcp
xxx            redis:7.2-alpine      Up 10s         0.0.0.0:6379->6379/tcp
xxx            mongo-express:1.0.2   Up 10s         0.0.0.0:8081->8081/tcp
```

### 4. Install Project Dependencies

```bash
cd ~/pusti-ht-mern

# Install all dependencies (backend + frontend)
npm run install:all

# This runs:
# - npm install in backend/
# - npm install in frontend/
# Takes 2-5 minutes depending on internet speed
```

---

## Database Restoration

### 1. Transfer Backup File from Laptop

**Options:**
- USB drive
- Network share (scp/rsync)
- Cloud storage

**Example using SCP (if both machines on same network):**

On Fedora desktop:
```bash
# From laptop (Windows PowerShell)
scp c:\tkg\pusti_backup_20260219_101423.gz username@fedora-ip:~/

# Or from Fedora, pull from laptop
# scp username@laptop-ip:/c/tkg/pusti_backup_20260219_101423.gz ~/
```

### 2. Restore Database from Backup

```bash
# Assuming backup file is in home directory
cd ~/

# Copy backup into Docker container
docker cp pusti_backup_20260219_101423.gz pusti-mongodb:/tmp/backup.gz

# Restore database (replaces all data)
docker exec pusti-mongodb mongorestore \
  --uri="mongodb://admin:password123@localhost:27017?authSource=admin" \
  --gzip \
  --archive=/tmp/backup.gz \
  --drop

# Wait for completion (takes 10-30 seconds)
```

### 3. Verify Database Restoration

```bash
docker exec pusti-mongodb mongosh \
  mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin \
  --quiet --eval "
    print('Total collections: ' + db.getCollectionNames().length);
    var total = 0;
    db.getCollectionNames().forEach(function(col) {
      var count = db.getCollection(col).countDocuments();
      total += count;
    });
    print('Total documents: ' + total);
  "
```

**Expected output:**
```
Total collections: 64
Total documents: 7333
```

✅ **If you see 64 collections and 7333 documents, restoration is successful!**

---

## Running the Application

### 1. Start Backend Server

Open a terminal:

```bash
cd ~/pusti-ht-mern/backend
npm run dev
```

**Expected output:**
```
✅ Server running on port 5000
✅ MongoDB Connected to pusti_happy_times
✅ Redis Connected
📡 Environment: development
```

**Test backend:**
```bash
# In a new terminal
curl http://localhost:5000/api/v1/health

# Expected response:
# {"status":"ok","timestamp":"2026-02-19T..."}
```

### 2. Start Frontend Web Portal (Optional)

Open a **new terminal**:

```bash
cd ~/pusti-ht-mern/frontend
npm run dev
```

**Expected output:**
```
▲ Next.js 15.x
- Local:        http://localhost:3000
- Ready in 3.2s
```

**Access:** Open browser to http://localhost:3000

### 3. Start Mobile App Development (Optional)

**Only if you need Android development**

#### Install Android Studio

```bash
# Download Android Studio
wget https://redirector.gvt1.com/edgedl/android/studio/ide-zips/2024.1.1.12/android-studio-2024.1.1.12-linux.tar.gz

# Extract
sudo tar -xzf android-studio-*-linux.tar.gz -C /opt/

# Launch Android Studio
/opt/android-studio/bin/studio.sh

# Follow setup wizard to install Android SDK
```

#### Configure Android Environment

```bash
# Add to ~/.bashrc
echo 'export ANDROID_HOME=$HOME/Android/Sdk' >> ~/.bashrc
echo 'export PATH=$PATH:$ANDROID_HOME/emulator' >> ~/.bashrc
echo 'export PATH=$PATH:$ANDROID_HOME/platform-tools' >> ~/.bashrc
source ~/.bashrc

# Verify
echo $ANDROID_HOME  # Should show /home/username/Android/Sdk
```

#### Run Mobile App

```bash
cd ~/pusti-ht-mern/mobile
npm install

# Start Metro bundler (one terminal)
npm start

# Run on Android device/emulator (another terminal)
npm run android
```

**Note:** Update `mobile/src/services/api.ts` to use your Fedora machine's IP instead of localhost:
```typescript
// Change from:
const API_URL = 'http://localhost:5000/api/v1';

// To (get IP with: ip addr show | grep "inet 192"):
const API_URL = 'http://192.168.1.100:5000/api/v1';
```

---

## Service URLs

| Service | URL | Credentials | Purpose |
|---------|-----|-------------|---------|
| **Backend API** | http://localhost:5000 | - | REST API endpoints |
| **Frontend Portal** | http://localhost:3000 | - | Web dashboard |
| **Mongo Express** | http://localhost:8081 | See below | Database admin UI |
| **MongoDB Direct** | mongodb://localhost:27017 | admin / password123 | Database connection |
| **Redis** | redis://localhost:6379 | - | Cache server |

**Mongo Express Login:**
- URL: http://localhost:8081
- Authentication: Disabled by default (no login needed)
- If prompted: admin / password123

---

## Troubleshooting

### Issue: Docker Permission Denied

```bash
# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Or restart your session
logout
# Login again
```

### Issue: Port Already in Use

```bash
# Check what's using port 5000
sudo lsof -i :5000

# Kill the process
sudo kill -9 <PID>

# Or use different port in backend/.env
PORT=8080
```

### Issue: MongoDB Connection Failed

```bash
# Check container status
docker ps -a | grep mongo

# View container logs
docker logs pusti-mongodb

# Restart container
docker restart pusti-mongodb

# Verify MongoDB is accessible
docker exec pusti-mongodb mongosh --eval "db.version()"
```

### Issue: Backend Can't Connect to MongoDB

```bash
# Check if MongoDB is running
docker ps | grep mongo

# Test connection
docker exec pusti-mongodb mongosh \
  mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin \
  --eval "db.stats()"

# Check backend/.env has correct URI
cat backend/.env | grep MONGODB_URI_LOCAL
```

### Issue: Frontend Build Fails

```bash
# Clear Next.js cache
cd ~/pusti-ht-mern/frontend
rm -rf .next node_modules
npm install
npm run dev
```

### Issue: Mobile App Can't Reach Backend

```bash
# Get your machine's IP address
ip addr show | grep "inet 192"
# Note the IP like 192.168.1.100

# Update mobile/src/services/api.ts
# Change localhost to your IP address

# Restart Metro bundler
cd ~/pusti-ht-mern/mobile
npm start -- --reset-cache
```

### Issue: Firewall Blocking Ports

```bash
# Check if firewalld is active
sudo systemctl status firewalld

# Allow necessary ports
sudo firewall-cmd --permanent --add-port=3000/tcp  # Frontend
sudo firewall-cmd --permanent --add-port=5000/tcp  # Backend
sudo firewall-cmd --permanent --add-port=8081/tcp  # Mongo Express
sudo firewall-cmd --reload

# List open ports
sudo firewall-cmd --list-ports
```

### Issue: Node Module Errors

```bash
# Clear and reinstall
cd ~/pusti-ht-mern/backend
rm -rf node_modules package-lock.json
npm install

cd ~/pusti-ht-mern/frontend
rm -rf node_modules package-lock.json
npm install
```

---

## Production Setup (Optional)

### Using PM2 Process Manager

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start backend with PM2
cd ~/pusti-ht-mern/backend
pm2 start npm --name "pusti-backend" -- start

# Start frontend with PM2
cd ~/pusti-ht-mern/frontend
pm2 start npm --name "pusti-frontend" -- start

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup systemd
# Copy and run the command it outputs

# View running processes
pm2 list

# View logs
pm2 logs

# Restart services
pm2 restart all

# Stop services
pm2 stop all
```

### Setup Nginx Reverse Proxy (Optional)

```bash
# Install Nginx
sudo dnf install -y nginx

# Create config for backend
sudo nano /etc/nginx/conf.d/pusti-backend.conf
```

**Add:**
```nginx
upstream backend {
    server localhost:5000;
}

server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

```bash
# Test config
sudo nginx -t

# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

---

## Quick Reference Commands

### Daily Development Commands

```bash
# Start Docker services
docker compose up -d mongodb redis mongo-express

# Start backend (in one terminal)
cd ~/pusti-ht-mern/backend && npm run dev

# Start frontend (in another terminal)
cd ~/pusti-ht-mern/frontend && npm run dev

# Stop all
docker compose down
# Ctrl+C in backend and frontend terminals
```

### Database Commands

```bash
# Access MongoDB shell
docker exec -it pusti-mongodb mongosh \
  mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin

# Backup database
docker exec pusti-mongodb mongodump \
  --uri="mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin" \
  --gzip --archive=/tmp/backup_$(date +%Y%m%d).gz

docker cp pusti-mongodb:/tmp/backup_$(date +%Y%m%d).gz ~/backups/

# Restore database
docker cp ~/backup.gz pusti-mongodb:/tmp/backup.gz
docker exec pusti-mongodb mongorestore \
  --uri="mongodb://admin:password123@localhost:27017?authSource=admin" \
  --gzip --archive=/tmp/backup.gz --drop
```

### Docker Commands

```bash
# View running containers
docker ps

# View all containers
docker ps -a

# View logs
docker logs pusti-mongodb
docker logs -f pusti-mongodb  # Follow logs

# Restart container
docker restart pusti-mongodb

# Stop all containers
docker compose down

# Remove all containers and volumes
docker compose down -v
```

---

## System Information

**Application Stack:**
- **Backend:** Node.js 20.x, Express.js
- **Frontend:** Next.js 15, React, TypeScript
- **Mobile:** React Native 0.73, TypeScript
- **Database:** MongoDB 7.0
- **Cache:** Redis 7.2
- **Container Platform:** Docker with Docker Compose

**Database Statistics:**
- Collections: 64
- Total Documents: 7,333
- Key Collections: outlets (3,021), role_api_permissions (863), distributors (654)

**Ports Used:**
- 3000: Frontend (Next.js)
- 5000: Backend (Express API)
- 8081: Mongo Express
- 27017: MongoDB
- 6379: Redis

---

## Next Steps After Setup

1. ✅ Verify all services are running
2. ✅ Test backend API with curl or Postman
3. ✅ Access frontend in browser
4. ✅ Login to Mongo Express to verify data
5. ⏭️ Start development on new features
6. ⏭️ Review MOBILE_APPS_SESSION_START.md for mobile app details
7. ⏭️ Review BACKEND_CONTEXT.md for API documentation

---

## Support & Documentation

**Session Start Documents:**
- `MOBILE_APPS_SESSION_START.md` - Mobile app architecture and features
- `BACKEND_CONTEXT.md` - Backend API and database models
- `FRONTEND_CONTEXT.md` - Web portal documentation
- `OPEN_SHOP_IMPLEMENTATION_COMPLETE.md` - Open Shop feature guide
- `DATABASE_SCHEMA.md` - Complete database schema

**Repository:** [Your Git Repository URL]

---

**Setup completed!** 🎉

If you encounter any issues not covered in troubleshooting, check the logs:
- Backend: `~/pusti-ht-mern/backend/logs/`
- Docker: `docker logs <container-name>`
- System: `journalctl -xe`
