# Employee Single Facility Assignment Migration

**Date:** October 21, 2025  
**Migration:** 011-facility-assignments-to-single.js  
**Status:** ✅ COMPLETED

## Overview

Successfully converted the Employee model from supporting multiple facility assignments (arrays) to a single facility assignment per employee. This aligns with the business requirement that facility employees can only work at one facility (either depot or factory) at a time.

---

## Changes Made

### 1. Backend Model Updates

#### **`backend/src/models/Employee.js`**

**Before:**

```javascript
facility_assignments: {
  factory_ids: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Facility' }],
    default: []
  },
  depot_ids: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Facility' }],
    default: []
  }
}
```

**After:**

```javascript
facility_id: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Facility',
  default: null,
  index: true
}
```

**Validation Updates:**

- Changed from "must have at least one facility" to "must have exactly one facility"
- Updated system admin validation to check `facility_id` instead of array fields

---

### 2. Backend Route Updates

#### **`backend/src/routes/auth.js`**

**Changed Context Data:**

```javascript
// Before
else if (employee.employee_type === 'facility') {
  contextData.facility_assignments = employee.facility_assignments;
}

// After
else if (employee.employee_type === 'facility') {
  contextData.facility_id = employee.facility_id;
}
```

#### **`backend/src/routes/facilities.js`**

**Updated `/my-facilities` Endpoint:**

```javascript
// Before
const { facility_assignments } = req.userContext || {};
const depots = await Facility.find({
  _id: { $in: facility_assignments.depot_ids || [] },
});
const factories = await Facility.find({
  _id: { $in: facility_assignments.factory_ids || [] },
});

// After
const { facility_id } = req.userContext || {};
const facility = await Facility.findById(facility_id);
```

**Response Structure Changed:**

```javascript
// Before
{ success: true, data: { depots: [], factories: [] } }

// After
{ success: true, data: { facility: null } }
```

**Updated `/stats` Endpoint:**

- Changed from checking multiple `facility_assignments.depot_ids` to single `facility_id`
- Updated TODO comments for future stats calculations

---

### 3. Frontend Updates

#### **`frontend/src/contexts/AuthContext.tsx`**

**Type Definition:**

```typescript
// Before
context: {
  facility_assignments?: {
    factory_ids?: string[];
    depot_ids?: string[];
  };
}

// After
context: {
  facility_id?: string; // Single facility assignment
}
```

#### **`frontend/src/components/dashboards/FacilityDashboard.tsx`**

**Major Changes:**

- Changed from managing `depots[]` and `factories[]` arrays to single `facility` state
- Updated API call to handle single facility response
- Simplified UI from showing list of depots/factories to single facility card
- Updated header chips to show single facility type and name
- Removed factory section (no longer needed)

**UI Changes:**

```tsx
// Before
<Chip label={`${depotCount} Depots`} />
<Chip label={`${factoryCount} Factories`} />

// After
<Chip label={`${facility.type}: ${facility.name}`} />
```

---

### 4. Database Migration

#### **Migration Script:** `011-facility-assignments-to-single.js`

**Process:**

1. Found all facility employees with `facility_assignments` field
2. Extracted first facility ID from either `depot_ids` or `factory_ids` (prioritized depots)
3. Set new `facility_id` field with the extracted ID
4. Removed old `facility_assignments` field

**Results:**

```
✅ Successfully updated: 3 employees
⚠️  Skipped: 0 employees
❌ Errors: 0 employees

✅ Employees with facility_id: 3
⚠️  Employees with old facility_assignments: 0
```

**Migrated Employees:**

- EMP-0002 (Warehouse Manager - Dhaka) → `facility_id: 68f2855dbdde87d90d1b9cf1`
- EMP-0004 (Inventory Supervisor - Dhaka) → `facility_id: 68f2855dbdde87d90d1b9cf1`
- EMP-0005 (Logistics Coordinator - Dhaka) → `facility_id: 68f2855dbdde87d90d1b9cf1`

---

## Verification

### Backend

✅ No compilation errors in Employee model  
✅ No compilation errors in auth routes  
✅ No compilation errors in facility routes  
✅ Migration completed successfully (3/3 employees)

### Frontend

✅ No TypeScript errors in AuthContext  
✅ No TypeScript errors in FacilityDashboard  
✅ UI simplified to single facility display

### Database

✅ All 3 facility employees have `facility_id` field  
✅ No employees retain old `facility_assignments` structure  
✅ All facility_id references point to existing facilities

---

## API Response Changes

### Before (Multiple Facilities)

```json
GET /api/facilities/my-facilities
{
  "success": true,
  "data": {
    "depots": [
      { "_id": "...", "name": "Dhaka Depot", "type": "Depot" }
    ],
    "factories": []
  }
}
```

### After (Single Facility)

```json
GET /api/facilities/my-facilities
{
  "success": true,
  "data": {
    "facility": {
      "_id": "68f2855dbdde87d90d1b9cf1",
      "name": "Dhaka Depot",
      "type": "Depot",
      "location": "Dhaka",
      "active": true,
      "contact_person": "John Doe",
      "contact_mobile": "01234567890"
    }
  }
}
```

---

## Breaking Changes

⚠️ **API Response Structure Changed**

- `/api/facilities/my-facilities` now returns `{ facility }` instead of `{ depots, factories }`
- Frontend code expecting arrays will break

⚠️ **JWT Token Context Changed**

- Tokens now contain `facility_id` (string) instead of `facility_assignments` (object)
- Existing tokens in local storage will be invalid (users need to re-login)

⚠️ **Database Schema Changed**

- `facility_assignments` field removed from employees
- New `facility_id` field added (indexed)

---

## Testing Checklist

After backend restart, verify:

- [ ] Facility employees can log in successfully
- [ ] JWT token contains `facility_id` in context
- [ ] FacilityDashboard displays single assigned facility
- [ ] Facility dashboard shows correct facility details
- [ ] Stats endpoint works for facility employees
- [ ] No errors when accessing /api/facilities/my-facilities
- [ ] Employee CRUD operations respect single facility constraint
- [ ] Creating new facility employees requires single facility_id
- [ ] Editing facility employees updates facility_id correctly

---

## Rollback Plan

If rollback is needed:

1. **Restore Database:**

   ```javascript
   // Convert facility_id back to facility_assignments
   db.employees.find({ employee_type: "facility" }).forEach((emp) => {
     if (emp.facility_id) {
       db.employees.updateOne(
         { _id: emp._id },
         {
           $set: {
             "facility_assignments.depot_ids": [emp.facility_id],
           },
           $unset: { facility_id: "" },
         }
       );
     }
   });
   ```

2. **Revert Code:**
   - Restore Employee model to use `facility_assignments`
   - Restore auth routes to return `facility_assignments`
   - Restore facility routes to handle arrays
   - Restore frontend types and components

---

## Related Files

### Modified Files

- `backend/src/models/Employee.js`
- `backend/src/routes/auth.js`
- `backend/src/routes/facilities.js`
- `frontend/src/contexts/AuthContext.tsx`
- `frontend/src/components/dashboards/FacilityDashboard.tsx`

### New Files

- `backend/src/migrations/011-facility-assignments-to-single.js`
- `FACILITY_SINGLE_ASSIGNMENT_MIGRATION.md` (this file)

### Related Documentation

- `DEPOT_FACTORY_CLEANUP_SUMMARY.md` - Previous cleanup of legacy code
- `DATABASE_SCHEMA.md` - Database schema reference
- `PROJECT_SPECIFICATIONS.md` - Project requirements

---

## Summary

Successfully transformed the Employee model to support single facility assignment instead of multiple facilities. This aligns with business requirements and simplifies the codebase by:

- Reducing complexity in employee management
- Simplifying JWT context data
- Streamlining facility employee UI
- Improving query performance with indexed facility_id
- Ensuring data integrity with validation constraints

**Files Modified:** 5  
**Migration Executed:** ✅ Successfully (3 employees updated)  
**Breaking Changes:** Yes (requires user re-login, API structure changed)  
**Status:** ✅ COMPLETED

All facility employees now have a single facility assignment, and the system correctly enforces this constraint through model validation.
