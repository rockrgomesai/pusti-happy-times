# Employee Role Assignment Validation - Prevention System

## Problem Solved

Inventory Factory users (and other role-based employees) were not being properly validated for required facility assignments, causing runtime errors when accessing protected routes.

## Solution Implemented

### 1. **Validation Utility** (`src/utils/employeeValidation.js`)

Created a reusable validation module that checks role-specific requirements:

- **Inventory Factory**: Requires `facility_id` (Factory) + `factory_store_id` (Depot)
- **Production**: Requires `facility_id` (Factory), recommends `factory_store_id` (Depot)
- **Inventory Depot**: Requires `facility_id` (Depot)

Functions:

- `validateEmployeeRoleAssignments(employee, role, Facility)` - Validates assignments
- `getSuggestedAssignments(roleName, Facility)` - Provides helpful suggestions

### 2. **Startup Migration** (`src/migrations/validateEmployeeRoleAssignments.js`)

Runs automatically on server startup to:

- Check all employee-user assignments
- Identify misconfigured records
- Auto-fix issues using smart defaults
- Log all changes for audit

**When it runs**: Every time the server starts (via `mongoose.connection.once('open')`)

### 3. **Server Integration** (`server.js`)

Added migration execution on startup:

```javascript
const validateEmployeeRoleAssignments = require("./src/migrations/validateEmployeeRoleAssignments");
mongoose.connection.once("open", async () => {
  try {
    await validateEmployeeRoleAssignments();
  } catch (error) {
    console.error("Error running startup validations:", error);
  }
});
```

### 4. **API Route Validation** (`src/routes/employees.js`)

Added validation to employee CREATE and UPDATE endpoints:

- Validates before saving/updating
- Returns clear error messages with suggestions
- Prevents invalid assignments from being persisted

**Validation triggers**:

- Creating new employee with `user_id` provided
- Updating `facility_id` or `factory_store_id`

Error response example:

```json
{
  "success": false,
  "message": "Employee assignment validation failed: Inventory Factory users must have factory_store_id (Depot) assigned",
  "error": "Inventory Factory users must have factory_store_id (Depot) assigned",
  "suggestion": "For Inventory Factory role: Inventory Factory users must have factory_store_id (Depot) assigned"
}
```

### 5. **One-Time Fix Script** (`fix-inventory-factory-users.js`)

Manual script to fix all existing issues:

```bash
node fix-inventory-factory-users.js
```

Results:

- Found 2 Inventory Factory users
- Fixed 1 misconfigured user (inventorymanagerruby)
- 1 already correct (inventorymanagerquince)

## Protection Layers

1. ✅ **Schema-level**: Employee model validates factory_store_id references Depot
2. ✅ **Startup validation**: Auto-fixes on every server start
3. ✅ **API validation**: Prevents invalid updates through API
4. ✅ **Manual script**: One-time cleanup tool

## Testing

### Test the validation:

```bash
# Test startup migration
node -e "const migration = require('./src/migrations/validateEmployeeRoleAssignments'); const mongoose = require('mongoose'); require('dotenv').config(); mongoose.connect(process.env.MONGODB_URI_LOCAL || process.env.MONGODB_URI).then(() => migration().then(() => process.exit(0))).catch(err => { console.error(err); process.exit(1); });"
```

### Expected output:

```
🔍 Running employee role assignment validation...
   Found 2 factories and 3 depots
✅ All employee role assignments are valid
```

## Future Improvements

1. **Admin UI**: Add validation feedback in employee management interface
2. **Bulk Import**: Add validation to CSV/Excel employee imports
3. **Role Change**: Trigger validation when user's role is changed
4. **Notification**: Alert admins when auto-fixes are applied

## Maintenance

The system is now self-healing:

- ❌ No need to manually fix users
- ✅ Issues are detected and fixed on server startup
- ✅ New assignments are validated before saving
- ✅ Clear error messages guide administrators

## Files Modified

1. `backend/src/utils/employeeValidation.js` - NEW
2. `backend/src/migrations/validateEmployeeRoleAssignments.js` - NEW
3. `backend/server.js` - Added migration call
4. `backend/src/routes/employees.js` - Added validation to CREATE/UPDATE
5. `backend/fix-inventory-factory-users.js` - One-time fix script

## Summary

**Before**: Manual fixes required for each misconfigured user
**After**: Automatic detection and correction on every server start + prevention at API level

This issue will **NOT recur** as the system now:

1. Validates on creation
2. Validates on update
3. Auto-fixes on startup
4. Provides clear error messages
