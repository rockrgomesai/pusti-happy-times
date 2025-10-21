# Depot to Facility Migration Guide

## Overview
This migration transforms the separate `Depot` and `Factory` models into a unified `Facility` model with a `type` field that can be either `'Factory'` or `'Depot'`.

## Changes Made

### 1. Backend Models

#### New Model: `Facility`
- **File**: `backend/src/models/Facility.js`
- **Collection**: `facilities`
- **Key Fields**:
  - `type`: String enum [`'Factory'`, `'Depot'`] - **Required**
  - `name`: String (unique)
  - `depot_id`: String (for backward compatibility)
  - `factory_id`: String (for backward compatibility)
  - `location`: String
  - `contact_person`: String
  - `contact_mobile`: String
  - `active`: Boolean (default: true)
  - Standard audit fields (created_at, created_by, updated_at, updated_by)

#### Updated Models

**Product Model** (`backend/src/models/Product.js`):
- Added `facility_ids` field (references Facility model)
- Kept `depot_ids` for backward compatibility
- Both fields sync automatically
- Validation updated to use `facility_ids` or fall back to `depot_ids`
- For MANUFACTURED products, at least one facility (depot) is required

**Employee Model** (`backend/src/models/Employee.js`):
- `facility_assignments.depot_ids` now references `Facility` model
- `facility_assignments.factory_ids` now references `Facility` model
- No structural changes, just reference updates

**Models Index** (`backend/src/models/index.js`):
- Added `Facility` export
- Kept `Depot` export for backward compatibility
- Updated validation to include `Facility`

### 2. Backend Routes

#### New Routes: `facilities.js`
- **File**: `backend/src/routes/facilities.js`
- **Base Path**: `/api/facilities`

**Endpoints**:
- `GET /api/facilities` - List all facilities with optional `type` filter
- `GET /api/facilities/depots` - List only depots (`type='Depot'`)
- `GET /api/facilities/factories` - List only factories (`type='Factory'`)
- `GET /api/facilities/:id` - Get single facility
- `POST /api/facilities` - Create facility (requires `type` field)
- `PUT /api/facilities/:id` - Update facility
- `DELETE /api/facilities/:id` - Delete facility
- `GET /api/facilities/my-facilities` - Get facilities for facility employees
- `GET /api/facilities/stats` - Get facility statistics

#### Updated Routes: `depots.js`
- **File**: `backend/src/routes/depots.js`
- **Status**: **LEGACY** - Kept for backward compatibility
- **Base Path**: `/api/depots`

**Changes**:
- Now uses `Facility` model instead of `Depot`
- All queries filter by `type='Depot'`
- Creates facilities with `type='Depot'` when creating depots
- All existing depot endpoints continue to work

**Routes Index** (`backend/src/routes/index.js`):
- Added `/api/facilities` route mounting
- Kept `/api/depots` route mounting (marked as deprecated)

### 3. Database Migration

#### Migration Script: `008-depot-to-facility.js`
- **File**: `backend/src/migrations/008-depot-to-facility.js`
- **Purpose**: Migrate data from `depots` and `factories` collections to `facilities`

**Migration Steps**:
1. Create `facilities` collection
2. Migrate all depots to facilities with `type='Depot'`
3. Migrate all factories to facilities with `type='Factory'`
4. Create ID mappings for reference updates
5. Update employee `facility_assignments` (IDs remain the same)
6. Add `facility_ids` field to products (copy from `depot_ids`)
7. Create indexes on facilities collection

**Run Migration**:
```bash
cd backend
node src/migrations/008-depot-to-facility.js
```

**Note**: Old `depots` and `factories` collections are NOT automatically deleted. Verify migration before dropping them.

### 4. Frontend Updates Required

The following frontend files need to be updated to use the new facility endpoints:

#### API Files to Update:
1. **Product API** (`frontend/src/lib/api/products.ts`):
   - Change `depot_ids` to `facility_ids` in payloads
   - Update API calls to use `/facilities/depots` instead of `/depots`

2. **Dashboard Components**:
   - `frontend/src/components/dashboards/FacilityDashboard.tsx`
   - Update API calls from `/depots/*` to `/facilities/*`
   - Update state variable names from `depots` to `facilities` (or keep for depots specifically)

3. **Auth Context** (`frontend/src/contexts/AuthContext.tsx`):
   - Update types to reflect facility structure
   - Consider renaming `depot_ids` to `facility_ids` in interfaces

4. **Product Components**:
   - `frontend/src/components/products/ProductFormDialog.tsx`
   - Update depot selection to use `/facilities/depots` endpoint
   - Change field names from `depot_ids` to `facility_ids`

5. **Type Definitions** (`frontend/src/types/product.ts`):
   - Update `depot_ids` to `facility_ids`
   - Update `depot_id` references

## Migration Checklist

### Backend ✅
- [x] Create Facility model
- [x] Update Product model (add facility_ids)
- [x] Update Employee model references
- [x] Update models index
- [x] Create facilities routes
- [x] Update depots routes to use Facility model
- [x] Update routes index
- [x] Create migration script

### Database ⏳
- [ ] Run migration script
- [ ] Verify data migration
- [ ] Test facility endpoints
- [ ] Drop old collections (after verification)

### Frontend ⏳
- [ ] Update product API to use facility_ids
- [ ] Update product form component
- [ ] Update facility dashboard component
- [ ] Update auth context types
- [ ] Update product types
- [ ] Test product creation with facilities

## API Compatibility

### Backward Compatible Endpoints
The following endpoints continue to work:
- `GET /api/depots` - Returns facilities where `type='Depot'`
- `GET /api/depots/:id` - Returns depot by ID
- `POST /api/depots` - Creates facility with `type='Depot'`
- `PUT /api/depots/:id` - Updates depot
- `DELETE /api/depots/:id` - Deletes depot
- `GET /api/depots/my-facilities` - Works but returns from facilities collection
- `GET /api/depots/stats` - Works with facilities

### New Recommended Endpoints
Use these for new development:
- `GET /api/facilities?type=Depot` - Get all depots
- `GET /api/facilities/depots` - Get all depots (shortcut)
- `GET /api/facilities?type=Factory` - Get all factories
- `GET /api/facilities/factories` - Get all factories (shortcut)
- `GET /api/facilities/:id` - Get any facility
- `POST /api/facilities` - Create facility (requires `type` field)

## Product Query Example

### Before (using depot_ids):
```javascript
const products = await Product.find({ depot_ids: depotId });
```

### After (using facility_ids with Depot filter):
```javascript
// Backend: facility_ids automatically synced with depot_ids
const products = await Product.find({ facility_ids: facilityId });

// To ensure only depots:
const facilities = await Facility.find({ 
  _id: { $in: product.facility_ids },
  type: 'Depot'
});
```

## Database Schema

### Facilities Collection Structure:
```javascript
{
  _id: ObjectId,
  type: "Depot" | "Factory",  // REQUIRED
  name: String,               // Unique
  depot_id: String,           // Optional, for backward compatibility
  factory_id: String,         // Optional, for backward compatibility
  location: String,
  contact_person: String,
  contact_mobile: String,
  active: Boolean,
  created_at: Date,
  created_by: ObjectId (ref: User),
  updated_at: Date,
  updated_by: ObjectId (ref: User)
}
```

### Indexes:
- `{ name: 1 }` - Unique
- `{ type: 1, active: 1 }`
- `{ depot_id: 1 }` - Sparse
- `{ factory_id: 1 }` - Sparse

## Testing

### Backend Tests:
```bash
# Test facility creation
curl -X POST http://localhost:5000/api/facilities \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Depot", "type": "Depot"}'

# Test depot endpoint (legacy)
curl http://localhost:5000/api/depots \
  -H "Authorization: Bearer <token>"

# Test facility filtering
curl http://localhost:5000/api/facilities?type=Depot \
  -H "Authorization: Bearer <token>"
```

### Frontend Tests:
1. Test product creation with facility selection
2. Test facility dashboard loads assigned facilities
3. Verify depot dropdown shows only type='Depot' facilities
4. Test product editing maintains facility assignments

## Rollback Plan

If issues arise:

1. **Do NOT drop old collections yet**
2. Revert route changes in `backend/src/routes/index.js`
3. Revert model changes in `backend/src/models/index.js`
4. Use old `depot_ids` field in products
5. Keep `depots` collection active

Old collections (`depots`, `factories`) remain intact until manually dropped.

## Next Steps

1. Run migration script
2. Update frontend files (listed above)
3. Test all product operations
4. Test facility employee dashboard
5. Verify depot selection in product forms
6. Update any other components using depot/factory data
7. After full verification, drop old collections

## Notes

- Product model automatically syncs `depot_ids` and `facility_ids`
- Employee facility assignments use the same IDs (no migration needed for employee refs)
- All depot-specific routes continue to work through legacy endpoints
- New code should use `/api/facilities` endpoints
- Migration is non-destructive - old collections remain intact
