# Collections Recreated - Complete Schema Migration Summary

## Overview

The `users` and `employees` collections have been successfully **recreated from scratch** with complete schemas that include:
- ✅ All original fields preserved
- ✅ New authentication fields added
- ✅ Proper indexes created
- ✅ Data restored with enhanced schema

## Migration Executed

### Scripts Run (in order):

1. **003-recreate-collections-complete-schema.js**
   - Backed up existing data
   - Dropped old collections
   - Created new collections
   - Restored employees with new fields
   - Created all indexes

2. **004-seed-users-with-auth-fields.js**
   - Created 3 users with complete authentication schema
   - Linked each user to an employee
   - Set proper defaults for new fields

3. **verify-collections.js**
   - Verified all fields present
   - Confirmed indexes created
   - Validated data structure

## Collections Status

### 📊 Users Collection

**Total Documents:** 3 users

**Complete Field List:**

#### Core Fields (Original)
- ✅ `_id` - ObjectId
- ✅ `username` - String (unique)
- ✅ `password` - String (bcrypt hashed)
- ✅ `role_id` - ObjectId (references roles collection)
- ✅ `email` - String (unique)
- ✅ `active` - Boolean

#### Authentication Fields (NEW)
- ✅ `user_type` - String enum ['employee', 'distributor']
- ✅ `employee_id` - ObjectId (references employees collection) or null
- ✅ `distributor_id` - ObjectId (references distributors collection) or null
- ✅ `tokenVersion` - Number (for logout-all-devices feature)

#### Audit Fields (Original)
- ✅ `created_at` - Date
- ✅ `created_by` - ObjectId
- ✅ `updated_at` - Date
- ✅ `updated_by` - ObjectId

**Indexes Created (7 total):**
1. `_id` (default)
2. `username` (unique)
3. `email` (unique)
4. `user_type`
5. `employee_id`
6. `distributor_id`
7. `active`

**Current Users:**
1. **superadmin** (superadmin@bdcompute.com)
   - Type: employee
   - Linked to: Ayesha Rahman (EMP-0001)
   - Password: admin123

2. **emp-0002** (emp-0002@pustihappytimes.com)
   - Type: employee
   - Linked to: Nazmul Hasan (EMP-0002)
   - Password: admin123

3. **emp-0003** (emp-0003@pustihappytimes.com)
   - Type: employee
   - Linked to: Sadia Chowdhury (EMP-0003)
   - Password: admin123

---

### 👥 Employees Collection

**Total Documents:** 3 employees

**Complete Field List:**

#### Core Fields (Original)
- ✅ `_id` - ObjectId
- ✅ `employee_id` - String (unique)
- ✅ `designation_id` - ObjectId (references designations)
- ✅ `name` - String
- ✅ `father_name` - String or null
- ✅ `mother_name` - String or null
- ✅ `date_birth` - Date
- ✅ `gender` - String enum ['male', 'female']
- ✅ `religion` - String enum
- ✅ `marital_status` - String enum ['single', 'married']
- ✅ `nationality` - String
- ✅ `national_id` - String or null
- ✅ `passport_number` - String or null
- ✅ `passport_issue_date` - Date or null
- ✅ `mobile_personal` - String or null
- ✅ `email` - String or null
- ✅ `emergency_contact` - String or null
- ✅ `emergency_mobile` - String or null
- ✅ `blood_group` - String enum or null
- ✅ `present_address` - Object (holding_no, road, city, post_code)
- ✅ `permanent_address` - Object (holding_no, village_road, union_ward, upazila_thana, district, division)
- ✅ `ssc_year` - Number or null
- ✅ `highest_degree` - String or null
- ✅ `last_organization` - String or null
- ✅ `last_position` - String or null
- ✅ `experience_years` - Number
- ✅ `reference_name` - String or null
- ✅ `reference_mobile` - String or null
- ✅ `remarks` - String or null
- ✅ `active` - Boolean

#### Authentication Context Fields (NEW)
- ✅ `employee_type` - String enum ['system_admin', 'field', 'facility', 'hq']
- ✅ `territory_assignments` - Object
  - `zone_ids` - Array of ObjectIds
  - `region_ids` - Array of ObjectIds
  - `area_ids` - Array of ObjectIds
  - `db_point_ids` - Array of ObjectIds
  - `all_territory_ids` - Array of ObjectIds (flattened)
- ✅ `facility_assignments` - Object
  - `factory_ids` - Array of ObjectIds
  - `depot_ids` - Array of ObjectIds
- ✅ `department` - String enum or null ['sales', 'marketing', 'finance', 'hr', 'production', 'logistics', 'it']

#### Audit Fields (Original)
- ✅ `created_at` - Date
- ✅ `created_by` - ObjectId
- ✅ `updated_at` - Date
- ✅ `updated_by` - ObjectId

**Indexes Created (12 total):**
1. `_id` (default)
2. `employee_id` (unique)
3. `designation_id`
4. `name`
5. `date_birth`
6. `nationality`
7. `national_id`
8. `passport_number`
9. `mobile_personal`
10. `highest_degree`
11. `active`
12. `employee_type`

**Current Employees:**
1. **Ayesha Rahman** (EMP-0001)
   - Type: system_admin
   - Email: ayesha.rahman@example.com
   - Mobile: 01700000001

2. **Nazmul Hasan** (EMP-0002)
   - Type: system_admin
   - Email: nazmul.hasan@example.com
   - Mobile: 01700000002

3. **Sadia Chowdhury** (EMP-0003)
   - Type: system_admin
   - Email: sadia.chowdhury@example.com
   - Mobile: 01700000003

---

## What Changed

### Fields Added to Users:
- `user_type` - Distinguishes employees from distributors
- `employee_id` - Links to employee record
- `distributor_id` - Links to distributor record
- `tokenVersion` - Enables logout-all-devices feature

### Fields Added to Employees:
- `employee_type` - Classifies employees (system_admin/field/facility/hq)
- `territory_assignments` - For field employees (zones, regions, areas, points)
- `facility_assignments` - For facility employees (factories, depots)
- `department` - For HQ employees

### All Original Fields Preserved:
✅ User authentication fields (username, password, role_id, email, active)
✅ Employee personal information (name, father/mother names, DOB, gender, religion, etc.)
✅ Employee contact information (email, mobile, emergency contacts)
✅ Employee address information (present and permanent addresses)
✅ Employee professional information (designation, education, experience)
✅ Audit trails (created_at, created_by, updated_at, updated_by)

---

## Next Steps

### 1. Set Employee Types and Context

All employees are currently set to `system_admin` type. You should update them based on their roles:

**For Field Employee:**
```javascript
db.employees.updateOne(
  { employee_id: "EMP-0002" },
  { $set: {
    employee_type: "field",
    "territory_assignments.zone_ids": [ObjectId("...")],
    "territory_assignments.region_ids": [ObjectId("...")],
    "territory_assignments.all_territory_ids": [ObjectId("..."), ObjectId("...")]
  }}
);
```

**For Facility Employee:**
```javascript
db.employees.updateOne(
  { employee_id: "EMP-0003" },
  { $set: {
    employee_type: "facility",
    "facility_assignments.factory_ids": [ObjectId("...")],
    "facility_assignments.depot_ids": [ObjectId("...")]
  }}
);
```

**For HQ Employee:**
```javascript
db.employees.updateOne(
  { employee_id: "EMP-0003" },
  { $set: {
    employee_type: "hq",
    department: "sales"
  }}
);
```

### 2. Test Authentication

Login with any of the seeded users:
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "superadmin",
    "password": "admin123"
  }'
```

The response should now include:
- `user_type: "employee"`
- `context` object with employee information
- Enhanced JWT token with context data

### 3. Test Authorization Middleware

Once you've set employee types, test the new middleware:

```javascript
// In a route file
router.get('/field-only', 
  authenticate, 
  requireEmployeeType('field'), 
  (req, res) => {
    res.json({ message: 'Field employee access granted' });
  }
);
```

### 4. Add More Users

To add distributor users or more employees:

**Create Distributor User:**
```javascript
// First create distributor in distributors collection
// Then create user:
db.users.insertOne({
  username: "dist001",
  password: "$2b$10$...", // bcrypt hashed
  role_id: ObjectId("..."),
  email: "dist001@example.com",
  active: true,
  user_type: "distributor",
  employee_id: null,
  distributor_id: ObjectId("..."), // distributor _id
  tokenVersion: 0,
  created_at: new Date(),
  created_by: ObjectId("..."),
  updated_at: new Date(),
  updated_by: ObjectId("...")
});
```

---

## Validation Rules

The Mongoose models enforce these rules:

### User Model:
- ✅ `user_type` is required
- ✅ Employee users must have `employee_id` (not null)
- ✅ Distributor users must have `distributor_id` (not null)
- ✅ Cannot have both `employee_id` and `distributor_id`
- ✅ Username and email must be unique
- ✅ Password is automatically hashed

### Employee Model:
- ✅ `employee_type` is required
- ✅ Field employees must have territory assignments
- ✅ Facility employees must have at least one facility (factory or depot)
- ✅ HQ employees must have a department
- ✅ System admins have no context restrictions

---

## Migration Files Created

1. **`backend/migrations/003-recreate-collections-complete-schema.js`**
   - Main migration script
   - Backs up, drops, recreates collections
   - Restores data with new fields

2. **`backend/migrations/004-seed-users-with-auth-fields.js`**
   - Seeds users with complete authentication schema
   - Links users to employees
   - Sets default values

3. **`backend/migrations/verify-collections.js`**
   - Verification utility
   - Shows complete structure
   - Lists all users and employees

4. **Previous migrations (executed earlier):**
   - `001-add-user-type-fields.js`
   - `002-add-employee-type-fields.js`

---

## Documentation References

- **AUTH_SYSTEM_ANALYSIS.md** - Detailed technical analysis
- **AUTH_IMPLEMENTATION_GUIDE.md** - Usage guide with examples
- **This document** - Migration summary

---

## Success Criteria

✅ Users collection recreated with all fields  
✅ Employees collection recreated with all fields  
✅ All original fields preserved  
✅ New authentication fields added  
✅ Proper indexes created  
✅ 3 users seeded and linked to employees  
✅ 3 employees restored with new schema  
✅ Data verified and validated  

## Ready for Testing

The database is now ready for:
- ✅ Login testing
- ⏳ Employee type configuration
- ⏳ Context assignment (territories/facilities/departments)
- ⏳ Authorization middleware testing
- ⏳ SuperAdmin logout features testing

---

**Date:** October 19, 2025  
**Status:** ✅ Migration Complete  
**Next Action:** Configure employee types and test authentication flow
