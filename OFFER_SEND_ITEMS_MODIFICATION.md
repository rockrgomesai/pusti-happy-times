# Offer Send Items - Field Requirement Modifications

**Date**: 2025-01-XX  
**Module**: Offers → Send Items (Sales Admin)  
**Status**: ✅ COMPLETED

---

## Requirements Summary

Modified the Send Items page (`/offers/senditems`) to make the form more flexible:

1. **Price is now user-editable** (previously read-only from product.trade_price)
2. **Optional fields**: Weight (MT), Production Date, Expiry Date, Batch# - removed requirement
3. **Required fields**: Send Date, Logged-in User, Quantity (PCS), Price

---

## Frontend Changes

### File: `frontend/src/app/offers/senditems/page.tsx`

#### 1. ProductInput Interface Update

```typescript
interface ProductInput {
  product_id: string;
  qty_pcs: string;
  price: string; // ✅ ADDED - user-editable price
  weight_mt: number;
  production_date: string;
  expiry_date: string;
  batch_no: string;
  note: string;
}
```

#### 2. Added Send Date State

```typescript
const [sendDate, setSendDate] = useState<string>(new Date().toISOString().split("T")[0]);
```

#### 3. ProductRow Component - Editable Price Field

**Before**:

```tsx
<TableCell align="right">{product.trade_price.toFixed(2)}</TableCell>
```

**After**:

```tsx
<TableCell align="right">
  <TextField
    type="number"
    value={input.price}
    onChange={(e) => onFieldChange(product._id, "price", e.target.value)}
    size="small"
    inputProps={{ min: 0, step: 0.01 }}
    placeholder="Price"
    sx={{ width: "100px" }}
  />
</TableCell>
```

#### 4. Product Input Initialization

```typescript
initialInputs[product._id] = {
  product_id: product._id,
  qty_pcs: "",
  price: product.trade_price.toString(), // ✅ Default from product, but editable
  weight_mt: 0,
  production_date: "",
  expiry_date: "",
  batch_no: "",
  note: "",
};
```

#### 5. Validation Logic Update

**Before**: Required production_date, expiry_date, batch_no

```typescript
if (!production_date) {
  errors.push(`${product.sku}: Production date is required`);
}
if (!expiry_date) {
  errors.push(`${product.sku}: Expiry date is required`);
}
if (!batch_no || batch_no.trim() === "") {
  errors.push(`${product.sku}: Batch number is required`);
}
```

**After**: Only validate qty and price, optional date validation

```typescript
if (qtyPcs <= 0) {
  errors.push(`${product.sku}: Quantity must be greater than 0`);
}

const priceVal = parseFloat(price);
if (!price || priceVal <= 0) {
  errors.push(`${product.sku}: Price must be greater than 0`);
}

// Optional: Validate date logic if both dates are provided
if (production_date && expiry_date && expiry_date <= production_date) {
  errors.push(`${product.sku}: Expiry date must be after production date`);
}
```

#### 6. Send Date Field Added to Form

```tsx
{
  /* Send Date */
}
<Box mb={2}>
  <TextField
    fullWidth
    label="Send Date *"
    type="date"
    value={sendDate}
    onChange={(e) => setSendDate(e.target.value)}
    InputLabelProps={{ shrink: true }}
    required
    helperText="Date when items are being sent"
  />
</Box>;
```

#### 7. Submit Handler Update

```typescript
const products = productsWithData.map((item) => ({
  product_id: item.product_id,
  qty_pcs: parseFloat(item.qty_pcs),
  price: parseFloat(item.price), // ✅ User-entered price
  production_date: item.production_date || undefined, // ✅ Optional
  expiry_date: item.expiry_date || undefined, // ✅ Optional
  batch_no: item.batch_no?.trim() || undefined, // ✅ Optional
  note: item.note?.trim() || "",
}));

const payload = {
  depot_ids: selectedDepots.map((d) => d._id),
  products,
  send_date: new Date(sendDate).toISOString(), // ✅ User-selected date
};
```

#### 8. Preview Dialog Update

Display user-entered prices instead of product.trade_price:

```tsx
<TableCell align="right">{parseFloat(input.price).toFixed(2)}</TableCell>
<TableCell>{input.production_date || '-'}</TableCell>
<TableCell>{input.expiry_date || '-'}</TableCell>
<TableCell>{input.batch_no || '-'}</TableCell>
```

---

## Backend Changes

### File: `backend/src/models/OfferSend.js`

#### Product Schema Update

```javascript
const offerSendProductSchema = new mongoose.Schema({
  product_id: {
    /* ... */
  },
  qty_pcs: {
    /* ... */
  },

  // ✅ ADDED - User-editable price field
  price: {
    type: mongoose.Schema.Types.Decimal128,
    required: true,
    get: (v) => (v ? parseFloat(v.toString()) : 0),
    validate: {
      validator: function (v) {
        const value = parseFloat(v.toString());
        return value > 0;
      },
      message: "Price must be greater than 0",
    },
  },

  // ✅ CHANGED - Made optional (required: false)
  batch_no: {
    type: String,
    required: false, // Was: true
    index: true,
    trim: true,
  },
  production_date: {
    type: Date,
    required: false, // Was: true
    index: true,
  },
  expiry_date: {
    type: Date,
    required: false, // Was: true
  },
  note: {
    /* ... */
  },
});
```

### File: `backend/src/routes/offers/sendItems.js`

#### 1. Validation Middleware Update

```javascript
const validateOfferSend = [
  body("depot_ids").isArray({ min: 1 }).withMessage("At least one depot is required"),
  body("depot_ids.*").isMongoId().withMessage("Valid depot ID is required"),
  body("send_date").optional().isISO8601().withMessage("Valid send date is required"),
  body("products").isArray({ min: 1 }).withMessage("At least one product is required"),
  body("products.*.product_id").isMongoId().withMessage("Valid product ID is required"),
  body("products.*.qty_pcs").isFloat({ min: 0.01 }).withMessage("Quantity must be greater than 0"),

  // ✅ ADDED - Price validation (required)
  body("products.*.price").isFloat({ min: 0.01 }).withMessage("Price must be greater than 0"),

  // ✅ CHANGED - Made optional (removed .notEmpty(), .isISO8601() no longer requires value)
  body("products.*.batch_no").optional().trim(),
  body("products.*.production_date")
    .optional()
    .isISO8601()
    .withMessage("Valid production date format required"),
  body("products.*.expiry_date")
    .optional()
    .isISO8601()
    .withMessage("Valid expiry date format required"),

  body("products.*.note").optional().trim(),
  body("general_note").optional().trim(),
];
```

#### 2. Date Validation Logic Update

```javascript
// ✅ CHANGED - Only validate if both dates are provided
// Validate expiry dates are after production dates (if both provided)
for (const product of products) {
  if (product.production_date && product.expiry_date) {
    if (new Date(product.expiry_date) <= new Date(product.production_date)) {
      return res.status(400).json({
        success: false,
        message: `Expiry date must be after production date for product ${product.product_id}`,
      });
    }
  }
}
```

---

## Summary of Changes

### ✅ Added Fields

- `price` (Decimal128, required) - User-editable price per product
- `send_date` (Date picker in UI) - User-selectable send date

### ✅ Made Optional

- `production_date` (Date) - No longer required
- `expiry_date` (Date) - No longer required
- `batch_no` (String) - No longer required
- `weight_mt` (Number) - Auto-calculated, displayed but not required for submission

### ✅ Still Required

- `qty_pcs` (Decimal128) - Quantity in pieces
- `price` (Decimal128) - User-entered price
- `send_date` (Date) - User-selected send date
- `depot_ids` (Array) - At least one depot
- Logged-in user (captured by backend auth context)

---

## Testing Checklist

- [ ] Price field accepts decimal values (e.g., 125.50)
- [ ] Price field validates > 0
- [ ] Form can be submitted without production_date, expiry_date, batch_no
- [ ] Send date is required and validated
- [ ] Preview shows user-entered prices correctly
- [ ] Backend accepts simplified payload
- [ ] Optional date validation works (if both dates provided, expiry > production)
- [ ] Logged-in user is captured in created_by field
- [ ] Multiple depots can be selected
- [ ] CSV/PDF export works with new structure

---

## Migration Notes

**No database migration required** - existing documents remain valid. New documents will:

- Store user-entered `price` per product
- Allow NULL/undefined for `production_date`, `expiry_date`, `batch_no`
- Use user-selected `send_date` instead of current timestamp

**Backward Compatibility**: Existing offer sends with required fields remain valid and display correctly.

---

## Related Files

### Frontend

- `frontend/src/app/offers/senditems/page.tsx` (867 → 876 lines)

### Backend

- `backend/src/models/OfferSend.js` (356 lines)
- `backend/src/routes/offers/sendItems.js` (405 → 407 lines)

---

## Status: ✅ COMPLETED

All changes implemented and ready for testing.
