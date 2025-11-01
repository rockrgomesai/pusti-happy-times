# Production "Send to Store" Module - Implementation Complete

## Overview

Implemented a complete Production module allowing factory Production employees to send manufactured products from the factory to the factory store (depot).

## ✅ Completed Components

### Backend Implementation

1. **MongoDB Schema** (`backend/src/models/ProductionSendToStore.js`)

   - Master-detail structure for shipments
   - Auto-generated reference numbers: `prod-YYYYMMDD-###`
   - Fields: ref, user_id, facility_id, factory_store_id, details array, audit fields
   - Detail fields: product_id, qty (Decimal128), production_date, expiry_date, batch_no, note
   - Validation: MANUFACTURED products only, expiry > production date
   - Indexes: batch_no, product_id, created_at, facility_id

2. **Role-Based Middleware** (`backend/src/middleware/roleCheck.js`)

   - `requireRole(roles)`: Generic role checker
   - `requireProductionRole()`: Specific for Production role
     - Validates user has Production role
     - Validates employee_type = 'facility'
     - Validates facility_id (Factory) and factory_store_id (Depot) exist
     - Adds context to req.userContext

3. **API Routes** (`backend/src/routes/production/sendToStore.js`)

   - POST `/production/send-to-store` - Create shipment
   - GET `/production/send-to-store` - List shipments (paginated, filtered)
   - GET `/production/send-to-store/:id` - Get single shipment
   - PUT `/production/send-to-store/:id` - Update shipment
   - DELETE `/production/send-to-store/:id` - Cancel shipment (soft delete)
   - GET `/production/batch-check` - Check batch number availability
   - All routes protected by `requireProductionRole` middleware
   - API permissions: `production:send-to-store:{read,create,update,delete}`

4. **Products API Enhancement** (`backend/src/routes/product/products.js`)

   - GET `/products/manufactured/by-category` - Returns MANUFACTURED products grouped by category/subcategory
   - Includes: \_id, sku, erp_id, bangla_name, english_name, unit_pcs_per_ctn, unit_weight_kg
   - Sorted by category > subcategory > product name

5. **Routes Registration** (`backend/src/routes/index.js`)
   - Registered `/production/send-to-store` routes

### Frontend Implementation

1. **Main Page** (`frontend/src/app/production/sendtostore/page.tsx`)
   - Complete React component with TypeScript
   - Role validation: Redirects if not Production role
   - Context validation: Shows error if facility_id or factory_store_id missing
2. **Features Implemented:**
   - **Product Loading**: Fetches MANUFACTURED products grouped by category/subcategory
   - **Accordion UI**: One accordion per category/subcategory with product table
   - **Input Fields**:
     - SKU, ERP ID (read-only display)
     - Product name (Bangla/English)
     - Pcs/CTN (read-only)
     - Qty (CTN) - decimal input
     - Qty (PCs) - auto-calculated
     - Wt (MT) - auto-calculated
     - Production Date - DatePicker
     - Expiry Date - DatePicker
     - Batch # - text input
     - Note - textarea
   - **Auto-Calculations**:
     - Qty (PCs) = Qty (CTN) × unit_pcs_per_ctn
     - Wt (MT) = Qty (PCs) × unit_weight_kg / 1000
   - **Validation**:
     - Qty > 0
     - Production date < Expiry date
     - Batch number required
   - **Preview Dialog**:
     - Shows all entered products in table format
     - Displays summary (total items, qty, weight)
     - Editable fields before submission
     - Cancel or Submit actions
   - **Submit Logic**:
     - Prepares payload with only products having data
     - POSTs to `/production/send-to-store`
     - Shows success message with ref number
     - Clears form on success
   - **Error Handling**:
     - Toast notifications for errors
     - Loading states for async operations
     - Inline validation errors

### Seed Scripts

1. **Production Role** (`backend/scripts/createProductionRole.js`)

   - Creates "Production" role in database
   - Status: ✅ Executed successfully

2. **Menu & Permissions** (`backend/scripts/seedProductionMenu.js`)

   - Creates sidebar menu items
   - Creates API permissions
   - Creates page permissions
   - Assigns to Production role
   - Status: ⚠️ Needs manual adjustment due to database schema validation

3. **Simplified Seed** (`backend/scripts/seedProductionSimple.js`)
   - Direct database operations
   - Status: ⚠️ Partially complete (menu items created)

## 📋 Manual Setup Required

### Menu Items (can be added through admin UI):

1. **Parent Menu**:

   - Label: "Production"
   - Path: null
   - Icon: FaIndustry
   - Order: 60

2. **Child Menu**:
   - Label: "Send to Store"
   - Path: "/production/sendtostore"
   - Icon: FaTruck
   - Order: 1
   - Parent: Production menu

### API Permissions (can be added through admin UI):

- `production:send-to-store:read`
- `production:send-to-store:create`
- `production:send-to-store:update`
- `production:send-to-store:delete`

### Page Permission:

- Path: `/production/sendtostore`
- Name: "Production - Send to Store"

### Role Assignments:

Assign all above menus and permissions to "Production" role.

## 🧪 Testing Checklist

### Prerequisites:

1. Production role exists ✅
2. Factory facility exists with type="Factory"
3. Depot facility exists with type="Depot"
4. Employee with:
   - employee_type = "facility"
   - facility_id = Factory ID
   - factory_store_id = Depot ID
5. User linked to above employee with Production role
6. MANUFACTURED products exist in database

### Test Steps:

1. **Login as Production User**

   - Verify JWT token includes facility_id and factory_store_id
   - Check token payload in browser DevTools

2. **Navigate to /production/sendtostore**

   - Should see page (not redirected)
   - Should see facility info chips at top
   - Should see product accordions grouped by category

3. **Enter Product Data**

   - Expand an accordion
   - Enter Qty (CTN) for a product
   - Verify Qty (PCs) and Wt (MT) auto-calculate
   - Select production date and expiry date
   - Enter batch number
   - Add note (optional)

4. **Validation**

   - Try to preview with no data → Should show warning
   - Try to preview with missing required fields → Should show errors
   - Try expiry date before production date → Should show error

5. **Preview**

   - Click "Preview" button
   - Verify dialog shows all entered products
   - Check summary calculations
   - Verify data is correct

6. **Submit**

   - Click "Submit" in preview dialog
   - Should show loading state
   - On success: Should show ref number (e.g., prod-20251101-001)
   - Form should clear
   - Toast notification should appear

7. **Verify in Database**

   ```javascript
   db.production_send_to_store.find().sort({ created_at: -1 }).limit(1);
   ```

   - Check ref number format
   - Check facility_id and factory_store_id match user's context
   - Check details array has correct products
   - Check all validations passed

8. **API Tests**
   - GET `/production/send-to-store` - List shipments
   - GET `/production/send-to-store/:id` - View single shipment
   - PUT `/production/send-to-store/:id` - Update shipment
   - DELETE `/production/send-to-store/:id` - Cancel shipment

## 🔧 Configuration

### Environment Variables

No additional environment variables required. Uses existing MongoDB and Redis connections.

### Permissions Required

Production role users need:

- API: `production:send-to-store:*`
- API: `products:read` (to fetch products)
- Page: `/production/sendtostore`
- Menu: Production > Send to Store

## 📊 Database Collections

### Main Collection: `production_send_to_store`

Sample document:

```json
{
  "_id": ObjectId("..."),
  "ref": "prod-20251101-001",
  "user_id": ObjectId("..."),
  "facility_id": ObjectId("..."),
  "facility_store_id": ObjectId("..."),
  "details": [
    {
      "product_id": ObjectId("..."),
      "qty": NumberDecimal("10.50"),
      "production_date": ISODate("2025-11-01T00:00:00Z"),
      "expiry_date": ISODate("2026-11-01T00:00:00Z"),
      "batch_no": "BATCH-2025-001",
      "note": "Quality checked"
    }
  ],
  "status": "submitted",
  "created_by": ObjectId("..."),
  "updated_by": ObjectId("..."),
  "created_at": ISODate("..."),
  "updated_at": ISODate("...")
}
```

## 🚀 Deployment Notes

1. Ensure MongoDB indexes are created (model handles this automatically)
2. Run seed scripts to create role and permissions
3. Manually add menu items and assign permissions through admin UI
4. Restart backend server to load new routes
5. Frontend will automatically pick up new routes

## 📝 Future Enhancements

1. Add list/history view for shipments
2. Add search and filter capabilities
3. Add export to Excel functionality
4. Add print shipment receipt
5. Add QR code for batch tracking
6. Add notification when shipment received at depot
7. Add inventory integration (auto-update stock levels)
8. Add approval workflow for large shipments

## 🎯 Key Features

- ✅ Auto-generated sequential reference numbers
- ✅ Auto-calculation of quantities and weights
- ✅ Comprehensive validation (dates, quantities, batch numbers)
- ✅ Role-based access control
- ✅ Grouped product display by category
- ✅ Preview before submission
- ✅ Editable preview data
- ✅ Success feedback with ref number
- ✅ Error handling with user-friendly messages
- ✅ JWT token integration for facility context
- ✅ Pagination support in list API
- ✅ Soft delete (cancel) functionality
- ✅ Batch number uniqueness checking

## 📞 Support

For issues or questions:

1. Check browser console for errors
2. Check backend logs for API errors
3. Verify user has correct role and facility assignments
4. Verify menu and permissions are properly assigned

---

**Implementation Date**: November 1, 2025  
**Status**: ✅ Backend Complete | ✅ Frontend Complete | ⚠️ Seed Scripts Partial  
**Ready for Testing**: Yes (after manual menu/permission setup)
