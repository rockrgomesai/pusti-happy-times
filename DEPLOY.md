# Production Deployment Guide (GitHub Actions)

## How It Works

Every push to `main` triggers a two-stage pipeline defined in `.github/workflows/deploy.yml`:

1. **`build-frontend` job** — runs `npm ci` + `npm run build` on the GitHub runner, then uploads only `.next/`, `public/`, and the three config files as an artifact (no source code sent to server).

2. **`deploy` job** — after the build:
   - `rsync`s backend source (excluding `.env`, `node_modules`, `logs`, `uploads`) to the server
   - `rsync`s the compiled frontend artifact (no source) to the server
   - SSHs in to run `npm ci --omit=dev` + `pm2 reload` on each
   - Health-checks the API endpoint

---

## GitHub Secrets

Add these in **GitHub → Repository → Settings → Secrets and variables → Actions**:

| Secret | Value |
|---|---|
| `PROD_SSH_KEY` | Private SSH key that can log into the VPS (the corresponding public key must be in `~/.ssh/authorized_keys` on the server) |
| `PROD_HOST` | `tkgerp.com` or the VPS IP address |
| `PROD_USER` | The Linux user that runs the app (e.g. `deployer`) |
| `PROD_BACKEND_PATH` | Absolute path on server, e.g. `/home/deployer/pusti/backend` |
| `PROD_FRONTEND_PATH` | Absolute path on server, e.g. `/home/deployer/pusti/frontend` |
| `NEXT_PUBLIC_API_URL` | `https://tkgerp.com/api/v1` |

---

## One-Time Server Setup

These steps are run **once** manually on the production VPS. After that, all future deployments are fully automated.

### 1. Create deploy directories

```bash
mkdir -p /home/deployer/pusti/backend
mkdir -p /home/deployer/pusti/frontend
mkdir -p /home/deployer/pusti/backend/logs
mkdir -p /home/deployer/pusti/backend/public/uploads
mkdir -p /home/deployer/pusti/backend/public/images
```

### 2. Create backend `.env`

```bash
nano /home/deployer/pusti/backend/.env
```

This file is **never overwritten by the deploy** (excluded from rsync). Populate it with all required environment variables (MongoDB URI, JWT secret, etc.).

### 3. Create frontend `.env.local` (if needed)

```bash
nano /home/deployer/pusti/frontend/.env.local
```

### 4. Install Node.js and PM2

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2
pm2 startup   # follow the printed command to enable auto-start on reboot
```

### 5. Add the deploy SSH public key

Generate a dedicated keypair locally (or on the runner):

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/deploy_key -N ""
```

Copy the **public key** (`deploy_key.pub`) to the server:

```bash
cat deploy_key.pub >> /home/deployer/.ssh/authorized_keys
chmod 600 /home/deployer/.ssh/authorized_keys
```

Add the **private key** (`deploy_key`) content as the `PROD_SSH_KEY` GitHub secret.

### 6. First manual deploy (bootstrap)

Run the first deployment manually to let PM2 register the processes:

```bash
# On the server, after rsync has populated the directories:
cd /home/deployer/pusti/backend
npm ci --omit=dev
pm2 start ecosystem.config.js --env production

cd /home/deployer/pusti/frontend
npm ci --omit=dev
pm2 start 'npm start' --name pusti-frontend

pm2 save   # persist process list across reboots
```

After this, all subsequent deploys via GitHub Actions will use `pm2 reload` (zero-downtime restart).

---

## What Lands on the Server

| Path | Content |
|---|---|
| `PROD_BACKEND_PATH/` | Backend Node.js source (no `.env`, no `node_modules`, no logs, no uploads) |
| `PROD_FRONTEND_PATH/` | `.next/` build output + `public/` + `package.json` + `next.config.mjs` only — **no source code** |

---

## Rolling Back

To roll back to the previous release, re-run the GitHub Actions workflow for the previous commit:

1. Go to **Actions** tab in GitHub
2. Find the workflow run for the commit you want
3. Click **Re-run jobs**

Or manually on the server using PM2:

```bash
pm2 reload pusti-backend
pm2 reload pusti-frontend
```
