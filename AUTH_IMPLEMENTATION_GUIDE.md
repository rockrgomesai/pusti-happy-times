# Multi-User-Type Authentication Implementation Guide
**Date:** October 19, 2025  
**Version:** 1.0  
**Status:** ✅ IMPLEMENTED

---

## Overview

The authentication system has been successfully upgraded to support multi-user-type architecture with context-aware authorization. The system now properly identifies and authorizes:

- **Employee Users** (4 types: system_admin, field, facility, hq)
- **Distributor Users** (external partners)

---

## What Was Changed

### 🗄️ Database Models

#### 1. User Model (`backend/src/models/User.js`)
**New Fields:**
```javascript
{
  user_type: String,          // 'employee' | 'distributor'
  employee_id: ObjectId,      // Reference to Employee (if employee)
  distributor_id: ObjectId,   // Reference to Distributor (if distributor)
  tokenVersion: Number        // For logout all devices feature
}
```

**Validation:**
- Employee users MUST have `employee_id` set
- Distributor users MUST have `distributor_id` set
- Cannot have both `employee_id` AND `distributor_id`

#### 2. Employee Model (`backend/src/models/Employee.js`)
**New Fields:**
```javascript
{
  employee_type: String,      // 'system_admin' | 'field' | 'facility' | 'hq'
  
  // For field employees
  territory_assignments: {
    zone_ids: [ObjectId],
    region_ids: [ObjectId],
    area_ids: [ObjectId],
    db_point_ids: [ObjectId],
    all_territory_ids: [ObjectId]  // Flattened for efficient queries
  },
  
  // For facility employees
  facility_assignments: {
    factory_ids: [ObjectId],
    depot_ids: [ObjectId]
  },
  
  // For HQ employees
  department: String          // 'sales' | 'marketing' | 'finance' | etc.
}
```

**Validation:**
- `field` employees MUST have territory assignments
- `facility` employees MUST have at least one facility assignment
- `hq` employees MUST have a department
- `system_admin` employees have no restrictions

### 🔐 Authentication Changes

#### Enhanced Token Payload
```javascript
{
  userId: ObjectId,
  username: String,
  roleId: ObjectId,
  user_type: String,          // NEW
  tokenVersion: Number,       // NEW
  
  // Employee context (if employee)
  employee_id: ObjectId,
  employee_type: String,
  employee_code: String,
  territory_assignments: {...},  // For field
  facility_assignments: {...},   // For facility
  department: String,            // For HQ
  
  // Distributor context (if distributor)
  distributor_id: ObjectId,
  distributor_name: String,
  db_point_id: ObjectId,
  product_segment: [String]
}
```

#### Enhanced Login Response
```javascript
{
  success: true,
  message: "Login successful",
  data: {
    user: {
      id: "...",
      username: "...",
      email: "...",
      active: true,
      user_type: "employee",     // NEW
      role: { id: "...", role: "..." },
      context: {                 // NEW
        employee_type: "field",
        employee_code: "EMP-001",
        territory_assignments: {...}
      }
    },
    tokens: {
      accessToken: "...",
      refreshToken: "..."
    }
  }
}
```

### 🛡️ New Authorization Middleware

**Available Middleware:**
```javascript
const {
  // Existing
  authenticate,
  requireRole,
  requireApiPermission,
  
  // NEW Context-Aware
  requireUserType,         // Check employee vs distributor
  requireEmployeeType,     // Check system_admin, field, facility, hq
  requireTerritoryAccess,  // Validate territory access for field employees
  requireFacilityAccess,   // Validate facility access for facility employees
  requireDepartment        // Validate department for HQ employees
} = require('../middleware/auth');
```

### 🚀 SuperAdmin Features

**New Endpoints:**

1. **Logout All Devices (Self)**
   ```javascript
   POST /api/auth/logout-all-devices
   Headers: Authorization: Bearer <token>
   
   // Invalidates all tokens for current user
   ```

2. **Logout User All Devices (SuperAdmin)**
   ```javascript
   POST /api/auth/admin/logout-user-all-devices
   Headers: Authorization: Bearer <token>
   Body: { userId: "..." }
   
   // SuperAdmin force logout specific user
   ```

3. **Logout All Users (SuperAdmin)**
   ```javascript
   POST /api/auth/admin/logout-all-users
   Headers: Authorization: Bearer <token>
   
   // SuperAdmin force logout ALL users
   ```

---

## How to Use

### 1. Running Migrations

**Step 1: Migrate Users Collection**
```bash
node backend/migrations/001-add-user-type-fields.js
```

This adds:
- `user_type` (default: 'employee')
- `employee_id` (default: null)
- `distributor_id` (default: null)
- `tokenVersion` (default: 0)

**Step 2: Migrate Employees Collection**
```bash
node backend/migrations/002-add-employee-type-fields.js
```

This adds:
- `employee_type` (default: 'system_admin')
- `territory_assignments` (empty structure)
- `facility_assignments` (empty structure)
- `department` (null)

**Step 3: Link Users to Employees/Distributors**

Use MongoDB commands to link users:

```javascript
// Link user to employee
db.users.updateOne(
  { username: "john.doe" },
  { 
    $set: { 
      employee_id: ObjectId("..."),
      user_type: "employee"
    } 
  }
);

// Link user to distributor
db.users.updateOne(
  { username: "dist.user" },
  { 
    $set: { 
      distributor_id: ObjectId("..."),
      user_type: "distributor"
    } 
  }
);
```

**Step 4: Set Employee Types**

```javascript
// Field employee
db.employees.updateOne(
  { employee_id: "EMP-001" },
  { 
    $set: {
      employee_type: "field",
      "territory_assignments.zone_ids": [ObjectId("...")],
      "territory_assignments.all_territory_ids": [ObjectId("...")]
    }
  }
);

// Facility employee
db.employees.updateOne(
  { employee_id: "EMP-002" },
  { 
    $set: {
      employee_type: "facility",
      "facility_assignments.factory_ids": [ObjectId("...")]
    }
  }
);

// HQ employee
db.employees.updateOne(
  { employee_id: "EMP-003" },
  { 
    $set: {
      employee_type: "hq",
      department: "sales"
    }
  }
);
```

### 2. Using Authorization Middleware

#### Example: Protect Route by User Type
```javascript
router.get(
  "/employee-only",
  authenticate,
  requireUserType('employee'),  // Only employees can access
  async (req, res) => {
    // req.userContext contains user context
    res.json({ message: "Employee only route" });
  }
);
```

#### Example: Protect Route by Employee Type
```javascript
router.get(
  "/field-dashboard",
  authenticate,
  requireEmployeeType('field'),  // Only field employees
  async (req, res) => {
    // Access territory assignments
    const territories = req.userContext.territory_assignments;
    res.json({ territories });
  }
);
```

#### Example: Territory-Based Authorization
```javascript
router.get(
  "/territories/:territoryId/data",
  authenticate,
  requireEmployeeType('field'),
  requireTerritoryAccess('territoryId'),  // Validate access to specific territory
  async (req, res) => {
    const { territoryId } = req.params;
    // User has confirmed access to this territory
    res.json({ message: "Territory data" });
  }
);
```

#### Example: Facility-Based Authorization
```javascript
router.get(
  "/factories/:factoryId/production",
  authenticate,
  requireEmployeeType('facility'),
  requireFacilityAccess('factoryId', 'factory'),  // Validate factory access
  async (req, res) => {
    const { factoryId } = req.params;
    // User has confirmed access to this factory
    res.json({ message: "Production data" });
  }
);
```

#### Example: Department-Based Authorization
```javascript
router.get(
  "/hr/reports",
  authenticate,
  requireEmployeeType('hq'),
  requireDepartment('hr', 'finance'),  // HR or Finance only
  async (req, res) => {
    const department = req.userContext.department;
    res.json({ department, message: "HR reports" });
  }
);
```

#### Example: Mixed Authorization
```javascript
router.get(
  "/territories/:territoryId/offers",
  authenticate,
  requireApiPermission('offers:read'),  // Must have API permission
  requireUserType('employee'),          // Must be employee
  requireEmployeeType('field', 'system_admin'),  // Field or admin
  // system_admin bypasses territory check automatically
  requireTerritoryAccess('territoryId'),
  async (req, res) => {
    // All checks passed
    res.json({ offers: [] });
  }
);
```

### 3. Accessing User Context in Routes

After authentication, `req.userContext` contains:

```javascript
req.userContext = {
  user_type: 'employee',           // or 'distributor'
  employee_type: 'field',          // if employee
  employee_id: ObjectId,
  distributor_id: ObjectId,        // if distributor
  
  // Context data
  territory_assignments: {...},   // if field employee
  facility_assignments: {...},    // if facility employee
  department: 'sales',            // if hq employee
  db_point_id: ObjectId,          // if distributor
  product_segment: ['BIS', 'BEV'] // if distributor
};
```

**Example Usage:**
```javascript
router.get("/my-context", authenticate, async (req, res) => {
  const { user_type, employee_type, department } = req.userContext;
  
  if (user_type === 'employee') {
    if (employee_type === 'field') {
      // Get territories
      const territories = req.userContext.territory_assignments.all_territory_ids;
      return res.json({ territories });
    }
    
    if (employee_type === 'hq') {
      return res.json({ department });
    }
  }
  
  res.json(req.userContext);
});
```

### 4. Frontend Login Routing

The frontend now automatically routes users based on their type:

```typescript
// SuperAdmin → /dashboard
// Employee (system_admin) → /dashboard
// Employee (field) → /sales/field-dashboard
// Employee (facility) → /operations/facility-dashboard
// Employee (hq) → /hq/{department}/dashboard
// Distributor → /distributor/catalog
```

**User Object in Frontend:**
```typescript
const { user } = useAuth();

console.log(user.user_type);                    // 'employee'
console.log(user.context.employee_type);        // 'field'
console.log(user.context.territory_assignments); // { zone_ids: [...], ... }
```

### 5. SuperAdmin Features

**Logout Current User from All Devices:**
```typescript
await fetch('/api/auth/logout-all-devices', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});
```

**Force Logout Specific User (SuperAdmin):**
```typescript
await fetch('/api/auth/admin/logout-user-all-devices', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ userId: '...' })
});
```

**Force Logout All Users (SuperAdmin):**
```typescript
await fetch('/api/auth/admin/logout-all-users', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});
```

---

## Migration Checklist

- [x] ✅ Update User model with new fields
- [x] ✅ Update Employee model with new fields
- [x] ✅ Enhance TokenManager for context
- [x] ✅ Update login route with context loading
- [x] ✅ Add token version checking to authenticate middleware
- [x] ✅ Create new authorization middleware functions
- [x] ✅ Add SuperAdmin logout endpoints
- [x] ✅ Create migration scripts
- [x] ✅ Update frontend AuthContext
- [ ] ⚠️ Run migration script 001-add-user-type-fields.js
- [ ] ⚠️ Run migration script 002-add-employee-type-fields.js
- [ ] ⚠️ Manually link users to employees/distributors
- [ ] ⚠️ Set employee types and context for all employees
- [ ] ⏳ Test login flow for all user types
- [ ] ⏳ Test authorization middleware
- [ ] ⏳ Test SuperAdmin logout features
- [ ] ⏳ Update existing routes with new middleware
- [ ] ⏳ Deploy to production

---

## Testing Guide

### Test Employee Login (Field)
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "field.user",
    "password": "password123"
  }'
```

Expected response includes:
```json
{
  "success": true,
  "data": {
    "user": {
      "user_type": "employee",
      "context": {
        "employee_type": "field",
        "territory_assignments": { ... }
      }
    }
  }
}
```

### Test Territory Authorization
```bash
curl -X GET http://localhost:5000/api/territories/{territoryId}/data \
  -H "Authorization: Bearer <token>"
```

Should succeed if user has access to territory, fail with 403 otherwise.

### Test SuperAdmin Logout All
```bash
curl -X POST http://localhost:5000/api/auth/admin/logout-all-users \
  -H "Authorization: Bearer <superadmin-token>"
```

Should increment tokenVersion for all users.

---

## Security Considerations

1. **Token Version Checking** - All tokens are validated against `tokenVersion` in database
2. **Context Validation** - Employee types are validated against their required context
3. **System Admin Bypass** - System admins automatically bypass territory/facility/department restrictions
4. **Immutable Context** - Context is embedded in JWT, changes require new login
5. **Audit Logging** - All SuperAdmin logout actions are logged to console

---

## Troubleshooting

### Issue: "employee_id is required for employee users"
**Solution:** Set `employee_id` field in users collection:
```javascript
db.users.updateOne(
  { username: "..." },
  { $set: { employee_id: ObjectId("...") } }
);
```

### Issue: "Field employees must have territory assignments"
**Solution:** Set territory assignments in employees collection:
```javascript
db.employees.updateOne(
  { employee_id: "EMP-001" },
  { $set: { "territory_assignments.all_territory_ids": [ObjectId("...")] } }
);
```

### Issue: "Token has been invalidated"
**Cause:** User or admin used logout-all-devices feature
**Solution:** Login again to get new token with current tokenVersion

### Issue: Frontend routing to wrong page
**Solution:** Check `user_type` and `employee_type` in database match expected values

---

## Next Steps

1. **Run Migration Scripts** - Execute both migration scripts on your database
2. **Manual Data Setup** - Link users to employees/distributors and set employee types
3. **Testing** - Test login flow and authorization for all user types
4. **Route Updates** - Add new middleware to existing routes as needed
5. **UI Updates** - Create dashboard pages for different employee types
6. **Documentation** - Update API documentation with new middleware

---

## Support

For issues or questions:
1. Check `AUTH_SYSTEM_ANALYSIS.md` for detailed analysis
2. Review migration script outputs for guidance
3. Check backend logs for validation errors
4. Test with SuperAdmin account first

---

**Status:** ✅ Implementation Complete - Ready for Migration and Testing
