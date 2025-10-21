# Active Field Migration - Brands & Facilities

## Overview
Added `active` field to Brand and Facility models with default value `true` to match the Category model pattern.

## Changes Made

### 1. Backend Model Updates

#### Brand Model (`backend/src/models/Brand.js`)
- ✅ Added `active` field to schema
  ```javascript
  active: {
    type: Boolean,
    default: true,
  }
  ```

#### Facility Model (`backend/src/models/Facility.js`)
- ✅ Already had `active` field with proper configuration
  ```javascript
  active: {
    type: Boolean,
    default: true,
    index: true,
  }
  ```

### 2. Database Migrations

#### Migration 009: Add active to brands
- **File**: `backend/src/migrations/009-add-active-to-brands.js`
- **Status**: ✅ Executed successfully
- **Result**: Updated 10 brand documents with `active: true`

#### Migration 010: Add active to facilities
- **File**: `backend/src/migrations/010-add-active-to-facilities.js`
- **Status**: ✅ Executed successfully
- **Result**: All 5 facilities already had active field (from previous migration)

### 3. Frontend Updates

#### Brand Page (`frontend/src/app/product/brands/page.tsx`)
- ✅ Added `active: boolean` to Brand interface
- ✅ Added `active: z.boolean()` to brandSchema
- ✅ Added Switch control in form dialog
- ✅ Added Status column in table with Active/Inactive chips
- ✅ Added Status display in cards view
- ✅ Fixed controlled/uncontrolled input warning with `checked={field.value ?? true}`
- ✅ Default value: `active: true`

#### Facility Page (`frontend/src/app/master/facilities/page.tsx`)
- ✅ Added `active: boolean` to Facility interface
- ✅ Added `active: z.boolean()` to facilitySchema
- ✅ Added Switch control in form dialog
- ✅ Added Status column in table with Active/Inactive chips
- ✅ Added Status display in cards view
- ✅ Fixed controlled/uncontrolled input warning with `checked={field.value ?? true}`
- ✅ Default value: `active: true`

## Migration Results

### Brands Collection
- **Total documents**: 10
- **Updated with active field**: 10
- **All brands now have**: `active: true`

### Facilities Collection
- **Total documents**: 5
- **Already had active field**: 5 (from migration 008)
- **No updates needed**

## API Impact

### Brand Routes (`/api/brands`)
- GET requests now return `active` field
- POST requests accept `active` field (default: true)
- PUT requests can update `active` field

### Facility Routes (`/api/facilities`)
- GET requests now return `active` field
- POST requests accept `active` field (default: true)
- PUT requests can update `active` field

## UI Features

### Status Display
- ✅ **Active**: Green filled chip
- ⚪ **Inactive**: Gray outlined chip

### Form Control
- Switch control in Add/Edit dialogs
- Default state: ON (active: true)
- Properly controlled to prevent React warnings

### Sorting
- Status column is sortable in table view
- Active items sorted as 1, Inactive as 0

### Export
- Status included in CSV/Excel/PDF exports
- Shows "Active" or "Inactive" text

## Testing Checklist

- [x] Brand model has active field
- [x] Facility model has active field
- [x] Existing brands updated with active: true
- [x] Existing facilities have active field
- [x] Frontend displays status chips correctly
- [x] Switch control works in dialogs
- [x] No controlled/uncontrolled input warnings
- [x] Default value is true for new entries
- [x] Editing existing entries preserves active status
- [x] Sorting by status works
- [x] Export includes status

## Next Steps

1. ✅ Restart backend server to load updated Brand model
2. ✅ Test creating new brands (should default to active: true)
3. ✅ Test editing existing brands (should show current active status)
4. ✅ Test toggling active switch in both Brand and Facility forms
5. ✅ Verify status chips display correctly in both list and cards views

## Notes

- All migrations preserve existing data
- Default value ensures backward compatibility
- UI pattern matches Category page for consistency
- Both frontend and backend are now in sync
