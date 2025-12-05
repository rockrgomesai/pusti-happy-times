# 🚀 DATABASE DEPLOYMENT GUIDE - Contabo Production Server

## 📋 Overview
This guide explains how to prepare, export, and deploy the database from your local development environment to the production MongoDB server on Contabo.

---

## 🔧 Prerequisites

### On Your Local Machine:
- MongoDB installed with `mongodump` and `mongorestore` tools
- Node.js installed
- SSH access to Contabo server
- SCP/SFTP client (built into PowerShell)

### On Contabo Server:
- MongoDB installed and running
- Firewall configured (if needed)
- Sufficient disk space

---

## 📦 Step 1: Prepare Deployment Database (Local)

Run the deployment preparation script:

```powershell
cd c:\tkg\pusti-ht-mern\backend
node create-deployment-database.js
```

**What this does:**
- ✅ Creates a backup of your current database
- ✅ Creates a clean deployment database: `pusti_happy_times_deployment`
- ✅ Keeps only system configuration and real business data (bd_banks, banks)
- ✅ Preserves ALL indexes
- ✅ Empties transactional and fake master data
- ✅ Keeps only superadmin user
- ⚠️ **Does NOT touch your local development database!**

---

## 💾 Step 2: Export Deployment Database (Local)

### Option A: Export entire deployment database

```powershell
# Export deployment database
mongodump --db=pusti_happy_times_deployment --out=./deployment_backup

# This creates: ./deployment_backup/pusti_happy_times_deployment/
```

### Option B: Export with compression (recommended for large databases)

```powershell
mongodump --db=pusti_happy_times_deployment --archive=pusti_deployment.archive --gzip
```

---

## 📤 Step 3: Transfer to Contabo Server

### Option A: Using SCP (directory)

```powershell
scp -r deployment_backup root@your-contabo-ip:/root/db_backups/
```

### Option B: Using SCP (compressed archive)

```powershell
scp pusti_deployment.archive root@your-contabo-ip:/root/db_backups/
```

### Option C: Using SFTP

```powershell
# Open SFTP session
sftp root@your-contabo-ip

# In SFTP prompt:
cd /root/db_backups
put -r deployment_backup
# or
put pusti_deployment.archive

exit
```

---

## 📥 Step 4: Connect to Contabo Server

```powershell
ssh root@your-contabo-ip
```

---

## 🔄 Step 5: Import to Production MongoDB (On Contabo)

### Option A: Import from directory

```bash
# Navigate to backup location
cd /root/db_backups

# Import to production database
mongorestore --db=pusti_happy_times ./deployment_backup/pusti_happy_times_deployment/

# This imports all collections with indexes into 'pusti_happy_times'
```

### Option B: Import from compressed archive

```bash
mongorestore --db=pusti_happy_times --archive=pusti_deployment.archive --gzip
```

### With Authentication (if MongoDB has auth enabled):

```bash
mongorestore \
  --host localhost \
  --port 27017 \
  --username admin \
  --password your_password \
  --authenticationDatabase admin \
  --db=pusti_happy_times \
  ./deployment_backup/pusti_happy_times_deployment/
```

---

## ✅ Step 6: Verify Import (On Contabo)

```bash
# Connect to MongoDB
mongosh

# Switch to database
use pusti_happy_times

# Check collections
show collections

# Count documents in key collections
db.api_permissions.countDocuments()  // Should be 135
db.roles.countDocuments()            // Should be 18
db.bd_banks.countDocuments()         // Should be 63
db.users.countDocuments()            // Should be 1 (superadmin only)

# Check indexes are preserved
db.users.getIndexes()
db.api_permissions.getIndexes()

# Exit
exit
```

---

## 🔄 Alternative: Direct MongoDB Connection (MongoDB Atlas/Cloud)

If your production uses MongoDB Atlas or a cloud provider:

```powershell
# Export with connection string
mongodump --uri="mongodb://localhost:27017/pusti_happy_times_deployment" --archive=pusti_deployment.archive --gzip

# Import to production
mongorestore --uri="mongodb+srv://username:password@cluster.mongodb.net/pusti_happy_times" --archive=pusti_deployment.archive --gzip
```

---

## 🔐 Step 7: Update Production Environment Variables

On Contabo server, update your `.env` file:

```bash
cd /path/to/your/app/backend
nano .env
```

Ensure MongoDB connection is correct:

```env
MONGODB_URI=mongodb://localhost:27017/pusti_happy_times
# or for remote MongoDB:
# MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/pusti_happy_times
```

---

## 🚀 Step 8: Start Production Application

```bash
# If using PM2
pm2 restart pusti-backend

# Or using systemd
systemctl restart pusti-backend

# Check logs
pm2 logs pusti-backend
# or
journalctl -u pusti-backend -f
```

---

## 🔒 Important Security Notes

1. **Change default credentials** immediately after import:
   - Login as superadmin
   - Change password from default
   - Create new admin users as needed

2. **Enable MongoDB authentication** if not already enabled:
   ```bash
   # Edit MongoDB config
   sudo nano /etc/mongod.conf
   
   # Add:
   security:
     authorization: enabled
   ```

3. **Firewall rules**:
   ```bash
   # Allow MongoDB only from localhost (if app is on same server)
   sudo ufw allow from 127.0.0.1 to any port 27017
   
   # Or allow from specific IP (if app is on different server)
   sudo ufw allow from YOUR_APP_SERVER_IP to any port 27017
   ```

---

## 🔄 Future Updates: Incremental Deployment

For future updates, you can export/import specific collections:

```powershell
# Export only updated collections
mongodump --db=pusti_happy_times --collection=api_permissions --out=./update_backup

# Import to production
mongorestore --db=pusti_happy_times --collection=api_permissions ./update_backup/pusti_happy_times/api_permissions.bson
```

---

## 📊 Rollback Plan (If Something Goes Wrong)

The script creates a timestamped backup. To rollback:

```bash
# List available backups
show dbs | grep backup

# Restore from backup
mongorestore --db=pusti_happy_times ./deployment_backup/pusti_happy_times_backup_TIMESTAMP/
```

---

## 🆘 Troubleshooting

### Problem: "mongodump: command not found"
**Solution**: Install MongoDB Database Tools
```powershell
# Download from: https://www.mongodb.com/try/download/database-tools
# Or use Chocolatey:
choco install mongodb-database-tools
```

### Problem: "failed to connect to server"
**Solution**: Check if MongoDB is running
```bash
# On Contabo:
systemctl status mongod
sudo systemctl start mongod
```

### Problem: "authentication failed"
**Solution**: Use correct credentials or disable auth temporarily
```bash
# Edit mongod.conf and comment out security section
sudo systemctl restart mongod
```

### Problem: Index creation failed
**Solution**: Indexes might already exist. Check with:
```bash
db.COLLECTION_NAME.getIndexes()
```

---

## 📝 Checklist

- [ ] Run `create-deployment-database.js` locally
- [ ] Export deployment database with `mongodump`
- [ ] Transfer backup to Contabo server
- [ ] Connect to Contabo via SSH
- [ ] Import database with `mongorestore`
- [ ] Verify collections and counts
- [ ] Check indexes are preserved
- [ ] Update production `.env` file
- [ ] Restart production application
- [ ] Login and verify functionality
- [ ] Change default passwords
- [ ] Enable MongoDB authentication
- [ ] Configure firewall rules
- [ ] Document production credentials securely

---

## 📞 Quick Reference Commands

```powershell
# LOCAL: Create deployment DB
node create-deployment-database.js

# LOCAL: Export
mongodump --db=pusti_happy_times_deployment --archive=pusti.archive --gzip

# LOCAL: Transfer
scp pusti.archive root@SERVER_IP:/root/db_backups/

# REMOTE: Import
ssh root@SERVER_IP
mongorestore --db=pusti_happy_times --archive=pusti.archive --gzip

# REMOTE: Verify
mongosh
use pusti_happy_times
db.stats()
show collections
exit
```

---

## 🎯 Expected Result

After deployment, your production database will have:
- ✅ All system configuration (permissions, roles, menus)
- ✅ Real business data (bd_banks, banks)
- ✅ 1 superadmin user
- ✅ All indexes preserved
- ✅ Empty collections ready for production data
- ✅ No test/fake data

**Total collections with data:** 9  
**Total empty collections:** 35  
**Production ready:** ✅
