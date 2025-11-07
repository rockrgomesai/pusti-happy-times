# Session Refresh Required

## Why the 403 Errors?

The permissions have been successfully added to the database, but your current browser session still contains the **old permissions** from when you logged in.

When you log in, the backend creates a JWT token or session that includes:

- Your user ID
- Your role
- Your permissions (cached for performance)

Even though we added new permissions to the database, your active session doesn't know about them yet.

## Solution: Log Out and Log Back In

**Please follow these steps:**

1. **Log out** from the application
2. **Clear browser cache** (optional but recommended):
   - Chrome/Edge: `Ctrl + Shift + Delete` → Clear browsing data
   - Or just clear cookies for localhost
3. **Log back in** with your credentials
4. Your session will now have the updated permissions

## What Permissions Were Added?

### Territories API

- ✅ `territories:read` → SuperAdmin, Sales Admin, Order Management, Distributor

### Offers API

- ✅ `offers:read` → SuperAdmin, Sales Admin, Order Management, Distributor
- ✅ `offers:create` → SuperAdmin, Sales Admin
- ✅ `offers:update` → SuperAdmin, Sales Admin
- ✅ `offers:delete` → SuperAdmin, Sales Admin

### Verification

After logging back in, you can verify your permissions by:

1. **Check browser console** - look for user object in localStorage or session
2. **Browse Offers** - should work without 403 errors
3. **Offer Creation Wizard** - territories should load properly
4. **Admin Permissions page** - roles should load

## Still Getting 403 Errors After Re-login?

If you still get errors after logging out and back in, run this verification script:

```bash
cd backend
node verify-permissions.js
```

This will show you exactly which permissions each role has in the database.

## Alternative: Clear Application Data

If logging out doesn't work:

1. Open browser DevTools (F12)
2. Go to **Application** tab
3. Find **Storage** section on left
4. Click **Clear site data**
5. Refresh the page
6. Log in again

---

**Bottom Line**: The database is correct. Your session just needs to be refreshed by logging out and back in.
