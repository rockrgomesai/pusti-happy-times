# Depot Stock Simplified Architecture

## Overview

The depot inventory system has been simplified to separate concerns more cleanly:

- **DepotStock** = Aggregated quantities only (one record per depot + product)
- **DepotTransactionIn** = Full batch details for incoming goods
- **DepotTransactionOut** = Full batch details for outgoing goods

## Architecture Changes

### Before (Batch-Level Tracking in Stock)

```javascript
// OLD: DepotStock had 100+ lines with batch-level detail
{
  depot_id,
  product_id,
  batch_no,              // ❌ Removed
  production_date,       // ❌ Removed
  expiry_date,          // ❌ Removed
  qty_ctn,
  location,             // ❌ Removed
  status,               // ❌ Removed
  source_type,          // ❌ Removed
  notes,                // ❌ Removed
  // ... many more fields
}
// Unique index: {depot_id, product_id, batch_no}
```

**Problems:**

- Duplicate batch information across stock and transaction tables
- Complex model with 100+ lines
- One stock record per batch = unnecessary granularity
- Batch details mixed with aggregated quantities

### After (Aggregated Stock + Transaction Details)

```javascript
// NEW: DepotStock is simple aggregation (40 lines)
{
  depot_id, product_id, qty_ctn; // Sum of all batches for this depot + product
}
// Unique index: {depot_id, product_id}
```

**Benefits:**

- Single source of truth for batch details (transactions only)
- Simple stock model for quick quantity lookups
- Clean separation of concerns
- Easier to maintain and query

## Database Collections

### 1. `depotstocks` (Aggregated Quantities)

**Purpose:** Fast lookup of current stock levels per product at each depot

**Schema:**

```javascript
{
  _id: ObjectId,
  depot_id: ObjectId,      // Reference to Facility (factory store)
  product_id: ObjectId,    // Reference to Product
  qty_ctn: Decimal128,     // Total quantity across all batches
  created_at: Date,
  updated_at: Date
}
```

**Unique Index:** `{depot_id, product_id}`

**Sample Data:**

```javascript
// Depot A + Product 1 = 25.5 ctn (sum of batches xxx:15 + xxx1:10.5)
{
  depot_id: "68f2855dbdde87d90d1b9cf5",
  product_id: "68f2855dbdde87d90d1b9e11",
  qty_ctn: 25.5
}
```

### 2. `depottransactionins` (Incoming Batch Details)

**Purpose:** Record all incoming goods with full batch information

**Schema:**

```javascript
{
  _id: ObjectId,
  depot_id: ObjectId,
  product_id: ObjectId,
  batch_no: String,           // Batch identifier
  production_date: Date,      // Production date
  expiry_date: Date,          // Expiry date
  qty_ctn: Decimal128,        // Quantity received
  balance_after_qty_ctn: Decimal128,
  transaction_type: String,   // from_production, transfer_in, etc.
  reference_type: String,     // ProductionSendToStore, etc.
  reference_id: ObjectId,
  reference_no: String,
  location: String,
  notes: String,
  // ... more transaction metadata
}
```

**Sample Data:**

```javascript
// Product 1, Batch xxx: 15 ctn received
{
  depot_id: "68f2855dbdde87d90d1b9cf5",
  product_id: "68f2855dbdde87d90d1b9e11",
  batch_no: "xxx",
  qty_ctn: 15,
  production_date: "2025-11-02",
  expiry_date: "2026-05-02"
}

// Product 1, Batch xxx1: 10.5 ctn received
{
  depot_id: "68f2855dbdde87d90d1b9cf5",
  product_id: "68f2855dbdde87d90d1b9e11",
  batch_no: "xxx1",
  qty_ctn: 10.5,
  production_date: "2025-11-02",
  expiry_date: "2026-05-02"
}
```

### 3. `depottransactionouts` (Outgoing Batch Details)

**Purpose:** Record all outgoing goods with full batch information

**Schema:** Similar to `depottransactionins` but for outgoing transactions

## Migration Results

```
OLD STRUCTURE:
factorystoreinventories: 6 records (batch-level)
factorystoreinventorytransactions: 6 records

NEW STRUCTURE:
depotstocks: 4 records (aggregated by depot + product)
depottransactionins: 6 records (all batch details preserved)
depottransactionouts: 0 records (no outgoing yet)
```

**Aggregation Example:**

- Old: 2 stock records (batch xxx: 15 ctn, batch xxx1: 10.5 ctn)
- New: 1 stock record (product total: 25.5 ctn) + 2 transaction records with batch details

## Code Changes

### 1. DepotStock Model (`backend/src/models/DepotStock.js`)

**Simplified from 150+ lines to 40 lines**

**Removed Fields:**

- batch_no, production_date, expiry_date
- location, status, min_stock_threshold
- source_type, source_reference_id, source_reference_no
- first_received_by, first_received_at
- last_updated_by, last_updated_at
- last_transaction_type, last_transaction_date
- notes, quality_notes, is_deleted

**Kept Fields:**

- depot_id, product_id, qty_ctn, timestamps

**Updated Methods:**

- `getCurrentStock()` - Returns single aggregated record
- `getLowStock()` - Uses simple qty threshold check
- `getOutOfStock()` - Shows products with qty = 0
- `getStockSummary()` - Simplified aggregation (no batch grouping)
- `addStock()` - Simple addition to aggregated quantity
- `deductStock()` - Simple subtraction with validation

**Removed Methods:**

- `getExpiringSoon()` - Should query transactions instead

### 2. Migration Script (`backend/migrate-to-depot-collections.js`)

**OLD Approach:**

```javascript
// Created one stock record per batch
for (batch in inventory) {
  DepotStock.create({
    depot_id, product_id, batch_no,
    production_date, expiry_date, qty_ctn, ...
  })
}
```

**NEW Approach:**

```javascript
// Aggregate by depot + product, create one stock record
const aggregated = {};
for (record in inventory) {
  key = depot_id + "_" + product_id;
  aggregated[key].qty_ctn += record.qty_ctn;
}

for (key in aggregated) {
  DepotStock.create({
    depot_id,
    product_id,
    qty_ctn, // Only 3 fields
  });
}
```

### 3. Receive-from-Production Route (`backend/src/routes/inventory/factoryToStore.js`)

**OLD Approach:**

```javascript
// Created/updated batch-level stock records
DepotStock.findOne({ depot_id, product_id, batch_no });
```

**NEW Approach:**

```javascript
// Find/create depot + product aggregated record (no batch_no)
DepotStock.findOne({ depot_id, product_id })

if (exists) {
  stock.addStock(qty)  // Add to aggregate
} else {
  DepotStock.create({ depot_id, product_id, qty_ctn })
}

// Batch details go to transactions only
DepotTransactionIn.create({
  depot_id, product_id, batch_no,
  production_date, expiry_date, qty_ctn, ...
})
```

### 4. Local Stock Routes (`backend/src/routes/inventory/localStock.js`)

**Endpoint Changes:**

#### GET `/api/v1/inventory/local-stock` (List all stock)

**Before:** Could show batch-level or aggregated view
**After:** Always shows aggregated view (depot + product totals)

```javascript
// Returns simple stock records
[
  { depot_id, product_id, qty_ctn: 25.5 },
  { depot_id, product_id, qty_ctn: 46 },
];
```

#### GET `/api/v1/inventory/local-stock/:productId` (Product details)

**Before:** Showed all batch-level stock records
**After:** Shows aggregated stock + batch breakdown from transactions

```javascript
{
  current_stock: { depot_id, product_id, qty_ctn: 25.5 },
  batches: [
    { batch_no: "xxx", qty: 15, production_date, expiry_date },
    { batch_no: "xxx1", qty: 10.5, production_date, expiry_date }
  ],
  summary: {
    total_qty_ctn: 25.5,
    batch_count: 2
  }
}
```

#### GET `/api/v1/inventory/local-stock/batch/:batchNo` (Batch lookup)

**Before:** Showed stock records for this batch
**After:** Shows transaction history for this batch

```javascript
{
  batch_no: "xxx",
  transactions_in: [...],   // All receipts of this batch
  transactions_out: [...],  // All dispatches of this batch
  summary: {
    total_in: 15,
    total_out: 0
  }
}
```

## Query Patterns

### Get Current Stock Quantity

```javascript
// Simple lookup - one record per depot + product
const stock = await DepotStock.findOne({ depot_id, product_id });
console.log(stock.qty_ctn); // 25.5
```

### Get Batch Details for a Product

```javascript
// Query transactions, not stock table
const batches = await DepotTransactionIn.aggregate([
  { $match: { depot_id, product_id } },
  {
    $group: {
      _id: "$batch_no",
      batch_no: { $first: "$batch_no" },
      production_date: { $first: "$production_date" },
      expiry_date: { $first: "$expiry_date" },
      total_received: { $sum: "$qty_ctn" },
    },
  },
  { $sort: { expiry_date: 1 } }, // FIFO
]);
```

### Get Expiring Soon Items

```javascript
// Query transactions, not stock table
const expiringBatches = await DepotTransactionIn.find({
  depot_id,
  expiry_date: { $lte: thirtyDaysFromNow, $gte: today },
}).sort({ expiry_date: 1 });
```

## Benefits of New Architecture

### 1. Performance

- **Stock queries:** Faster (1 record instead of N batches)
- **Batch queries:** Same speed (still query transactions)
- **Aggregations:** Simpler (no grouping needed)

### 2. Data Integrity

- **Single source of truth:** Batch details only in transactions
- **No duplication:** Production date, expiry date stored once
- **ACID compliance:** Stock updates still use MongoDB sessions

### 3. Maintainability

- **Simple model:** 40 lines vs 150+ lines
- **Clear separation:** Stock = quantities, Transactions = details
- **Easier testing:** Fewer edge cases to handle

### 4. Flexibility

- **Batch tracking:** Add new batch fields to transactions only
- **Stock queries:** Remain simple regardless of batch complexity
- **History:** Complete audit trail in transaction tables

## Migration Steps Performed

1. ✅ Simplified DepotStock model (removed 15+ fields)
2. ✅ Updated migration script to aggregate by depot + product
3. ✅ Cleared old migrated collections
4. ✅ Re-ran migration with new aggregated structure
5. ✅ Verified migration: 4 aggregated stock records, 6 transaction records
6. ✅ Updated receive-from-production route to use aggregated stock
7. ✅ Updated local-stock routes to query transactions for batch details
8. ✅ Validated all files (no errors)

## Testing Checklist

- [ ] Test production send to store (unchanged)
- [ ] Test depot receive from production (aggregated stock update)
- [ ] Test GET /inventory/local-stock (shows aggregated totals)
- [ ] Test GET /inventory/local-stock/:productId (shows batches from transactions)
- [ ] Test GET /inventory/local-stock/batch/:batchNo (shows transaction history)
- [ ] Verify stock quantities match sum of transaction quantities
- [ ] Test ACID transaction rollback on error
- [ ] Test concurrent stock updates (session-based locking)

## Next Steps

1. **Test endpoints** with Postman or Thunder Client
2. **Update frontend** to handle new response structure
3. **Add batch selection** for outgoing transactions (FIFO logic)
4. **Implement stock adjustment** routes (corrections, waste, etc.)
5. **Add dashboard queries** for expiring batches (query transactions)
6. **Consider backup** of old collections before deletion

## Files Modified

1. `backend/src/models/DepotStock.js` (150 → 40 lines)
2. `backend/migrate-to-depot-collections.js` (aggregation logic)
3. `backend/src/routes/inventory/factoryToStore.js` (receive-from-production)
4. `backend/src/routes/inventory/localStock.js` (all 3 endpoints)

## Collections Status

```
✅ depotstocks: 4 records (1 per depot+product)
✅ depottransactionins: 6 records (full batch details)
✅ depottransactionouts: 0 records (none yet)
⏸️  factorystoreinventories: 6 records (backup, can delete after testing)
⏸️  factorystoreinventorytransactions: 6 records (backup, can delete after testing)
```
