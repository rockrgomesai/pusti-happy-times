# Multi-Tier Inventory Management Architecture

## Problem Statement

You have a complex distribution network:

- **Multiple Factory Depot Stores** (at production facilities)
- **Multiple Regional Depots** (near distributors)
- **Distributor Warehouses** (owned by distributors)
- Constant transfers between all levels
- Need: Performant system handling thousands of transactions daily

## Solution: Unified Store Inventory System

### Architecture Decision: ✅ Single Unified Model

**Recommendation**: Use ONE inventory system for ALL store types, NOT separate systems per level.

**Rationale**:

1. **Simpler code maintenance** - One codebase, one logic
2. **Flexible transfers** - Any store can transfer to any other store
3. **Unified reporting** - Single source of truth for all inventory
4. **Better performance** - Optimized indexes work across all stores
5. **Scalability** - Add new store types without code changes

## Database Schema Design

### 1. `Facility` Collection (Already Exists)

```javascript
{
  _id: ObjectId,
  name: String,
  facility_type: 'factory' | 'factory_store' | 'regional_depot' | 'distributor_warehouse',
  parent_facility_id: ObjectId,     // Hierarchy support
  address: Object,
  is_storage_location: Boolean,     // TRUE for all depots/warehouses
  capacity: {
    max_cartons: Number,
    current_utilization: Number
  },
  settings: {
    auto_reorder_enabled: Boolean,
    reorder_threshold: Number,
    preferred_supplier_stores: [ObjectId]
  }
}
```

### 2. `StoreInventory` Collection (NEW - Replaces FactoryStoreInventory)

```javascript
{
  _id: ObjectId,
  store_id: ObjectId,               // References Facility (with is_storage_location: true)
  store_type: String,               // 'factory_store' | 'regional_depot' | 'distributor_warehouse'
  product_id: ObjectId,
  batch_no: String,
  production_date: Date,
  expiry_date: Date,

  // Quantities
  qty_ctn: Decimal128,              // Current quantity
  initial_qty_ctn: Decimal128,      // Original received quantity
  reserved_qty_ctn: Decimal128,     // Reserved for pending orders
  available_qty_ctn: Decimal128,    // Available = qty - reserved

  // Storage details
  location: String,                 // Rack/bin within store
  zone: String,                     // Storage zone (cold, dry, etc.)

  // Tracking
  source_type: String,              // 'production' | 'transfer' | 'return'
  source_reference: String,         // Reference number
  source_store_id: ObjectId,        // For transfers

  // Status
  status: 'active' | 'depleted' | 'expired' | 'quarantine' | 'reserved',

  // Audit
  received_by: ObjectId,
  received_at: Date,
  last_updated_by: ObjectId,
  last_updated_at: Date,

  created_at: Date,
  updated_at: Date
}

// CRITICAL INDEXES FOR PERFORMANCE
StoreInventory.index({ store_id: 1, product_id: 1, batch_no: 1 }, { unique: true });
StoreInventory.index({ store_id: 1, status: 1 });
StoreInventory.index({ store_id: 1, product_id: 1, status: 1 });
StoreInventory.index({ product_id: 1, status: 1 });           // Network-wide queries
StoreInventory.index({ expiry_date: 1, status: 1 });          // Expiry alerts
StoreInventory.index({ store_type: 1, status: 1 });           // Type-level aggregates
StoreInventory.index({ batch_no: 1 });                        // Batch tracking
```

### 3. `StoreInventoryTransaction` Collection (NEW - Replaces FactoryStoreInventoryTransaction)

```javascript
{
  _id: ObjectId,
  transaction_no: String,           // Auto-generated unique ref

  // Store information
  store_id: ObjectId,               // Primary store (from/adjustment store)
  store_type: String,
  related_store_id: ObjectId,       // For transfers (to store)
  related_store_type: String,

  // Product information
  product_id: ObjectId,
  batch_no: String,
  production_date: Date,
  expiry_date: Date,

  // Transaction details
  transaction_type: Enum [
    'receipt_from_production',      // Factory → Factory Store
    'transfer_out',                 // Any Store → Any Store
    'transfer_in',                  // Receiving end of transfer
    'sale',                         // To distributor/retailer
    'return_in',                    // Return from customer
    'adjustment_in',                // Manual increase
    'adjustment_out',               // Manual decrease
    'damage',                       // Damaged goods
    'expired',                      // Expired removal
    'reservation',                  // Reserve for order
    'reservation_release'           // Release reservation
  ],

  // Quantities
  qty_ctn: Decimal128,              // Transaction quantity (+ or -)
  balance_before: Decimal128,       // Balance before transaction
  balance_after: Decimal128,        // Balance after transaction

  // References
  reference_type: String,           // 'production_shipment' | 'transfer' | 'sale_order' | etc
  reference_id: ObjectId,
  reference_no: String,

  // Linked transaction (for transfers - links OUT and IN)
  linked_transaction_id: ObjectId,  // Links the two sides of a transfer

  // Details
  location: String,
  reason: String,
  notes: String,

  // Approval (for adjustments)
  status: 'pending' | 'approved' | 'rejected',
  approved_by: ObjectId,
  approved_at: Date,

  // Audit
  created_by: ObjectId,
  created_at: Date
}

// CRITICAL INDEXES FOR PERFORMANCE
StoreInventoryTransaction.index({ store_id: 1, created_at: -1 });
StoreInventoryTransaction.index({ store_id: 1, transaction_type: 1, created_at: -1 });
StoreInventoryTransaction.index({ product_id: 1, store_id: 1, created_at: -1 });
StoreInventoryTransaction.index({ batch_no: 1, created_at: -1 });
StoreInventoryTransaction.index({ reference_no: 1 });
StoreInventoryTransaction.index({ transaction_no: 1 }, { unique: true });
StoreInventoryTransaction.index({ linked_transaction_id: 1 });  // Transfer tracking
```

### 4. `StoreTransfer` Collection (NEW - For multi-store transfers)

```javascript
{
  _id: ObjectId,
  transfer_no: String,              // TRF-YYYYMMDD-NNNN

  // Source and destination
  from_store_id: ObjectId,
  from_store_type: String,
  to_store_id: ObjectId,
  to_store_type: String,

  // Transfer details
  products: [{
    product_id: ObjectId,
    batch_no: String,
    qty_ctn: Decimal128,
    expiry_date: Date,
    notes: String
  }],

  // Status workflow
  status: 'draft' | 'submitted' | 'in_transit' | 'received' | 'partially_received' | 'cancelled',

  // Transport details
  transport_id: ObjectId,
  driver_name: String,
  vehicle_no: String,
  dispatch_date: Date,
  expected_delivery_date: Date,
  actual_delivery_date: Date,

  // Audit trail
  created_by: ObjectId,
  created_at: Date,
  dispatched_by: ObjectId,
  dispatched_at: Date,
  received_by: ObjectId,
  received_at: Date,

  // Discrepancy handling
  has_discrepancy: Boolean,
  discrepancy_notes: String,
  discrepancy_resolved: Boolean
}

// INDEXES
StoreTransfer.index({ transfer_no: 1 }, { unique: true });
StoreTransfer.index({ from_store_id: 1, status: 1, created_at: -1 });
StoreTransfer.index({ to_store_id: 1, status: 1, created_at: -1 });
StoreTransfer.index({ status: 1, created_at: -1 });
```

## Performance Optimization Strategies

### 1. Database Level

#### A. Compound Indexes (Already shown above)

- Optimize for common query patterns
- Cover index for frequent queries (no table scan)

#### B. Read Replicas

```javascript
// Separate read/write operations
- Master: Write operations (transactions, updates)
- Replica 1: Inventory queries, reports
- Replica 2: Transaction history, analytics
```

#### C. Sharding Strategy (For very large scale)

```javascript
// Shard key: store_id + product_id
// Benefits:
- Distribute load across multiple servers
- Each shard handles subset of stores
- Parallel query execution
```

#### D. Aggregation Pipeline Optimization

```javascript
// Use $match early to reduce dataset
// Use $project to limit fields
// Use indexes in $match stage

db.store_inventory.aggregate([
  { $match: { store_id: storeId, status: 'active' } },  // Uses index
  { $lookup: { ... } },                                  // Join only filtered data
  { $project: { ... } }                                  // Return only needed fields
]);
```

### 2. Application Level

#### A. Redis Caching Strategy

```javascript
// Cache structure
redis:inventory:{store_id}:{product_id} → qty_ctn (TTL: 5 min)
redis:low_stock:{store_id} → [product_ids] (TTL: 10 min)
redis:expiring:{store_id} → [product_ids] (TTL: 30 min)
redis:store_summary:{store_id} → { total_products, total_qty, ... } (TTL: 15 min)

// Invalidation strategy
- On any transaction: Clear store-specific cache
- On transfer: Clear both stores' cache
- Use Redis pub/sub for distributed cache invalidation
```

#### B. Pagination + Cursor-Based Navigation

```javascript
// Standard pagination for UI
GET /api/v1/inventory/stores/{storeId}?page=1&limit=50

// Cursor-based for large datasets
GET /api/v1/inventory/transactions?cursor=last_id&limit=100

// Benefits:
- Consistent performance regardless of offset
- Works well with infinite scroll
```

#### C. Query Result Limiting

```javascript
// Always enforce max limits
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 500;

const limit = Math.min(req.query.limit || DEFAULT_LIMIT, MAX_LIMIT);
```

#### D. Background Job Processing

```javascript
// Use Bull/BullMQ for:

1. Daily Reconciliation Jobs
   - Compare physical count vs system count
   - Generate discrepancy reports

2. Alert Generation
   - Low stock alerts (hourly)
   - Expiry alerts (daily)
   - Aging inventory reports (weekly)

3. Report Generation
   - Daily transaction summaries
   - Weekly movement reports
   - Monthly inventory valuation

4. Cleanup Jobs
   - Archive old transactions (> 2 years)
   - Update expired items status
```

#### E. GraphQL DataLoader Pattern (Optional)

```javascript
// Batch and cache database requests
const productLoader = new DataLoader(async (productIds) => {
  const products = await Product.find({ _id: { $in: productIds } });
  return productIds.map((id) => products.find((p) => p._id.equals(id)));
});

// Reduces N+1 query problem
```

### 3. Frontend Level

#### A. Virtual Scrolling

```javascript
// For large lists (1000+ items)
import { FixedSizeList } from "react-window";

// Render only visible rows
// Huge performance improvement
```

#### B. Debounced Search

```javascript
// Wait for user to stop typing
const debouncedSearch = useMemo(() => debounce((term) => searchInventory(term), 500), []);
```

#### C. Progressive Loading

```javascript
// Load critical data first
1. Dashboard summary (cached)
2. High-priority alerts
3. Recent transactions (lazy load)
4. Detailed reports (on demand)
```

#### D. Client-Side Caching

```javascript
// Use React Query or SWR
const { data, isLoading } = useQuery(["inventory", storeId], () => fetchInventory(storeId), {
  staleTime: 5 * 60 * 1000, // 5 minutes
  cacheTime: 10 * 60 * 1000, // 10 minutes
});
```

### 4. Network Level

#### A. CDN for Static Assets

- Product images
- Category icons
- UI assets

#### B. API Response Compression

```javascript
app.use(compression()); // Gzip responses
```

#### C. HTTP/2 Server Push

- Push critical resources
- Reduce round trips

## API Endpoints Structure

### Store Inventory Management

```javascript
// Generic endpoints work for ALL store types

// View inventory at any store
GET / api / v1 / inventory / stores / { storeId };
GET / api / v1 / inventory / stores / { storeId } / products / { productId };
GET / api / v1 / inventory / stores / { storeId } / batch / { batchNo };

// Receive goods (from production or transfer)
POST / api / v1 / inventory / stores / { storeId } / receive;

// Transfer between stores
POST / api / v1 / inventory / transfers;
GET / api / v1 / inventory / transfers / { transferId };
PUT / api / v1 / inventory / transfers / { transferId } / dispatch;
PUT / api / v1 / inventory / transfers / { transferId } / receive;

// Pending operations
GET / api / v1 / inventory / stores / { storeId } / pending - receipts;
GET / api / v1 / inventory / stores / { storeId } / pending - dispatches;

// Transaction history
GET / api / v1 / inventory / stores / { storeId } / transactions;
GET / api / v1 / inventory / transactions / { transactionId };

// Alerts and reports
GET / api / v1 / inventory / stores / { storeId } / low - stock;
GET / api / v1 / inventory / stores / { storeId } / expiring - soon;
GET / api / v1 / inventory / stores / { storeId } / dashboard;

// Network-wide queries (SuperAdmin only)
GET / api / v1 / inventory / network / summary;
GET / api / v1 / inventory / network / product / { productId };
POST / api / v1 / inventory / network / search;
```

## Migration Path

### Phase 1: Rename & Extend Current Models

1. Rename `FactoryStoreInventory` → `StoreInventory`
2. Add `store_type` field
3. Add performance indexes
4. Keep existing data intact

### Phase 2: Add Transfer System

1. Create `StoreTransfer` model
2. Implement transfer endpoints
3. Link transfer transactions

### Phase 3: Add Regional Depots

1. Create regional depot facilities
2. Enable transfers Factory Store → Regional Depot
3. Test with pilot depot

### Phase 4: Add Distributor Warehouses

1. Enable distributor-owned warehouses
2. Implement sale transactions
3. Add return handling

### Phase 5: Optimize & Scale

1. Implement Redis caching
2. Add background jobs
3. Optimize indexes based on real usage
4. Add monitoring and alerts

## Monitoring & Alerting

### Key Metrics to Track

```javascript
1. Database Performance
   - Query response times
   - Index usage statistics
   - Slow query log
   - Connection pool utilization

2. API Performance
   - Endpoint response times (p50, p95, p99)
   - Error rates
   - Request throughput
   - Cache hit rates

3. Business Metrics
   - Total network inventory value
   - Inventory turnover rate
   - Stock-out frequency
   - Transfer completion time
   - Discrepancy rates

4. System Health
   - Redis memory usage
   - MongoDB disk usage
   - Background job queue size
   - Failed job count
```

## Capacity Planning

### Estimated Scale

```javascript
// Assumptions:
- 100 stores (all types)
- 5,000 SKUs
- 50 batches per SKU average
- 10,000 transactions per day

// Database size estimate:
StoreInventory: 100 stores × 5,000 SKUs × 5 batches avg = 2.5M records
StoreInventoryTransaction: 10K/day × 365 days × 3 years = 11M records

// Query performance targets:
- Inventory lookup: < 100ms
- Transaction history: < 200ms
- Dashboard load: < 500ms
- Transfer creation: < 300ms

// With proper indexes, these are achievable up to:
- 10M inventory records
- 100M transaction records
```

## Cost-Benefit Analysis

### Benefits of Unified System

✅ Single codebase (lower maintenance)
✅ Flexible transfers (any-to-any)
✅ Unified reporting (single source of truth)
✅ Easier to optimize (one system to tune)
✅ Simpler to understand (one mental model)
✅ Better data consistency
✅ Faster development (no duplication)

### Complexity Added

⚠️ More comprehensive indexing needed
⚠️ Cache invalidation across multiple stores
⚠️ Query filtering by store_type
⚠️ Permission management more nuanced

**Verdict**: Benefits FAR outweigh complexity

## Recommendation

### ✅ GO WITH UNIFIED SYSTEM

**Implement**:

1. Single `StoreInventory` model for ALL stores
2. Single `StoreInventoryTransaction` model for ALL movements
3. Flexible `StoreTransfer` model for any-to-any transfers
4. Store type discrimination via `store_type` field
5. Heavy optimization focus on indexes and caching

**Avoid**:
❌ Separate inventory systems per store type
❌ Different transaction models per level
❌ Hardcoded transfer routes

**This architecture will scale to**:

- 1000+ stores
- 100,000+ SKUs
- 100,000+ transactions per day
- With proper optimization
