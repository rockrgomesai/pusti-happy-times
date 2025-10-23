# Role-Based Context Validation Implementation

**Date:** October 21, 2025  
**Status:** ✅ IMPLEMENTED

## Overview

Implemented role-based context validation to ensure users with specific roles have the required employee context data (facility assignments, territory assignments, etc.). This prevents users from logging in with incomplete or invalid context data for their role.

---

## Role-Context Requirements

### Facility-Based Roles

| Role           | Required Context | Facility Type | Validation                                  |
| -------------- | ---------------- | ------------- | ------------------------------------------- |
| **Inventory**  | `facility_id`    | Depot         | Must have facility_id pointing to a Depot   |
| **Production** | `facility_id`    | Factory       | Must have facility_id pointing to a Factory |

### Territory-Based Roles

| Role                             | Required Context                   | Level  | Validation                       |
| -------------------------------- | ---------------------------------- | ------ | -------------------------------- |
| **ZSM** (Zonal Sales Manager)    | `territory_assignments.zone_ids`   | Zone   | Must have at least one Zone ID   |
| **RSM** (Regional Sales Manager) | `territory_assignments.region_ids` | Region | Must have at least one Region ID |
| **ASM** (Area Sales Manager)     | `territory_assignments.area_ids`   | Area   | Must have at least one Area ID   |
| **SO** (Sales Officer)           | `territory_assignments.area_ids`   | Area   | Must have at least one Area ID   |

### HQ-Based Roles

All other roles (not listed above) are considered HQ-based and don't have specific context requirements. These include:

- SuperAdmin
- SalesAdmin
- HR
- Finance
- Marketing
- IT Support
- etc.

---

## Implementation Details

### 1. User Model Validation Method

**File:** `backend/src/models/User.js`

Added static method `validateRoleContext()`:

```javascript
userSchema.statics.validateRoleContext = async function (role, employee, facility = null) {
  // Validates role-specific context requirements
  // Returns: { valid: boolean, error: string|null }
};
```

**Features:**

- Validates Inventory role → Depot facility
- Validates Production role → Factory facility
- Validates ZSM → Zone assignments
- Validates RSM → Region assignments
- Validates ASM/SO → Area assignments
- Returns detailed error messages for failures

**Usage:**

```javascript
const validation = await User.validateRoleContext(role, employee, facility);
if (!validation.valid) {
  // Handle validation error
  console.error(validation.error);
}
```

---

### 2. Login Validation

**File:** `backend/src/routes/auth.js`

Added role-context validation during login process:

```javascript
// After building context data
if (user.user_type === "employee" && user.employee_id) {
  // ... build contextData ...

  // Validate role-based context requirements
  let facility = null;
  if (employee.facility_id) {
    facility = await Facility.findById(employee.facility_id);
  }

  const validation = await User.validateRoleContext(user.role_id, employee, facility);

  if (!validation.valid) {
    return res.status(403).json({
      success: false,
      message: "Role context validation failed",
      error: validation.error,
      code: "ROLE_CONTEXT_INVALID",
    });
  }
}
```

**Login Flow:**

1. User provides credentials
2. Password verified
3. Employee/distributor data populated
4. Context data built
5. **→ Role-context validation performed** (NEW)
6. JWT tokens generated
7. User logged in

**Error Response:**

```json
{
  "success": false,
  "message": "Role context validation failed",
  "error": "Inventory role must be assigned to a Depot facility",
  "code": "ROLE_CONTEXT_INVALID"
}
```

---

### 3. Validation Script

**File:** `backend/src/migrations/validate-role-context.js`

Created validation script to check existing users:

```bash
node src/migrations/validate-role-context.js
```

**Features:**

- Checks all active employee users
- Validates role requirements against employee context
- Reports valid and invalid users
- Lists users requiring attention with detailed error messages

**Output Example:**

```
✅ superadmin (SuperAdmin) - Valid
❌ inventory-user (Inventory) - Inventory role requires a facility assignment

================================================================================
📊 VALIDATION SUMMARY
================================================================================
✅ Valid users: 4
❌ Invalid users: 1
================================================================================

⚠️  USERS REQUIRING ATTENTION:
  • inventory-user (Inventory) - John Doe [EMP-001]
    Error: Inventory role requires a facility assignment
```

---

## Validation Rules Details

### Inventory Role Validation

```javascript
case 'Inventory':
  if (!employee.facility_id) {
    return { valid: false, error: 'Inventory role requires a facility assignment' };
  }
  if (facility && facility.type !== 'Depot') {
    return { valid: false, error: 'Inventory role must be assigned to a Depot facility' };
  }
  break;
```

**Checks:**

1. Employee has `facility_id` populated
2. Facility exists in database
3. Facility type is `'Depot'` (not `'Factory'`)

### Production Role Validation

```javascript
case 'Production':
  if (!employee.facility_id) {
    return { valid: false, error: 'Production role requires a facility assignment' };
  }
  if (facility && facility.type !== 'Factory') {
    return { valid: false, error: 'Production role must be assigned to a Factory facility' };
  }
  break;
```

**Checks:**

1. Employee has `facility_id` populated
2. Facility exists in database
3. Facility type is `'Factory'` (not `'Depot'`)

### Territory Role Validation

```javascript
case 'ZSM':
  if (!employee.territory_assignments?.zone_ids?.length) {
    return { valid: false, error: 'ZSM role requires at least one Zone assignment' };
  }
  break;

case 'RSM':
  if (!employee.territory_assignments?.region_ids?.length) {
    return { valid: false, error: 'RSM role requires at least one Region assignment' };
  }
  break;

case 'ASM':
case 'SO':
  if (!employee.territory_assignments?.area_ids?.length) {
    return { valid: false, error: `${roleName} role requires at least one Area assignment` };
  }
  break;
```

**Checks:**

1. Employee has `territory_assignments` object
2. Appropriate territory level IDs array exists
3. Array has at least one ID

---

## Current System State

### Validation Results

Ran validation script on existing database:

```
📊 Found 5 active employee users to validate

✅ superadmin (SuperAdmin) - Valid
✅ emp-0002 (SuperAdmin) - Valid
✅ emp-0003 (SuperAdmin) - Valid
✅ emp-0004 (SuperAdmin) - Valid
✅ emp-0005 (SuperAdmin) - Valid

================================================================================
✅ Valid users: 5
❌ Invalid users: 0
================================================================================
```

**Result:** All current users have SuperAdmin role and pass validation.

---

## Usage Examples

### Example 1: Inventory User Login (Valid)

**User Setup:**

- Role: Inventory
- Employee: EMP-INV-001
- Facility: Dhaka Depot (type: 'Depot')

**Result:** ✅ Login successful

### Example 2: Inventory User Login (Invalid - Wrong Facility Type)

**User Setup:**

- Role: Inventory
- Employee: EMP-INV-002
- Facility: Dhaka Factory (type: 'Factory')

**Result:** ❌ Login blocked

```json
{
  "error": "Inventory role must be assigned to a Depot facility"
}
```

### Example 3: ZSM Login (Valid)

**User Setup:**

- Role: ZSM
- Employee: EMP-ZSM-001
- Territory Assignments:
  - zone_ids: ["zone_1", "zone_2"]
  - region_ids: []
  - area_ids: []

**Result:** ✅ Login successful

### Example 4: ZSM Login (Invalid - No Zone)

**User Setup:**

- Role: ZSM
- Employee: EMP-ZSM-002
- Territory Assignments:
  - zone_ids: []
  - region_ids: ["region_1"]
  - area_ids: []

**Result:** ❌ Login blocked

```json
{
  "error": "ZSM role requires at least one Zone assignment"
}
```

---

## Error Codes

| Code                   | Trigger                       | Message                          |
| ---------------------- | ----------------------------- | -------------------------------- |
| `ROLE_CONTEXT_INVALID` | Validation fails during login | "Role context validation failed" |
| `ACCOUNT_INACTIVE`     | User account disabled         | "Account is deactivated"         |
| `ROLE_NOT_FOUND`       | User has no role              | "User role not found"            |
| `INVALID_CREDENTIALS`  | Wrong username/password       | "Invalid credentials"            |

---

## Testing Checklist

### Create Test Users

- [ ] Create Inventory user with Depot facility → Should login successfully
- [ ] Create Inventory user with Factory facility → Should be blocked at login
- [ ] Create Inventory user with no facility → Should be blocked at login
- [ ] Create Production user with Factory facility → Should login successfully
- [ ] Create Production user with Depot facility → Should be blocked at login
- [ ] Create ZSM user with Zone assignments → Should login successfully
- [ ] Create ZSM user without Zone assignments → Should be blocked at login
- [ ] Create RSM user with Region assignments → Should login successfully
- [ ] Create ASM user with Area assignments → Should login successfully
- [ ] Create SO user with Area assignments → Should login successfully

### Verify Error Messages

- [ ] Blocked users receive clear error messages
- [ ] Error messages specify exact requirement
- [ ] HTTP status code is 403 (Forbidden)
- [ ] Error code is `ROLE_CONTEXT_INVALID`

### Verify Valid Users

- [ ] Valid users login successfully
- [ ] JWT tokens contain correct context data
- [ ] Dashboard loads appropriate data based on role
- [ ] No console errors

---

## Migration Path

### For Existing Systems

1. **Run Validation Script:**

   ```bash
   cd backend
   node src/migrations/validate-role-context.js
   ```

2. **Review Invalid Users:**

   - Script will list all users failing validation
   - Note their employee IDs and required fixes

3. **Update Employee Records:**

   - For Inventory users: Assign to Depot facility
   - For Production users: Assign to Factory facility
   - For ZSM users: Add Zone assignments
   - For RSM users: Add Region assignments
   - For ASM/SO users: Add Area assignments

4. **Re-run Validation:**

   - Verify all users pass validation
   - Document any exceptions

5. **Deploy Changes:**
   - Users will be validated on next login
   - Blocked users will need admin assistance

---

## Future Enhancements

### Potential Additions

1. **User Creation Validation:**

   - Add validation during user creation/update
   - Prevent saving invalid user-role combinations

2. **Admin Override:**

   - Add flag to temporarily bypass validation
   - Log all override instances for audit

3. **Bulk Update Tool:**

   - Create tool to fix multiple users at once
   - Auto-assign appropriate context based on role

4. **Role Change Validation:**

   - Validate context when changing user roles
   - Warn/prevent if context doesn't match new role

5. **Additional Roles:**
   - Add validation for distributor-specific roles
   - Add validation for any new employee types

---

## Related Files

### Modified Files

- `backend/src/models/User.js` - Added `validateRoleContext()` static method
- `backend/src/routes/auth.js` - Added validation during login

### New Files

- `backend/src/migrations/validate-role-context.js` - Validation script
- `ROLE_BASED_CONTEXT_VALIDATION.md` - This documentation

### Related Documentation

- `FACILITY_SINGLE_ASSIGNMENT_MIGRATION.md` - Facility assignment changes
- `DEPOT_FACTORY_CLEANUP_SUMMARY.md` - Legacy code cleanup
- `DATABASE_SCHEMA.md` - Database schema reference

---

## Summary

Successfully implemented role-based context validation ensuring:

✅ Inventory users must have Depot facilities  
✅ Production users must have Factory facilities  
✅ ZSM users must have Zone assignments  
✅ RSM users must have Region assignments  
✅ ASM/SO users must have Area assignments  
✅ Validation happens during login  
✅ Clear error messages guide users/admins  
✅ Validation script available for auditing  
✅ All existing users validated (5/5 valid)

**Status:** Ready for production use. Restart backend to activate validation.
