# DSR Module Production Deployment Guide

## Overview

This guide explains how to deploy the DSR module to production, including menu items and permissions.

## Prerequisites

- SSH access to production server
- Node.js installed on production server
- MongoDB connection configured via environment variables

## Deployment Steps

### 1. Upload the Setup Script

Upload `setup-dsr-complete.js` to your production server's backend folder:

```bash
# From your local machine
scp backend/setup-dsr-complete.js user@production-server:/path/to/backend/
```

Or via Git:

```bash
git add backend/setup-dsr-complete.js
git commit -m "Add DSR setup script for production"
git push
```

Then on production server:

```bash
git pull
```

### 2. Run the Setup Script on Production

SSH into your production server:

```bash
ssh user@production-server
cd /path/to/backend
```

Run the setup script:

```bash
node setup-dsr-complete.js
```

### 3. Verify the Setup

The script will output:

- ✅ Menu structure (Distributor → Distributors, DSR)
- ✅ API permissions created (dsr:create, dsr:read, etc.)
- ✅ Roles assigned (SuperAdmin, Sales Admin, Office Admin, MIS, Distributor)

### 4. User Action Required

**Important:** Users must log out and log back in to see the DSR menu item in the sidebar.

## What This Script Does

1. **Creates/Updates Menu Structure:**

   - Distributor (parent menu)
   - Distributors (submenu at /distributor/distributors)
   - DSR (submenu at /distributor/dsrs)

2. **Creates API Permissions:**

   - `dsr:create` - Create new DSRs
   - `dsr:read` - View DSRs
   - `dsr:update` - Edit DSRs
   - `dsr:delete` - Delete DSRs
   - `dsr:create_user` - Create user accounts for DSRs

3. **Assigns Permissions to Roles:**
   - SuperAdmin
   - Sales Admin
   - Office Admin
   - MIS
   - Distributor (full control over their DSRs)

## Safety Features

- ✅ **Idempotent:** Can be run multiple times safely
- ✅ **Non-destructive:** Doesn't delete existing data
- ✅ **Checks before creating:** Won't create duplicates
- ✅ **Detailed logging:** Shows exactly what was done

## Troubleshooting

### DSR Menu Still Not Visible After Running Script

1. **Clear browser cache and hard refresh** (Ctrl+F5)
2. **Log out and log back in**
3. Check user's role has the menu permission:
   ```bash
   # Run on production server
   node verify-distributor-access.js
   ```

### Permission Errors

If you get permission errors when running the script:

- Ensure the MongoDB connection string in `.env` is correct
- Verify the database user has read/write permissions

### Script Fails with Connection Error

Check your `.env` file has the correct `MONGODB_URI`:

```
MONGODB_URI=mongodb://user:password@host:port/database?authSource=admin
```

## Rollback (If Needed)

If you need to remove the DSR menu:

```javascript
// Remove DSR menu items (manual MongoDB commands)
db.sidebar_menu_items.deleteOne({ label: 'DSR' })
db.role_sidebar_menu_items.deleteMany({ sidebar_menu_item_id: <dsr_menu_id> })
```

## Post-Deployment Verification

After deployment, verify:

1. ✅ DSR menu appears for authorized roles
2. ✅ DSR page loads at `/distributor/dsrs`
3. ✅ Users can create/edit/delete DSRs
4. ✅ Distributor role has full access to manage their DSRs

## Support

If issues persist:

1. Check MongoDB logs
2. Check application logs
3. Verify backend routes are deployed
4. Verify frontend pages are deployed
