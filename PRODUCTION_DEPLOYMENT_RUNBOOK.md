# Production Deployment — Pusti Happy Times

Runbook for deploying the **backend (Node/Express)**, **frontend (Next.js)**, and
**mobile (React Native / Android)** to `tkgerp.com`.

---

## 1. Environment facts (memorise these)

| Piece | Value |
|---|---|
| Prod host | `tkgerp.com` (Ubuntu VM `vmi2906587`) |
| App root on server | `/root/apps/pusti-happy-times` |
| Backend port (internal) | `127.0.0.1:5000` |
| Frontend port (internal) | `127.0.0.1:3000` |
| Nginx site config | `/etc/nginx/sites-enabled/pusti-frontend` |
| Process manager | PM2 |
| MongoDB URI (prod) | `mongodb://pusti_app:***@localhost:27017/pusti_happy_times?authSource=pusti_happy_times` |

### Public URL layout (served by Nginx)

| Path | Served by | Purpose |
|---|---|---|
| `/`                 | Next.js `:3000` | Frontend |
| `/api/*`            | Node `:5000`    | REST API |
| `/socket.io/*`      | Node `:5000`    | WebSocket |
| `/images/*`         | **Nginx alias** → `backend/public/images/` | Category/product/profile images |
| `/uploads/*`        | Node `:5000`    | Collections / user uploads |

There is **no `/backend/` prefix**. Image URLs in the DB are stored as
`/images/categories/foo.png` and fetched from the domain root.

---

## 2. Deploy — Backend

```bash
ssh root@tkgerp.com
cd /root/apps/pusti-happy-times

# Pull
git pull

# Install deps
cd backend
npm ci --omit=dev          # or `npm install --omit=dev`

# Apply DB migrations / index syncs (idempotent)
node -e "require('./src/config/database').connect().then(async()=>{ \
  const SO=require('./src/models/SecondaryOrder'); await SO.syncIndexes(); \
  console.log('indexes ok'); process.exit(0); })"

# Run any one-time seed scripts only if the data is missing in prod.
# Verify first with mongosh before running.
# node scripts/seed-secondary-offers.js

# Restart
pm2 restart backend
pm2 logs backend --lines 80
```

**Environment file:** `/root/apps/pusti-happy-times/backend/.env`
Do NOT commit it. Key fields that must be correct:

```
NODE_ENV=production
PORT=5000
HOST=127.0.0.1
MONGODB_URI=mongodb://pusti_app:<pwd>@localhost:27017/pusti_happy_times?authSource=pusti_happy_times
JWT_ACCESS_SECRET=<stable across deploys>
JWT_REFRESH_SECRET=<stable across deploys>
FRONTEND_URL=https://tkgerp.com
ALLOWED_ORIGINS=https://tkgerp.com
SESSION_SECRET=<stable>
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=<pwd>
REDIS_URL=redis://:<pwd>@127.0.0.1:6379
```

Smoke test:

```bash
curl -s https://tkgerp.com/api/v1/health
# {"success":true,"message":"API is healthy","environment":"production", ...}
```

---

## 3. Deploy — Frontend (Next.js)

```bash
cd /root/apps/pusti-happy-times/frontend
git pull                   # already pulled at repo root, safe to skip
npm ci
rm -rf .next
npm run build
pm2 restart frontend
```

---

## 4. Deploy — Mobile (Android release APK)

Done on your **dev machine**, not the server.

### 4a. Point the build at production

The repo keeps two env files:

- `mobile/.env` — dev (Android emulator, `http://10.0.2.2:5000`)
- `mobile/.env.production` — prod (`https://tkgerp.com`)

Swap them before building:

```bash
cd ~/apps/tkg/pusti-happy-times/mobile
cp .env .env.local.bak            # back up dev
cp .env.production .env           # activate prod
```

### 4b. Bump version if publishing to users

Edit [mobile/android/app/build.gradle](mobile/android/app/build.gradle):

```gradle
defaultConfig {
    ...
    versionCode 2          // ← increment by 1 every release
    versionName "1.1.0"    // ← human-visible
}
```

### 4c. Build

```bash
cd ~/apps/tkg/pusti-happy-times/mobile
npm ci
cd android
./gradlew clean
./gradlew assembleRelease
# APK: android/app/build/outputs/apk/release/app-release.apk

# (Only if distributing via Play Store)
# ./gradlew bundleRelease
# AAB: android/app/build/outputs/bundle/release/app-release.aab
```

### 4d. Restore dev env

```bash
cd ~/apps/tkg/pusti-happy-times/mobile
cp .env.local.bak .env
```

### 4e. Install & verify

1. `adb install -r app-release.apk` (or sideload to user devices).
2. Log in with a real prod account.
3. Open Sales Module — thumbnails should load real category/product images.
4. Place a test order → verify on web `/ordermanagement/secondaryorders`.
5. Airplane-mode test → "Saved Offline" → reconnect → Pending Sync clears.

### 4f. Release signing — current state

The `release` build-type is presently signed with the **debug keystore**.
Acceptable for internal sideloading. **Required** to swap for a real upload
keystore before publishing to Play Store. See §6.

---

## 5. Nginx reference (current config, do not change unless you know why)

File: `/etc/nginx/sites-enabled/pusti-frontend`

Key blocks:

```nginx
location /api/       { proxy_pass http://127.0.0.1:5000/api/; ... }
location /socket.io/ { proxy_pass http://127.0.0.1:5000/socket.io/; ... }
location /uploads/   { proxy_pass http://127.0.0.1:5000/uploads/; ... }
location /images/    { alias /root/apps/pusti-happy-times/backend/public/images/; }
location /           { proxy_pass http://localhost:3000; ... }   # Next.js (must be last)
```

After any edit:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

## 6. One-time setup tasks (not needed every deploy)

### Release keystore (when moving to Play Store)

```bash
cd ~/apps/tkg/pusti-happy-times/mobile/android/app
keytool -genkeypair -v -storetype PKCS12 \
  -keystore pusti-upload.jks \
  -alias pusti-upload -keyalg RSA -keysize 2048 -validity 10000
# Store passwords in ~/.gradle/gradle.properties, NEVER in the repo:
#   PUSTI_UPLOAD_STORE_FILE=pusti-upload.jks
#   PUSTI_UPLOAD_KEY_ALIAS=pusti-upload
#   PUSTI_UPLOAD_STORE_PASSWORD=***
#   PUSTI_UPLOAD_KEY_PASSWORD=***
```

Then update `android/app/build.gradle`:

```gradle
signingConfigs {
    debug { ... }
    release {
        if (project.hasProperty('PUSTI_UPLOAD_STORE_FILE')) {
            storeFile     file(PUSTI_UPLOAD_STORE_FILE)
            storePassword PUSTI_UPLOAD_STORE_PASSWORD
            keyAlias      PUSTI_UPLOAD_KEY_ALIAS
            keyPassword   PUSTI_UPLOAD_KEY_PASSWORD
        }
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled enableProguardInReleaseBuilds
        proguardFiles getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro"
    }
}
```

Keep `pusti-upload.jks` backed up in a password manager / secrets vault —
**losing it means no future updates on Play Store**.

### PM2 — if starting services for the first time

```bash
cd /root/apps/pusti-happy-times/backend
pm2 start npm --name backend -- run start
cd /root/apps/pusti-happy-times/frontend
pm2 start npm --name frontend -- run start
pm2 save
pm2 startup   # run the command it prints
```

---

## 7. Deploy checklist (copy into your shell history)

```bash
# ---- on prod server ----
ssh root@tkgerp.com
cd /root/apps/pusti-happy-times && git pull
cd backend  && npm ci --omit=dev && pm2 restart backend
cd ../frontend && npm ci && rm -rf .next && npm run build && pm2 restart frontend
curl -s https://tkgerp.com/api/v1/health

# ---- on dev laptop (mobile release) ----
cd ~/apps/tkg/pusti-happy-times/mobile
cp .env .env.local.bak && cp .env.production .env
npm ci
cd android && ./gradlew clean && ./gradlew assembleRelease
cd .. && cp .env.local.bak .env
ls -lh android/app/build/outputs/apk/release/
```

---

## 8. Troubleshooting quick-ref

| Symptom | Likely cause | Fix |
|---|---|---|
| Mobile login fails against prod | `.env` not swapped before build | Rebuild after `cp .env.production .env` |
| Images 404 on mobile / web | `/images/` or `/uploads/` Nginx block missing | Check `/etc/nginx/sites-enabled/pusti-frontend`; `nginx -t && reload` |
| 404 with Next.js response headers | Request fell through to the catch-all `location /` | Add a matching `location` block **before** `location /` |
| `502 Bad Gateway` on `/api/` | Node process died | `pm2 status`, `pm2 logs backend` |
| Orders submitted twice | Missing `client_order_uid` index | Re-run the `syncIndexes` one-liner in §2 |
| Frontend build fails: `leaflet` etc. | New deps not installed | `cd frontend && npm ci` |

---

Last updated: 2026-04-20.
