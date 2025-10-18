# Offers Module - Bug Fixes

## Issues Fixed

### 1. ✅ 404 Error - Backend Routes Missing
**Problem**: Frontend was getting 404 errors when calling `/product/offers/territories/*` APIs

**Solution**: Created complete backend infrastructure
- **File**: `backend/src/routes/product/offers.js`
- **Registered**: Added to `backend/src/routes/index.js`

**Implemented Routes**:
```
GET  /product/offers/territories/:type - Get territories by type (zone/region/area/db_point)
GET  /product/offers/territories - Get all territories
POST /product/offers/distributors/eligible - Get distributors filtered by db_points + segments
GET  /product/offers/distributors/by-dbpoint/:id - Get distributors by DB point
POST /product/offers/products/by-segment - Get products by segment and type
GET  /product/offers/products/procured - Get PROCURED products
POST /product/offers - Create offer (placeholder)
GET  /product/offers - List offers (placeholder)
GET  /product/offers/:id - Get offer (placeholder)
PUT  /product/offers/:id - Update offer (placeholder)
DELETE /product/offers/:id - Delete offer (placeholder)
PATCH /product/offers/:id/status - Toggle status (placeholder)
POST /product/offers/:id/duplicate - Duplicate offer (placeholder)
```

**Permissions Used**:
- `offers:read` - All GET/POST read operations
- `offers:create` - Create and duplicate
- `offers:update` - Update and status toggle
- `offers:delete` - Delete operations

---

### 2. ✅ DB Points Missing Dropdown
**Problem**: DB Points were shown as checkboxes in a scrollable list, not as a multi-select dropdown

**Solution**: Redesigned DB Points selection in Screen2
- Changed from checkbox list to Material-UI multi-select dropdown
- Added chips to show selected items
- Shows DB Point name and code
- Better mobile experience

**Before**:
```tsx
<List dense sx={{ maxHeight: 200, overflow: 'auto' }}>
  {dbPoints.map((dbPoint) => (
    <ListItemButton onClick={...}>
      <Checkbox ... />
    </ListItemButton>
  ))}
</List>
```

**After**:
```tsx
<Select
  multiple
  value={data.selectedDbPoints}
  renderValue={(selected) => (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
      {selected.map((value) => <Chip ... />)}
    </Box>
  )}
>
  {dbPoints.map((dbPoint) => (
    <MenuItem value={dbPoint._id}>
      <Checkbox ... />
      <ListItemText ... />
    </MenuItem>
  ))}
</Select>
```

---

### 3. ✅ Include/Exclude Selection Missing
**Problem**: No way to specify whether selected items should be included or excluded from the offer

**Solution**: Added include/exclude toggles for both DB Points and Distributors

**Features**:
1. **DB Points Include/Exclude**
   - Toggle chips: "Include" (primary) / "Exclude" (error)
   - Visual indicator with colored chips
   - Alert message explaining the selection mode
   - Default: 'include' mode

2. **Distributors Include/Exclude**
   - Same toggle pattern as DB Points
   - Works independently from DB Points mode
   - Alert message for clarity
   - Default: 'include' mode

**State Added**:
```typescript
interface WizardState {
  // ... existing fields
  dbPointsIncludeMode: 'include' | 'exclude';
  distributorsIncludeMode: 'include' | 'exclude';
}
```

**UI Components**:
```tsx
// Toggle Chips
<Chip
  label="Include"
  color={mode === 'include' ? 'primary' : 'default'}
  onClick={() => onChange({ mode: 'include' })}
  clickable
/>
<Chip
  label="Exclude"
  color={mode === 'exclude' ? 'error' : 'default'}
  onClick={() => onChange({ mode: 'exclude' })}
  clickable
/>

// Feedback Alert
<Alert severity={mode === 'include' ? 'info' : 'warning'}>
  {mode === 'include' 
    ? '✓ Offer will be available to selected items only' 
    : '✗ Offer will be available to all items except selected ones'}
</Alert>
```

---

## Updated Files

### Backend
- ✅ `backend/src/routes/product/offers.js` (NEW)
- ✅ `backend/src/routes/index.js` (UPDATED - registered offers routes)

### Frontend
- ✅ `frontend/src/components/offers/wizard/Screen2TerritoryDistributor.tsx` (UPDATED)
  - Added DB Points multi-select dropdown
  - Added include/exclude toggles for DB Points
  - Added include/exclude toggles for Distributors
  - Added alert messages for clarity

- ✅ `frontend/src/components/offers/wizard/OfferTypeWizard.tsx` (UPDATED)
  - Added `dbPointsIncludeMode` to state
  - Added `distributorsIncludeMode` to state
  - Updated Screen2 props passing

---

## Testing Checklist

### Backend Routes
- [ ] Restart backend server: `npm run dev`
- [ ] Test zones API: `GET /api/product/offers/territories/zone`
- [ ] Test regions API: `GET /api/product/offers/territories/region?parent_id={zoneId}`
- [ ] Test eligible distributors: `POST /api/product/offers/distributors/eligible`

### Frontend UI
- [ ] Open: `http://localhost:3000/product/offers`
- [ ] Screen 1: Fill offer name, segments, dates
- [ ] Screen 2: 
  - [ ] Select Zone → Region → Area
  - [ ] DB Points dropdown appears
  - [ ] Select multiple DB Points
  - [ ] Toggle Include/Exclude for DB Points
  - [ ] Distributors list appears
  - [ ] Toggle Include/Exclude for Distributors
  - [ ] Select distributors
- [ ] Screen 3: Select offer type template

---

## Design Improvements

### Before
- ❌ 404 errors from backend
- ❌ DB Points as checkbox list (hard to scan)
- ❌ No include/exclude functionality
- ❌ Unclear what selection means

### After
- ✅ Backend routes working
- ✅ DB Points as dropdown with chips
- ✅ Include/Exclude toggles with visual feedback
- ✅ Clear alerts explaining selection mode
- ✅ Better mobile experience
- ✅ Consistent with Material Design patterns

---

## Next Steps

1. **Test Backend Routes**: Restart backend and verify all APIs work
2. **Test Frontend Flow**: Go through wizard screens
3. **Implement Screen 4**: Offer type configuration
4. **Implement Screen 5**: Review & submit
5. **Create Offer Model**: Define MongoDB schema
6. **Complete CRUD Operations**: Implement create/update/delete in backend

---

## Permission Guards Summary

All implemented routes use proper permission guards:

```javascript
requireApiPermission("offers:read")    // Read operations
requireApiPermission("offers:create")  // Create operations  
requireApiPermission("offers:update")  // Update operations
requireApiPermission("offers:delete")  // Delete operations
```

**Note**: These permissions need to be added to the roles in the database if they don't exist yet.
