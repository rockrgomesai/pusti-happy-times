# Depot-Based Inventory Architecture - Implementation Summary

## Overview

Successfully migrated from factory-specific inventory collections to a unified depot-based architecture that treats factory stores as depots.

## Changes Made

### 1. New Models Created

#### DepotStock (`backend/src/models/DepotStock.js`)

- **Purpose**: Maintains current stock levels for each depot
- **Key Features**:
  - One record per depot + product + batch (enforced by unique index)
  - ACID transaction support via `addStock()` and `deductStock()` methods
  - Auto-status updates (active, low_stock, out_of_stock, expiring_soon, expired)
  - Static methods: `getCurrentStock()`, `getLowStock()`, `getExpiringSoon()`, `getStockSummary()`
- **Fields**: depot_id, product_id, batch_no, qty_ctn, initial_qty_ctn, location, status, expiry_date, etc.

#### DepotTransactionIn (`backend/src/models/DepotTransactionIn.js`)

- **Purpose**: Records all incoming depot transactions
- **Transaction Types**: from_production, transfer_in, return_in, adjustment_in, initial_stock
- **Key Features**:
  - Tracks balance_after_qty_ctn for audit trail
  - Reference to source documents (ProductionSendToStore, etc.)
  - Quality check status tracking
  - Static methods: `getHistory()`, `getDailySummary()`, `getPending()`

#### DepotTransactionOut (`backend/src/models/DepotTransactionOut.js`)

- **Purpose**: Records all outgoing depot transactions
- **Transaction Types**: to_distributor, transfer_out, return_to_production, adjustment_out, waste
- **Key Features**:
  - Delivery tracking (vehicle, driver, dates)
  - Destination tracking (depot or distributor)
  - Status flow: pending → approved → dispatched → delivered
  - Static methods: `getHistory()`, `getDailySummary()`, `getPendingDispatches()`

### 2. Routes Updated

#### `/inventory/factory-to-store/receive-from-production` (Updated)

**File**: `backend/src/routes/inventory/factoryToStore.js`

**Changes**:

- Now uses `DepotStock` instead of `FactoryStoreInventory`
- Now uses `DepotTransactionIn` instead of `FactoryStoreInventoryTransaction`
- **Added ACID transaction wrapper**:
  ```javascript
  const session = await mongoose.startSession();
  await session.startTransaction();
  // ... operations ...
  await session.commitTransaction();
  // Or on error: await session.abortTransaction();
  ```
- Stock updates now use `stockRecord.addStock(qty, session)` for safe concurrent updates
- All stock/transaction operations wrapped in try-catch with rollback

**Other routes in same file updated**:

- `GET /inventory/factory-to-store` - Uses `DepotStock.getStockSummary()`
- `GET /inventory/factory-to-store/transactions` - Uses `DepotTransactionIn.getHistory()`
- `GET /inventory/factory-to-store/dashboard` - Uses `DepotStock.getLowStock()`, `getExpiringSoon()`

#### `/inventory/local-stock` (New)

**File**: `backend/src/routes/inventory/localStock.js`

**Endpoints**:

1. `GET /inventory/local-stock`
   - View current stock with pagination, search, filtering
   - Parameters: `show_batches=true/false` (aggregated vs batch-level view)
   - Supports status filter, location filter, sorting
2. `GET /inventory/local-stock/:productId`
   - Get all batches for a specific product
   - Returns FIFO-sorted batches (by expiry date)
3. `GET /inventory/local-stock/batch/:batchNo`
   - Get stock for a specific batch across all products
4. `GET /inventory/local-stock/dashboard/summary`
   - Dashboard with total stock, low stock alerts, expiring items, etc.

### 3. Route Registration

**File**: `backend/src/routes/index.js`

Added:

```javascript
const inventoryLocalStockRoutes = require("./inventory/localStock");
router.use("/inventory/local-stock", inventoryLocalStockRoutes);
```

### 4. Model Exports Updated

**File**: `backend/src/models/index.js`

Added exports for:

- `DepotStock`
- `DepotTransactionIn`
- `DepotTransactionOut`

Kept legacy models for backward compatibility:

- `FactoryStoreInventory` (deprecated)
- `FactoryStoreInventoryTransaction` (deprecated)

### 5. Migration Script Created

**File**: `migrate-to-depot-collections.js` (root directory)

**Purpose**: Migrate existing data from old collections to new depot collections

**What it does**:

1. Migrates `FactoryStoreInventory` → `DepotStock`
   - Maps `facility_store_id` → `depot_id`
   - Preserves all batch, quantity, and metadata
2. Migrates `FactoryStoreInventoryTransaction` → `DepotTransactionIn` / `DepotTransactionOut`
   - Classifies transactions as IN or OUT
   - Maps transaction types appropriately
   - Preserves all references and metadata

**How to run**:

```bash
node migrate-to-depot-collections.js
```

**Safety features**:

- Checks for duplicates before inserting
- Provides detailed statistics
- Doesn't delete old collections (manual cleanup after verification)

## Key Architecture Principles Implemented

### 1. Factory Stores ARE Depots ✅

All inventory operations use `depot_id` field, which can be:

- Regular depots
- Factory stores (depots attached to factories)

### 2. Correct Collection Usage ✅

| Operation                      | Collection Used            | Old (Removed)                        |
| ------------------------------ | -------------------------- | ------------------------------------ |
| Production sends to store      | `production_send_to_store` | ✅ (unchanged)                       |
| Depot receives from production | `depot_transactions_in`    | ❌ factorystoreinventorytransactions |
| Current stock levels           | `depot_stocks`             | ❌ factorystoreinventory             |
| Stock updates                  | `depot_stocks` (ACID)      | ❌ Direct updates                    |

### 3. ACID Transactions ✅

All stock updates now use MongoDB sessions:

```javascript
const session = await mongoose.startSession();
await session.startTransaction();
try {
  await stockRecord.addStock(qty, session);
  await transaction.save({ session });
  await session.commitTransaction();
} catch (error) {
  await session.abortTransaction();
  throw error;
}
```

### 4. One Record Per Depot+Product+Batch ✅

Enforced by unique compound index:

```javascript
depotStockSchema.index({ depot_id: 1, product_id: 1, batch_no: 1 }, { unique: true });
```

## Testing Checklist

Before going live, test:

- [ ] Production send to store (should still work as before)
- [ ] Receiving goods at depot (ACID transaction test)
- [ ] Viewing local stock (aggregated view)
- [ ] Viewing local stock (batch-level view)
- [ ] Dashboard summary endpoints
- [ ] Concurrent stock updates (ACID test)
- [ ] Low stock alerts
- [ ] Expiring soon alerts
- [ ] Search and filtering on stock pages

## MongoDB Setup Note

**IMPORTANT**: ACID transactions require MongoDB to be running as a replica set.

If not using replica set yet, the code will still work but transactions won't provide ACID guarantees. To enable replica set:

1. Stop MongoDB
2. Update config to enable replica set
3. Initialize replica set: `rs.initiate()`
4. Restart application

## Migration Steps

1. **Backup database** (always!)

   ```bash
   mongodump --db pusti_happy_times --out ./backup
   ```

2. **Run migration script**

   ```bash
   node migrate-to-depot-collections.js
   ```

3. **Verify migrated data**

   - Check depot_stocks count matches factorystoreinventory
   - Check depot_transactions_in/out counts
   - Spot check a few records for accuracy

4. **Test application** with new collections

5. **Keep old collections** as backup for 30 days

6. **After verification**, drop old collections:
   ```javascript
   db.factorystoreinventories.drop();
   db.factorystoreinventorytransactions.drop();
   ```

## API Endpoints Summary

### Production (Unchanged)

- `POST /api/production/send-to-store` - Create shipment
- `GET /api/production/send-to-store` - List shipments

### Inventory (Updated/New)

- `POST /api/inventory/factory-to-store/receive-from-production` - Receive goods ✅ UPDATED
- `GET /api/inventory/factory-to-store/pending-receipts` - Pending shipments ✅ UPDATED
- `GET /api/inventory/factory-to-store` - Inventory levels ✅ UPDATED
- `GET /api/inventory/factory-to-store/transactions` - Transaction history ✅ UPDATED
- `GET /api/inventory/factory-to-store/dashboard` - Dashboard data ✅ UPDATED
- `GET /api/inventory/local-stock` - Local stock view ⭐ NEW
- `GET /api/inventory/local-stock/:productId` - Product batches ⭐ NEW
- `GET /api/inventory/local-stock/batch/:batchNo` - Batch details ⭐ NEW
- `GET /api/inventory/local-stock/dashboard/summary` - Stock summary ⭐ NEW

## Files Created/Modified

### Created:

1. `backend/src/models/DepotStock.js` - Stock model
2. `backend/src/models/DepotTransactionIn.js` - Incoming transactions
3. `backend/src/models/DepotTransactionOut.js` - Outgoing transactions
4. `backend/src/routes/inventory/localStock.js` - Local stock routes
5. `migrate-to-depot-collections.js` - Migration script

### Modified:

1. `backend/src/routes/inventory/factoryToStore.js` - Updated to use depot models
2. `backend/src/routes/index.js` - Added local-stock route
3. `backend/src/models/index.js` - Added depot model exports

## Next Steps

1. Run the migration script to populate new collections
2. Test all inventory endpoints thoroughly
3. Update frontend components to use new API responses (if needed)
4. Set up MongoDB replica set for ACID transactions
5. Monitor performance and add indexes as needed
6. After 30 days of successful operation, remove old collections

## Benefits of New Architecture

✅ **Unified depot handling** - Factory stores treated as depots
✅ **ACID compliance** - No race conditions on stock updates
✅ **Better scalability** - Proper indexing and compound keys
✅ **Clearer separation** - IN and OUT transactions separate
✅ **Rich querying** - Better support for reports and analytics
✅ **Audit trail** - balance_after tracking on every transaction
✅ **Future-proof** - Easy to add new transaction types or depot types
