# Test Plan: Edit Offer Screen 2 Territory Data Pre-fill

## Changes Made

### 1. Fixed Field Mapping in OfferTypeWizard.tsx
- **Issue**: Was looking for `territories.zones.items` but backend returns `territories.zones.ids`
- **Fix**: Updated all territorial data mappings to use `.ids` instead of `.items`

### 2. Fixed Cascading Selection Clearing in Screen2TerritoryDistributor.tsx
- **Issue**: useEffect hooks were clearing downstream selections on initial load
- **Fix**: Added conditional checks to only clear when necessary

## Test Steps

### Prerequisites
1. Ensure backend is running on port 5000
2. Ensure frontend is running on port 3000 or 3001
3. Have at least one offer created with territorial data

### Test Procedure

#### Step 1: Create a Test Offer (if needed)
1. Navigate to: `http://localhost:3000/product/offers/create` (or 3001)
2. Fill Screen 1:
   - Offer Name: "Test Territorial Edit"
   - Select at least one product segment (BIS or BEV)
   - Set valid dates
   - Click Next

3. Fill Screen 2 (Territory Selection):
   - Select 2-3 Zones
   - Select 2-3 Regions
   - Select 2-3 Areas
   - Select 2-3 DB Points
   - Select 2-3 Distributors
   - Note down your selections
   - Click Next

4. Fill Screen 3:
   - Select any offer type
   - Click Next

5. Fill Screen 4:
   - Configure the offer based on type selected
   - Click Next

6. Fill Screen 5:
   - Review and Submit the offer
   - Note the offer ID from the URL after creation

#### Step 2: Test Edit Functionality
1. Navigate to Browse Offers: `http://localhost:3000/product/browseoffers`
2. Find the offer you just created
3. Click the Edit button/icon
4. You should be redirected to: `http://localhost:3000/product/offers/edit/[OFFER_ID]`

#### Step 3: Verify Screen 2 Data Loading
1. On the Edit page, click Next from Screen 1 to reach Screen 2
2. **VERIFY**: All zones you selected are checked ✓
3. **VERIFY**: The zones list is populated and visible
4. **VERIFY**: All regions you selected are checked ✓
5. **VERIFY**: The regions list is populated (based on selected zones)
6. **VERIFY**: All areas you selected are checked ✓
7. **VERIFY**: The areas list is populated (based on selected regions)
8. **VERIFY**: All DB points you selected are checked ✓
9. **VERIFY**: The DB points list is populated (based on selected areas)
10. **VERIFY**: All distributors you selected are checked ✓
11. **VERIFY**: The distributors list is populated (based on selected DB points)
12. **VERIFY**: The include/exclude mode chips show correct selection

### Expected Results

✅ **Before Fix**: Screen 2 showed empty lists or cleared selections
✅ **After Fix**: Screen 2 shows all pre-filled territorial data with:
   - All previously selected zones checked
   - All previously selected regions checked and regions list populated
   - All previously selected areas checked and areas list populated
   - All previously selected DB points checked and DB points list populated
   - All previously selected distributors checked and distributors list populated
   - Correct include/exclude mode for each level

### Browser Console Check

Open browser DevTools (F12) and check Console for:
- ❌ No errors related to undefined `items` property
- ✅ Successful API calls to load territories at each level
- ✅ Console logs showing territorial data being loaded

### Network Tab Check

In DevTools Network tab, verify these API calls succeed:
1. `GET /product/offers/[ID]` - Returns offer with populated territories
2. `GET /product/offers/territories/zone` - Loads zones
3. `GET /product/offers/territories/region?parent_id=...` - Loads regions for selected zones
4. `GET /product/offers/territories/area?parent_id=...` - Loads areas for selected regions
5. `GET /product/offers/territories/db_point?parent_id=...` - Loads DB points for selected areas
6. `POST /product/offers/distributors/eligible` - Loads eligible distributors

## Quick Browser Test

Open your browser and run this in the console on the edit page:
```javascript
// This will show what data structure is being received
console.log('Initial Data Structure:', JSON.parse(JSON.stringify(window.__NEXT_DATA__)));
```

## Rollback Plan

If issues occur, revert these files:
1. `frontend/src/components/offers/wizard/OfferTypeWizard.tsx`
2. `frontend/src/components/offers/wizard/Screen2TerritoryDistributor.tsx`

## Additional Notes

- The fix handles both populated objects (with `_id`) and plain ID strings
- The cascading load logic now preserves existing selections during initial load
- All downstream dependencies are loaded properly when parent selections exist
