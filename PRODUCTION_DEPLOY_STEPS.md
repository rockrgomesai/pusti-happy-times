# Production Deployment Steps

## Issue: Build Failing on Production Server

**Error:** `Module not found: Can't resolve 'leaflet/dist/leaflet.css'`

**Root Cause:** New dependencies (`leaflet`, `date-fns`) not installed on production server.

---

## Fix Steps (Run on Production Server)

### 1. Navigate to Frontend Directory
```bash
cd /apps/pusti-happy-times/frontend
```

### 2. Install Dependencies
```bash
npm install
```

This will install the missing packages:
- `leaflet@^1.9.4` (already in package.json dependencies)
- `date-fns@^4.1.0` (already in package.json dependencies)
- `@types/leaflet@^1.9.21` (devDependency, needed for build)

### 3. Clean Previous Build
```bash
rm -rf .next
```

### 4. Build Production Bundle
```bash
npm run build
```

### 5. Restart Frontend (if using PM2)
```bash
pm2 restart frontend
# or
pm2 restart all
```

---

## Alternative: One-Line Fix
```bash
cd /apps/pusti-happy-times/frontend && npm install && rm -rf .next && npm run build && pm2 restart frontend
```

---

## Verify Installation
After running `npm install`, verify packages are installed:
```bash
npm list leaflet date-fns
```

Expected output:
```
frontend@0.1.0
├── date-fns@4.1.0
└── leaflet@1.9.4
```

---

## Why This Happened

When you pulled the latest code (`git pull`), the `package.json` was updated with new dependencies, but `npm install` wasn't run on the production server to actually download and install those packages.

**Always remember:**
1. `git pull` - Gets new code
2. `npm install` - Installs new dependencies from package.json
3. `npm run build` - Builds with all dependencies available

---

## Future Deployments

Create a deployment script (`deploy.sh`) on the production server:

```bash
#!/bin/bash
set -e

echo "🚀 Deploying Pusti Happy Times..."

cd /apps/pusti-happy-times

echo "📥 Pulling latest code..."
git pull origin main

echo "📦 Installing backend dependencies..."
cd backend
npm install

echo "📦 Installing frontend dependencies..."
cd ../frontend
npm install

echo "🔨 Building frontend..."
rm -rf .next
npm run build

echo "♻️  Restarting services..."
pm2 restart all

echo "✅ Deployment complete!"
```

Make it executable:
```bash
chmod +x deploy.sh
```

Then deploy with:
```bash
./deploy.sh
```
