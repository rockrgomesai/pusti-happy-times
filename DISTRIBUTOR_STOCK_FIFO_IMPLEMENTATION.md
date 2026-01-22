# DISTRIBUTOR STOCK FIFO IMPLEMENTATION

**Implementation Date:** January 19, 2026  
**Status:** ✅ Complete  
**Priority:** High

---

## 📋 OVERVIEW

This document describes the implementation of FIFO (First-In-First-Out) inventory costing for Distributor Stock management. The system now tracks multiple price points for the same SKU, allowing accurate cost of goods sold (COGS) calculation based on the order items were received.

---

## 🎯 BUSINESS REQUIREMENT

**Problem:**

- Product prices change over time (db_price in Product model)
- Distributors receive stock at different prices on different dates
- When distributors sell products, we need to know the actual cost (FIFO method)
- Previous system only tracked aggregate quantity without price history

**Solution:**

- Implement FIFO batch tracking
- Store price at the time of receipt for each batch
- Automatically calculate COGS when stock is reduced
- Maintain price history for financial reporting

---

## 🏗️ SCHEMA CHANGES

### DistributorStock Model (Updated)

**File:** `backend/src/models/DistributorStock.js`

#### New Structure:

```javascript
{
  distributor_id: ObjectId,
  sku: String,
  qty: Decimal128,           // Total quantity (aggregate)
  batches: [                  // NEW: Array of FIFO batches
    {
      batch_id: String,       // Unique batch identifier
      qty: Decimal128,        // Quantity in this batch
      unit_price: Decimal128, // Price at time of receipt
      received_at: Date,      // Receipt timestamp (for FIFO ordering)
      chalan_id: ObjectId,    // Reference to delivery chalan
      chalan_no: String       // Chalan number for tracking
    }
  ],
  last_received_at: Date,
  last_chalan_id: ObjectId
}
```

#### Batch ID Format:

```
YYYYMMDD-HHMMSS-XXXXX
Example: 20260119-143022-AB3F9
```

---

## 🔧 NEW METHODS

### 1. `addStockFIFO(quantity, unitPrice, chalanId, chalanNo)`

Adds new stock batch with current price.

**Parameters:**

- `quantity` (Number): Quantity to add
- `unitPrice` (Number): Current product price (from Product.db_price)
- `chalanId` (ObjectId): Delivery chalan reference
- `chalanNo` (String): Chalan number

**Returns:** Created batch object

**Example:**

```javascript
const stock = await DistributorStock.findOne({ distributor_id, sku });
stock.addStockFIFO(100, 25.5, chalanId, "CHN-2026-001");
await stock.save();
```

**Behavior:**

- Creates new batch with unique ID
- Adds batch to batches array
- Updates total quantity
- Updates last_received_at and last_chalan_id

---

### 2. `reduceStockFIFO(quantityToReduce)`

Reduces stock using FIFO method (oldest batches first).

**Parameters:**

- `quantityToReduce` (Number): Quantity to remove

**Returns:**

```javascript
{
  success: Boolean,
  costOfGoodsSold: Number,      // Total COGS for items removed
  batchesUsed: [                // Details of batches used
    {
      batch_id: String,
      qty_used: Number,
      unit_price: Number,
      cost: Number,
      received_at: Date
    }
  ],
  message: String
}
```

**Example:**

```javascript
const stock = await DistributorStock.findOne({ distributor_id, sku });
const result = stock.reduceStockFIFO(50);

if (result.success) {
  console.log(`COGS: ${result.costOfGoodsSold}`);
  console.log(`Batches used: ${result.batchesUsed.length}`);
  await stock.save();
}
```

**Behavior:**

- Sorts batches by received_at (oldest first)
- Deducts from oldest batches first
- Calculates weighted COGS
- Removes empty batches automatically
- Updates total quantity
- Returns failure if insufficient stock

---

### 3. `getWeightedAverageCost()`

Calculates weighted average unit price of current stock.

**Parameters:** None

**Returns:** Number (weighted average unit price)

**Example:**

```javascript
const stock = await DistributorStock.findOne({ distributor_id, sku });
const avgCost = stock.getWeightedAverageCost();
console.log(`Average cost per unit: ${avgCost}`);
```

**Use Cases:**

- Inventory valuation reports
- Profit margin calculations
- Budget forecasting

---

## 🔄 INTEGRATION POINTS

### 1. Chalan Receiving (Updated)

**File:** `backend/src/routes/distributor/chalans.js` (Line ~234)

**Changes:**

- Fetch current product price (db_price or trade_price)
- Create/find distributor stock record
- Use `addStockFIFO()` method instead of simple increment
- Store price at time of receipt

**Code:**

```javascript
// Get current product price
const product = await models.Product.findOne({ sku }).select("db_price trade_price");
const unitPrice = parseFloat(product.db_price || product.trade_price || 0);

// Find or create stock record
let distributorStock = await models.DistributorStock.findOne({ distributor_id, sku });
if (!distributorStock) {
  distributorStock = new models.DistributorStock({ distributor_id, sku, qty: 0, batches: [] });
}

// Add stock with FIFO
distributorStock.addStockFIFO(receivedQty, unitPrice, chalan._id, chalan.chalan_no);
await distributorStock.save({ session });
```

---

### 2. Secondary Sales (Future Integration)

When distributors sell to retailers (secondary sales), use `reduceStockFIFO()`:

```javascript
// Example: Record secondary sale
const stock = await DistributorStock.findOne({ distributor_id, sku });
const result = stock.reduceStockFIFO(soldQuantity);

if (result.success) {
  // Record COGS for profit calculation
  const revenue = soldQuantity * sellingPrice;
  const profit = revenue - result.costOfGoodsSold;

  await stock.save();

  // Create sales transaction with COGS
  await SecondarySales.create({
    distributor_id,
    sku,
    qty: soldQuantity,
    revenue,
    cogs: result.costOfGoodsSold,
    profit,
    batches_used: result.batchesUsed,
  });
}
```

---

## 📊 FIFO EXAMPLE

### Scenario:

**Stock Receipts:**

1. Jan 1: Receive 100 units @ $20/unit (Batch A)
2. Jan 10: Receive 150 units @ $22/unit (Batch B)
3. Jan 20: Receive 80 units @ $24/unit (Batch C)

**Current Stock:**

```javascript
{
  qty: 330,
  batches: [
    { batch_id: 'A', qty: 100, unit_price: 20, received_at: '2026-01-01' },
    { batch_id: 'B', qty: 150, unit_price: 22, received_at: '2026-01-10' },
    { batch_id: 'C', qty: 80, unit_price: 24, received_at: '2026-01-20' }
  ]
}
```

**Sale: 180 units**

**FIFO Calculation:**

1. Use 100 units from Batch A @ $20 = $2,000
2. Use 80 units from Batch B @ $22 = $1,760
3. **Total COGS = $3,760**

**Remaining Stock:**

```javascript
{
  qty: 150,
  batches: [
    { batch_id: 'B', qty: 70, unit_price: 22, received_at: '2026-01-10' },
    { batch_id: 'C', qty: 80, unit_price: 24, received_at: '2026-01-20' }
  ]
}
```

---

## 🔧 MIGRATION

### Migration Script

**File:** `migrate-distributor-stock-to-fifo.js`

**Purpose:** Convert existing stock records to FIFO format

**What it does:**

1. Finds all DistributorStock records
2. For each record with quantity > 0:
   - Gets current product price
   - Creates a single batch with current quantity
   - Uses last_received_at as batch date
   - Saves updated record

**How to run:**

```bash
node migrate-distributor-stock-to-fifo.js
```

**Output:**

```
✅ Successfully migrated: 250
⏭️  Skipped (already migrated or zero qty): 45
❌ Errors: 0
📊 Total processed: 295
```

**Important:**

- Run ONCE before deploying new code
- Backs up data in transaction
- Skips records already migrated
- Safe to re-run (idempotent)

---

## 🧪 TESTING

### Test Cases

#### 1. Add Stock (Different Prices)

```javascript
const stock = new DistributorStock({ distributor_id, sku: "SKU001", qty: 0 });

stock.addStockFIFO(100, 20, chalan1, "CHN-001");
stock.addStockFIFO(150, 22, chalan2, "CHN-002");

console.log(stock.qty); // 250
console.log(stock.batches.length); // 2
```

#### 2. Reduce Stock (FIFO)

```javascript
const result = stock.reduceStockFIFO(120);

console.log(result.success); // true
console.log(result.costOfGoodsSold); // 2440 (100*20 + 20*22)
console.log(result.batchesUsed.length); // 2
console.log(stock.qty); // 130
console.log(stock.batches.length); // 1
```

#### 3. Insufficient Stock

```javascript
const result = stock.reduceStockFIFO(200);

console.log(result.success); // false
console.log(result.message); // "Insufficient stock..."
```

#### 4. Weighted Average

```javascript
// Stock: 100@20, 150@22
const avg = stock.getWeightedAverageCost();
console.log(avg); // 21.2 ((100*20 + 150*22) / 250)
```

---

## 📈 REPORTING QUERIES

### 1. Stock Valuation Report

```javascript
const stockValuation = await DistributorStock.aggregate([
  { $match: { distributor_id: ObjectId(distributorId) } },
  {
    $project: {
      sku: 1,
      qty: 1,
      total_value: {
        $reduce: {
          input: "$batches",
          initialValue: 0,
          in: {
            $add: [
              "$$value",
              { $multiply: [{ $toDouble: "$$this.qty" }, { $toDouble: "$$this.unit_price" }] },
            ],
          },
        },
      },
    },
  },
  { $group: { _id: null, total_qty: { $sum: "$qty" }, total_value: { $sum: "$total_value" } } },
]);
```

### 2. Batch Age Analysis

```javascript
const batchAge = await DistributorStock.aggregate([
  { $unwind: "$batches" },
  {
    $project: {
      sku: 1,
      batch_id: "$batches.batch_id",
      qty: "$batches.qty",
      age_days: {
        $divide: [{ $subtract: [new Date(), "$batches.received_at"] }, 1000 * 60 * 60 * 24],
      },
    },
  },
  { $match: { age_days: { $gt: 30 } } }, // Batches older than 30 days
  { $sort: { age_days: -1 } },
]);
```

### 3. Price History Report

```javascript
const priceHistory = await DistributorStock.aggregate([
  { $match: { sku: "SKU001" } },
  { $unwind: "$batches" },
  {
    $project: {
      batch_id: "$batches.batch_id",
      qty: "$batches.qty",
      unit_price: "$batches.unit_price",
      received_at: "$batches.received_at",
      chalan_no: "$batches.chalan_no",
    },
  },
  { $sort: { received_at: -1 } },
]);
```

---

## ⚠️ IMPORTANT NOTES

### Price Source Priority

When receiving stock, price is fetched in this order:

1. `Product.db_price` (Distributor price)
2. `Product.trade_price` (Fallback)
3. `0` (if product not found - logged as warning)

### Transaction Safety

- All stock updates use MongoDB sessions
- FIFO operations are atomic
- Failed transactions rollback completely

### Performance Considerations

- Batches array grows over time
- Consider archiving old batches (future enhancement)
- Indexed on `received_at` for FIFO sorting
- Aggregate queries may need optimization for large datasets

### Data Integrity

- Total `qty` field maintained for quick access
- Automatically synchronized when using provided methods
- Direct MongoDB updates should be avoided

---

## 🔮 FUTURE ENHANCEMENTS

### 1. Batch Archiving

Archive batches older than X days to separate collection:

```javascript
{
  distributor_id,
  sku,
  archived_batches: [...],
  archived_at: Date
}
```

### 2. Lot/Serial Number Tracking

Add lot numbers for enhanced traceability:

```javascript
{
  batch_id: String,
  lot_number: String,    // NEW
  serial_numbers: [],    // NEW (for serialized items)
  ...
}
```

### 3. Expiry Date Tracking

Track expiry dates for FEFO (First-Expired-First-Out):

```javascript
{
  batch_id: String,
  expiry_date: Date,     // NEW
  ...
}
```

### 4. Multi-Currency Support

Support different currencies for imports:

```javascript
{
  batch_id: String,
  unit_price: Decimal128,
  currency: String,      // NEW (default: 'BDT')
  exchange_rate: Decimal128  // NEW
}
```

---

## 📞 SUPPORT

For questions or issues related to FIFO implementation:

- Review this documentation
- Check migration script logs
- Test with small datasets first
- Contact development team for assistance

---

**END OF DOCUMENT**
