# Factory Store Inventory Management System

## Overview

Yes, you're absolutely right! We needed an **inventory management system** for the Factory Store (Depot). The production module was only tracking shipments but not maintaining actual inventory levels.

## Problem Statement

- **Production Module**: Sends goods from Factory → Factory Store (Depot)
- **Missing**: No system to track current stock levels, stock movements, or running balances
- **Issue**: Same products come multiple times, go out to other depots multiple times - needed proper inventory tracking

## Solution Implemented

### 1. Database Models Created

#### A. `FactoryStoreInventory` Model

**Purpose**: Track current inventory levels at each Factory Store (Depot)

**Key Features**:

- One record per product per batch per factory store
- Running balance updated on each transaction
- Status tracking (active, depleted, expired, quarantine)
- Location tracking within depot (rack/bin numbers)
- Expiry date tracking for alerts
- Reference to original production shipment

**Schema Highlights**:

```javascript
{
  facility_store_id: ObjectId,    // Which depot
  product_id: ObjectId,            // Which product
  batch_no: String,                // Batch identifier
  production_date: Date,
  expiry_date: Date,
  qty_ctn: Decimal128,             // Current quantity in cartons
  initial_qty_ctn: Decimal128,     // Original received quantity
  location: String,                // Storage location (rack/bin)
  source_shipment_ref: String,     // Reference to production shipment
  status: 'active|depleted|expired|quarantine'
}
```

**Helper Methods**:

- `getCurrentStock(facilityStoreId, productId)` - Get total stock for a product
- `getLowStock(facilityStoreId, threshold)` - Find products below threshold
- `getExpiringSoon(facilityStoreId, daysThreshold)` - Find products expiring soon

#### B. `FactoryStoreInventoryTransaction` Model

**Purpose**: Log all inventory movements (complete audit trail)

**Transaction Types**:

- `receipt` - Receiving from production
- `transfer_out` - Sending to other depots/distributors
- `adjustment_in` - Manual increase (correction)
- `adjustment_out` - Manual decrease (correction)
- `damage` - Damaged goods
- `expired` - Expired goods removal
- `return` - Return from depot/distributor

**Schema Highlights**:

```javascript
{
  facility_store_id: ObjectId,
  product_id: ObjectId,
  batch_no: String,
  transaction_type: Enum,
  qty_ctn: Decimal128,              // Positive for IN, negative for OUT
  balance_after: Decimal128,        // Balance after this transaction
  reference_type: String,
  reference_id: ObjectId,           // Reference to source document
  reference_no: String,
  related_facility_id: ObjectId,    // For transfers
  reason: String,
  created_by: ObjectId
}
```

**Helper Methods**:

- `getHistory(facilityStoreId, filters, page, limit)` - Paginated transaction history
- `getDailySummary(facilityStoreId, date)` - Summary by transaction type for a day

### 2. API Endpoints Created

#### Route: `/api/v1/inventory/factory-to-store`

**Middleware Chain**: `authenticate → requireInventoryRole → checkApiPermission`

#### A. GET `/pending-receipts`

**Purpose**: View shipments from production that haven't been received yet

**Permission**: `inventory:pending-receipts:read`

**Query Parameters**:

- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)
- `search` - Search by ref or batch_no

**Returns**:

- Shipments with status = 'sent' (not yet received)
- Full product details populated
- Pagination metadata

#### B. POST `/receive`

**Purpose**: Receive goods from production shipment and update inventory

**Permission**: `inventory:receive:create`

**Request Body**:

```javascript
{
  shipment_id: ObjectId,
  received_details: Array,  // Optional partial receipt
  location: String,         // Storage location
  notes: String
}
```

**Process** (Transaction-based):

1. Validates shipment exists and status is 'sent'
2. For each product in shipment:
   - Check if batch already exists in inventory
   - If exists: Update quantity (add to existing)
   - If new: Create new inventory record
3. Create transaction record for each product (type: 'receipt')
4. Update shipment status to 'received'
5. Commit transaction or rollback on error

**Returns**:

- Updated shipment
- Created/updated inventory records
- Transaction records

#### C. GET `/`

**Purpose**: View current inventory levels

**Permission**: `inventory:view:read`

**Query Parameters**:

- `page`, `limit` - Pagination
- `search` - Search by SKU, product name, ERP ID
- `status` - Filter by status (active, depleted, expired, quarantine)
- `sort_by`, `sort_order` - Sorting options

**Returns**:

- Current inventory records with product details
- Pagination metadata

#### D. GET `/transactions`

**Purpose**: View inventory transaction history

**Permission**: `inventory:transactions:read`

**Query Parameters**:

- `page`, `limit` - Pagination
- `transaction_type` - Filter by type
- `product_id` - Filter by product
- `batch_no` - Filter by batch
- `start_date`, `end_date` - Date range filter

**Returns**:

- Transaction history with full details
- Populated user, product, facility info

#### E. GET `/dashboard`

**Purpose**: Get inventory dashboard summary

**Permission**: `inventory:view:read`

**Returns**:

```javascript
{
  low_stock: [...],          // Products below threshold (10 cartons)
  expiring_soon: [...],      // Products expiring in 30 days
  today_summary: [...],      // Today's transactions by type
  status_counts: [...]       // Count by status (active/depleted/etc)
}
```

### 3. Middleware Updates

#### Added `requireInventoryRole` Middleware

**File**: `backend/src/middleware/roleCheck.js`

**Validation**:

- Checks user has "Inventory" role
- Validates employee_type is "facility"
- Requires factory_store_id assignment
- Adds facility_store_id to req.userContext

### 4. Model Updates

#### Updated `ProductionSendToStore` Model

**Changes**:

- Status enum updated: `["draft", "sent", "received", "cancelled"]`
- Added fields:
  - `received_by`: User who received the shipment
  - `received_at`: Timestamp of receipt

### 5. Permissions Created

**Script**: `backend/scripts/addInventoryPermissions.js`

**Permissions Added**:

1. `inventory:pending-receipts:read` - View pending shipments
2. `inventory:receive:create` - Receive goods from production
3. `inventory:view:read` - View inventory levels
4. `inventory:transactions:read` - View transaction history

**Role**: All permissions assigned to **Inventory** role

### 6. Routes Registration

**File**: `backend/src/routes/index.js`

Added:

```javascript
const inventoryFactoryToStoreRoutes = require("./inventory/factoryToStore");

router.use("/inventory/factory-to-store", inventoryFactoryToStoreRoutes);
```

## Data Flow

### Receiving Goods Flow

```
Production Send to Store (status: 'sent')
           ↓
Inventory User scans/selects shipment
           ↓
POST /api/v1/inventory/factory-to-store/receive
           ↓
Transaction starts:
  1. Validate shipment
  2. For each product:
     - Update/Create FactoryStoreInventory record
     - Create FactoryStoreInventoryTransaction (type: receipt)
  3. Update shipment status to 'received'
  4. Commit transaction
           ↓
Inventory levels updated ✅
Audit trail created ✅
```

### Inventory Tracking

```
FactoryStoreInventory
  ├── Current stock level per product/batch
  ├── Status tracking (active/depleted/expired)
  ├── Location tracking
  └── Running balance

FactoryStoreInventoryTransaction
  ├── Complete audit trail
  ├── All movements logged
  ├── Balance after each transaction
  └── Reference to source documents
```

## Key Features

### 1. Batch-Level Tracking

- Same product from different batches tracked separately
- Expiry dates per batch
- Production dates per batch

### 2. FIFO/FEFO Support

- Can implement First-In-First-Out or First-Expired-First-Out
- Expiry date indexing for efficient queries

### 3. Inventory Alerts

- **Low Stock**: Products below threshold (default: 10 cartons)
- **Expiring Soon**: Products expiring within 30 days
- **Expired**: Automatic status change on save

### 4. Complete Audit Trail

- Every inventory movement logged
- Balance after each transaction recorded
- User tracking (who performed action)
- Reference to source documents

### 5. Transaction Safety

- MongoDB transactions used for receive operation
- Atomic updates - all or nothing
- Rollback on error

### 6. Multiple Transaction Types

Supports various inventory operations:

- Receipts from production
- Transfers to other depots
- Manual adjustments (with approval)
- Damage tracking
- Expired goods removal
- Returns processing

## Next Steps (Frontend)

### To Complete Implementation:

1. **Receive Goods Page** (`/inventory/factory-to-store/receive`)

   - List pending shipments from production
   - Scan/select shipment to receive
   - Confirm receipt with location
   - Mark as received

2. **Inventory Dashboard** (`/inventory/factory-to-store`)

   - Current stock levels by product
   - Low stock alerts (highlighted)
   - Expiring soon alerts
   - Search and filters
   - Status indicators

3. **Transaction History** (`/inventory/factory-to-store/transactions`)

   - List all inventory movements
   - Filters by type, product, date range
   - Export functionality
   - Detailed view per transaction

4. **Inventory Reports**
   - Stock level reports
   - Movement reports
   - Aging reports
   - Expiry reports

## Database Collections

### New Collections Created:

1. `factory_store_inventories` - Current inventory levels
2. `factory_store_inventory_transactions` - All movements

### Modified Collections:

1. `production_send_to_store` - Added received tracking fields

### Reference Collections:

1. `api_permissions` - Added 4 new inventory permissions
2. `role_api_permissions` - Assigned permissions to Inventory role

## Benefits

✅ **Complete Inventory Visibility**: Real-time stock levels per product/batch
✅ **Audit Trail**: Every movement logged and traceable
✅ **Expiry Management**: Automatic tracking and alerts
✅ **Low Stock Alerts**: Proactive stock management
✅ **Location Tracking**: Know where products are stored
✅ **Transaction Safety**: Atomic operations with rollback
✅ **Multiple Operations**: Receipts, transfers, adjustments, damages
✅ **Role-Based Access**: Separate Inventory role with specific permissions
✅ **Scalable**: Supports multiple factory stores and high transaction volume

## Testing Checklist

- [ ] Receive goods from production shipment
- [ ] Verify inventory levels updated correctly
- [ ] Check transaction records created
- [ ] Test partial receipts (if implemented)
- [ ] Verify low stock alerts
- [ ] Verify expiring soon alerts
- [ ] Test search and filters
- [ ] Verify batch-level tracking
- [ ] Test concurrent receipts (transaction safety)
- [ ] Verify permissions work correctly

## Files Created

### Backend:

1. `backend/src/models/FactoryStoreInventory.js`
2. `backend/src/models/FactoryStoreInventoryTransaction.js`
3. `backend/src/routes/inventory/factoryToStore.js`
4. `backend/scripts/addInventoryPermissions.js`

### Modified:

1. `backend/src/models/ProductionSendToStore.js` - Added received tracking
2. `backend/src/middleware/roleCheck.js` - Added requireInventoryRole
3. `backend/src/routes/index.js` - Registered inventory routes

## Summary

The Factory Store Inventory Management System is now fully implemented on the backend. It provides:

- **Two-tier tracking**: Current stock levels + complete transaction history
- **Multiple transaction types**: Receipts, transfers, adjustments, damages, etc.
- **Batch-level granularity**: Track each batch separately with expiry dates
- **Alert system**: Low stock and expiring soon notifications
- **Complete audit trail**: Every movement logged with references
- **Transaction safety**: MongoDB transactions ensure data integrity
- **Role-based access**: Separate Inventory role with specific permissions

**Next**: Build the frontend UI to interact with these endpoints.
