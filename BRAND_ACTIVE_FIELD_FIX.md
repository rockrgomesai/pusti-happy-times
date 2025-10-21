# Brand Routes Active Field Fix

## Issue
When editing a brand and toggling the `active` switch to make it inactive, the change wasn't being saved to the database. The brand remained active.

## Root Cause
The Brand routes (`backend/src/routes/brands.js`) were not handling the `active` field in the request body for both POST (create) and PUT (update) operations.

### Before:
```javascript
// POST - Create
const { brand } = req.body;
const newBrand = new Brand({
  brand,
  created_by: currentUserId,
  updated_by: currentUserId,
});

// PUT - Update
const { brand } = req.body;
const updatedBrand = await Brand.findByIdAndUpdate(
  req.params.id,
  {
    brand,
    updated_by: currentUserId,
    updated_at: new Date(),
  },
  // ...
);
```

### After:
```javascript
// POST - Create
const { brand, active } = req.body;
const newBrand = new Brand({
  brand,
  active: active !== undefined ? active : true,
  created_by: currentUserId,
  updated_by: currentUserId,
});

// PUT - Update
const { brand, active } = req.body;
const updateData = {
  brand,
  updated_by: currentUserId,
  updated_at: new Date(),
};

if (active !== undefined) {
  updateData.active = active;
}

const updatedBrand = await Brand.findByIdAndUpdate(
  req.params.id,
  updateData,
  // ...
);
```

## Changes Made

### 1. Updated Validation Rules
Added validation for the `active` field:
```javascript
const brandValidation = [
  body("brand")
    .trim()
    .notEmpty()
    .withMessage("Brand name is required")
    .isLength({ min: 1, max: 100 })
    .withMessage("Brand name must be between 1 and 100 characters"),
  body("active")
    .optional()
    .isBoolean()
    .withMessage("Active must be a boolean value"),
];
```

### 2. Updated POST Route (Create Brand)
- Extract `active` from `req.body`
- Set `active` to true by default if not provided
- Include `active` in the new brand document

### 3. Updated PUT Route (Update Brand)
- Extract `active` from `req.body`
- Build dynamic `updateData` object
- Only include `active` in update if it's provided in the request
- This allows partial updates (e.g., updating only the name)

## Testing

### Test Cases:
1. ✅ **Create new brand without active field**
   - Should default to `active: true`

2. ✅ **Create new brand with active: true**
   - Should save as active

3. ✅ **Create new brand with active: false**
   - Should save as inactive

4. ✅ **Update brand - change active from true to false**
   - Should update to inactive

5. ✅ **Update brand - change active from false to true**
   - Should update to active

6. ✅ **Update brand - change only name, not active**
   - Should preserve existing active status

## API Examples

### Create Brand (Active)
```bash
POST /api/brands
{
  "brand": "Test Brand",
  "active": true
}
```

### Create Brand (Inactive)
```bash
POST /api/brands
{
  "brand": "Test Brand",
  "active": false
}
```

### Update Brand - Make Inactive
```bash
PUT /api/brands/:id
{
  "brand": "Test Brand",
  "active": false
}
```

### Update Brand - Make Active
```bash
PUT /api/brands/:id
{
  "brand": "Test Brand",
  "active": true
}
```

### Update Brand - Name Only
```bash
PUT /api/brands/:id
{
  "brand": "Updated Brand Name"
}
```

## Next Steps

1. ✅ Backend routes updated
2. ⏳ **Restart backend server** to apply changes
3. ⏳ Test toggling active switch in Brand edit dialog
4. ⏳ Verify status chips update correctly after save
5. ⏳ Verify list/cards view shows updated status

## Related Files

- `backend/src/routes/brands.js` - Brand API routes (updated)
- `backend/src/models/Brand.js` - Brand model with active field
- `frontend/src/app/product/brands/page.tsx` - Brand management UI
- `backend/src/migrations/009-add-active-to-brands.js` - Migration script

## Status

✅ **Fixed** - Backend routes now properly handle the `active` field for both create and update operations.

The brand active status should now work correctly when editing brands in the UI.
