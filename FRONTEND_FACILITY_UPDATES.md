# Frontend Depot to Facility Update Tasks

## Summary
Backend migration is complete! The `facilities` collection now contains all depots and factories with a `type` field. Frontend needs updates to use new endpoints and field names.

## Priority Tasks

### 1. Update Product Form Component ⚠️ HIGH PRIORITY
**File**: `frontend/src/components/products/ProductFormDialog.tsx`

**Changes Needed**:
- [ ] Change API call from `/depots` to `/facilities/depots`
- [ ] Update field name from `depot_ids` to `facility_ids`
- [ ] Update form schema validation
- [ ] Update state variables

**Current Code**:
```typescript
// Line 52: Change interface
depot_ids: string[];

// Update to:
facility_ids: string[];
```

**API Call Update**:
```typescript
// Change from:
const response = await api.get('/depots');

// To:
const response = await api.get('/facilities/depots');
```

### 2. Update Product API Layer ⚠️ HIGH PRIORITY
**File**: `frontend/src/lib/api/products.ts`

**Changes Needed**:
- [ ] Change `depot_ids` to `facility_ids` in create payload
- [ ] Change `depot_ids` to `facility_ids` in update payload
- [ ] Ensure normalization uses `facility_ids`

**Current Code** (lines 14-27):
```typescript
const normalizedDepots = Array.isArray(payload.depot_ids)
  ? payload.depot_ids.filter((id): id is string => Boolean(id))
  : [];

// Update entire section to use facility_ids
```

### 3. Update Product Types ⚠️ HIGH PRIORITY
**File**: `frontend/src/types/product.ts`

**Changes Needed**:
- [ ] Line 15: Change `depot_ids` to `facility_ids`
- [ ] Line 39: Change `depot_id` to `facility_id` (or keep both)

**Current Code**:
```typescript
depot_ids?: Array<string | ProductReference>;
depot_id?: string;

// Update to:
facility_ids?: Array<string | ProductReference>;
facility_id?: string;
```

### 4. Update Facility Dashboard 🔵 MEDIUM PRIORITY
**File**: `frontend/src/components/dashboards/FacilityDashboard.tsx`

**Changes Needed**:
- [ ] Line 95: Change `/depots/my-facilities` to `/facilities/my-facilities`
- [ ] Line 102: Change `/depots/stats` to `/facilities/stats`
- [ ] Consider renaming `Depot` interface to `Facility`
- [ ] Update display text as needed

**API Calls**:
```typescript
// Change from:
const facilitiesRes = await api.get('/depots/my-facilities');
const statsRes = await api.get('/depots/stats');

// To:
const facilitiesRes = await api.get('/facilities/my-facilities');
const statsRes = await api.get('/facilities/stats');
```

### 5. Update Auth Context Types 🔵 MEDIUM PRIORITY
**File**: `frontend/src/contexts/AuthContext.tsx`

**Changes Needed**:
- [ ] Line 34: Update `depot_ids` type documentation
- [ ] Consider adding `facility_ids` alongside for clarity

**Optional** - Can keep `depot_ids` name for now since backend maintains both fields.

## Testing Checklist

After making changes:

### Product Management
- [ ] Create a new MANUFACTURED product
  - [ ] Depot dropdown loads correctly
  - [ ] Can select multiple depots
  - [ ] Product saves with facility_ids
  - [ ] Validation works (requires at least one depot)

- [ ] Edit an existing MANUFACTURED product
  - [ ] Depot selection shows current depots
  - [ ] Can add/remove depots
  - [ ] Changes save correctly

- [ ] Create a PROCURED product
  - [ ] Depot field is disabled/hidden
  - [ ] Product saves without facility_ids

### Facility Dashboard
- [ ] Login as facility employee (emp-0002, emp-0004, or emp-0005)
  - [ ] Dashboard loads without errors
  - [ ] Assigned depots display correctly
  - [ ] Stats load properly
  - [ ] Depot links work

### API Compatibility
- [ ] Test legacy `/depots` endpoints still work
- [ ] Test new `/facilities` endpoints work
- [ ] Verify data consistency between endpoints

## Quick Win Option 🚀

**Minimal Changes Approach** (if tight on time):
Since the backend maintains BOTH `depot_ids` and `facility_ids` fields automatically:

1. **Only change API endpoints**:
   - Update API calls from `/depots/*` to `/facilities/*`
   - Keep field names as `depot_ids` in frontend
   - Backend will handle the mapping

2. **Benefits**:
   - Minimal code changes
   - Lower risk
   - Can rename fields later

3. **Files to change**:
   - `FacilityDashboard.tsx` - 2 API calls
   - `ProductFormDialog.tsx` - 1 API call for depot dropdown

**This gets you functional quickly while maintaining backward compatibility!**

## File Change Summary

| File | Changes | Priority | Estimated Time |
|------|---------|----------|----------------|
| `lib/api/products.ts` | Rename depot_ids → facility_ids | HIGH | 10 min |
| `types/product.ts` | Update type definitions | HIGH | 5 min |
| `components/products/ProductFormDialog.tsx` | Update form fields & API | HIGH | 20 min |
| `components/dashboards/FacilityDashboard.tsx` | Update API endpoints | MEDIUM | 10 min |
| `contexts/AuthContext.tsx` | Update type comments | LOW | 5 min |

**Total Estimated Time**: ~50 minutes

## API Endpoint Reference

### Old (Still Works - Backward Compatible)
```
GET    /api/depots
GET    /api/depots/:id
POST   /api/depots
PUT    /api/depots/:id
DELETE /api/depots/:id
GET    /api/depots/my-facilities
GET    /api/depots/stats
```

### New (Recommended)
```
GET    /api/facilities              (all facilities)
GET    /api/facilities?type=Depot   (depots only)
GET    /api/facilities?type=Factory (factories only)
GET    /api/facilities/depots       (depots shortcut)
GET    /api/facilities/factories    (factories shortcut)
GET    /api/facilities/:id
POST   /api/facilities
PUT    /api/facilities/:id
DELETE /api/facilities/:id
GET    /api/facilities/my-facilities
GET    /api/facilities/stats
```

## Migration Benefits

1. ✅ **Unified Data Model**: Depots and Factories now use same collection
2. ✅ **Better Scalability**: Easy to add new facility types
3. ✅ **Simplified Queries**: One endpoint for all facilities
4. ✅ **Type Safety**: Explicit `type` field prevents confusion
5. ✅ **Backward Compatible**: Old endpoints still work
6. ✅ **Data Integrity**: Both depot_ids and facility_ids synced automatically

## Need Help?

Refer to `DEPOT_TO_FACILITY_MIGRATION.md` for complete backend details.

The backend is ready and waiting! All legacy endpoints work, so you can update frontend at your own pace.
