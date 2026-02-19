# Backend Architecture Context

**Application:** Pusti Happy Times ERP  
**Generated:** January 5, 2026

---

## Technology Stack

### Core Technologies
- **Runtime:** Node.js 22
- **Framework:** Express.js 4.18
- **Database:** MongoDB 7.0 with Mongoose 7.5
- **Cache:** Redis 4.6
- **Authentication:** JWT (jsonwebtoken 9.0)
- **Password Hashing:** bcryptjs 2.4
- **Real-time:** Socket.IO 4.8

### Security & Middleware
- **helmet** - Security headers
- **cors** - Cross-origin resource sharing
- **express-rate-limit** - Rate limiting
- **express-mongo-sanitize** - NoSQL injection prevention
- **hpp** - HTTP parameter pollution prevention
- **express-validator** - Input validation
- **morgan** - HTTP request logging

### Additional Libraries
- **compression** - Response compression
- **multer** - File upload handling
- **jspdf** - PDF generation
- **html2canvas** - Canvas rendering

---

## Project Structure

```
backend/
├── server.js                      # Application entry point
├── .env.example                   # Environment variables template
├── package.json                   # Dependencies
├── Dockerfile                     # Container configuration
├── healthcheck.js                 # Docker health check
│
├── src/
│   ├── config/                    # Configuration modules
│   │   ├── database.js           # MongoDB connection
│   │   └── redis.js              # Redis connection
│   │
│   ├── middleware/                # Express middleware
│   │   ├── auth.js               # Authentication & authorization
│   │   ├── errorHandler.js       # Global error handler
│   │   └── notFound.js           # 404 handler
│   │
│   ├── models/                    # Mongoose schemas (48 models)
│   │   ├── User.js
│   │   ├── Role.js
│   │   ├── Product.js
│   │   ├── DemandOrder.js
│   │   ├── InventoryRequisition.js
│   │   └── ... (see Models section)
│   │
│   ├── routes/                    # Express routes
│   │   ├── index.js              # Route aggregator
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── ordermanagement/
│   │   ├── inventory/
│   │   ├── distribution/
│   │   └── ... (see Routes section)
│   │
│   ├── controllers/               # Business logic
│   │   └── designationController.js
│   │
│   ├── services/                  # Reusable services
│   │
│   ├── utils/                     # Helper utilities
│   │
│   ├── seeds/                     # Database seeders
│   │   ├── seedMenuCategories.js
│   │   ├── seedCategories.js
│   │   └── seedDistributors.js
│   │
│   ├── setup/                     # Bootstrap scripts
│   │   └── bootstrapDistributorPermissions.js
│   │
│   └── migrations/                # Database migrations
│
├── scripts/                       # Utility scripts
│   ├── seedProducts.js
│   └── seedTwoEmployees.js
│
├── public/                        # Static assets
│
└── tests/                         # Test files
```

---

## Server Configuration (server.js)

### Initialization Flow
1. **Environment Setup**
   - Load `.env.production` or `.env.<NODE_ENV>` if exists
   - Fall back to `.env` if environment-specific file not found
   - Prevents accidental development mode in production

2. **Security Middleware**
   ```javascript
   helmet()              // Security headers
   cors()                // Cross-origin requests
   mongoSanitize()       // NoSQL injection prevention
   hpp()                 // Parameter pollution prevention
   compression()         // Response compression
   ```

3. **Request Processing**
   ```javascript
   express.json()        // JSON body parser
   express.urlencoded()  // URL-encoded parser
   morgan()              // Request logging
   ```

4. **Database Connections**
   ```javascript
   connectDB()           // MongoDB via Mongoose
   connectRedis()        // Redis client
   ```

5. **Route Mounting**
   ```javascript
   app.use('/api/v1', apiRoutes)
   ```

6. **Error Handling**
   ```javascript
   notFound()            // 404 handler
   errorHandler()        // Global error handler
   ```

7. **Socket.IO Setup**
   ```javascript
   io.on('connection', ...)  // WebSocket server
   ```

### Environment Variables (.env)
```bash
# Server
NODE_ENV=production|development
PORT=5000
APP_VERSION=1.0.0

# Database
MONGODB_URI=mongodb://admin:password@localhost:27017/pusti_happy_times?authSource=admin
MONGODB_URI_PRODUCTION=...

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
JWT_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d

# CORS
FRONTEND_URL=http://localhost:3000
FRONTEND_URL_PRODUCTION=https://your-domain.com
```

---

## Authentication & Authorization System

### Middleware Chain
```javascript
authenticate → requireRole → requireApiPermission
```

### 1. `authenticate` Middleware
**Purpose:** Verify JWT token and attach user to request

**Process:**
1. Extract token from `Authorization: Bearer <token>`
2. Verify JWT signature
3. Check token version (for logout-all-devices)
4. Fetch user with role and permissions
5. Attach to `req.user`

**User Object Structure:**
```javascript
req.user = {
  id: ObjectId,
  username: String,
  email: String,
  active: Boolean,
  user_type: 'employee' | 'distributor',
  role: {
    id: ObjectId,
    role: String
  },
  context: {
    // Employee context
    employee_type: 'system_admin' | 'field' | 'facility' | 'hq',
    employee_code: String,
    employee_name: String,
    designation_id: ObjectId,
    facility_id: ObjectId,           // Single facility assignment
    factory_store_id: ObjectId,      // For Production employees
    territory_assignments: {
      zone_ids: [ObjectId],
      region_ids: [ObjectId],
      area_ids: [ObjectId],
      db_point_ids: [ObjectId],
      all_territory_ids: [ObjectId]
    },
    
    // Distributor context
    distributor_id: ObjectId,
    distributor_name: String,
    db_point_id: ObjectId,
    territories: [Object],
    product_segment: [String],
    skus_exclude: [String]
  },
  permissions: [String]              // Normalized permission array
}
```

### 2. `requireRole` Middleware
**Purpose:** Check if user has required role

**Usage:**
```javascript
router.get('/admin-only', authenticate, requireRole(['System Admin']), handler)
```

### 3. `requireApiPermission` Middleware
**Purpose:** Verify user has permission for specific API endpoint

**Usage:**
```javascript
router.post('/products', authenticate, requireApiPermission('products_create'), handler)
```

**Permission Format:** `{resource}_{action}`
- Examples: `products_read`, `products_create`, `demandorders_approve`

---

## Database Models (52 total)

### Core Models

#### User.js
```javascript
{
  username: String (unique, required),
  password: String (hashed, select: false),
  role_id: ObjectId → Role,
  email: String (unique, required),
  active: Boolean (default: true),
  user_type: 'employee' | 'distributor',
  employee_id: ObjectId → Employee,
  distributor_id: ObjectId → Distributor,
  tokenVersion: Number,
  created_at, created_by, updated_at, updated_by
}
```

**Methods:**
- `comparePassword(password)` - Verify password
- `generateAuthToken()` - Create JWT
- `generateRefreshToken()` - Create refresh token

#### Role.js
```javascript
{
  role: String (unique, required),
  active: Boolean,
  created_at, created_by, updated_at, updated_by
}
```

#### ApiPermission.js
```javascript
{
  api_permission: String (unique, required),
  description: String,
  active: Boolean,
  created_at, created_by, updated_at, updated_by
}
```

#### SidebarMenuItem.js
```javascript
{
  label: String (required),
  href: String (nullable for parent items),
  icon: String,
  parent_id: ObjectId → SidebarMenuItem,
  m_order: Number,
  active: Boolean,
  created_at, created_by, updated_at, updated_by
}
```

### Master Data Models

#### Product.js
```javascript
{
  sku: String (unique, required),
  product_name: String (required),
  bangla_name: String,
  brand_id: ObjectId → Brand,
  category_id: ObjectId → Category,
  price: Decimal128,
  unit_ctn: Number,
  unit_size: String,
  product_segment: String,
  active: Boolean,
  created_at, created_by, updated_at, updated_by
}
```

#### Brand.js
```javascript
{
  brand_name: String (unique, required),
  active: Boolean,
  created_at, created_by, updated_at, updated_by
}
```

#### Category.js
```javascript
{
  category_name: String (unique, required),
  active: Boolean,
  created_at, created_by, updated_at, updated_by
}
```

#### Territory.js
```javascript
{
  name: String (required),
  code: String (required),
  level: 'zone' | 'region' | 'area' | 'db_point',
  parent_id: ObjectId → Territory,
  active: Boolean,
  created_at, created_by, updated_at, updated_by
}
```

#### Employee.js
```javascript
{
  employee_code: String (unique, required),
  employee_name: String (required),
  employee_type: 'system_admin' | 'field' | 'facility' | 'hq',
  designation_id: ObjectId → Designation,
  facility_id: ObjectId → Facility,      // Single facility
  factory_store_id: ObjectId → Facility, // For production employees
  phone: String,
  email: String,
  active: Boolean,
  created_at, created_by, updated_at, updated_by
}
```

#### Facility.js
```javascript
{
  facility_code: String (unique, required),
  facility_name: String (required),
  facility_type: 'factory' | 'depot',
  location: String,
  product_segment: [String],
  active: Boolean,
  created_at, created_by, updated_at, updated_by
}
```

#### Distributor.js
```javascript
{
  distributor_code: String (unique, required),
  distributor_name: String (required),
  db_point_id: ObjectId → Territory,
  phone: String,
  email: String,
  address: String,
  product_segment: [String],
  skus_exclude: [String],
  credit_limit: Decimal128,
  active: Boolean,
  created_at, created_by, updated_at, updated_by
}
```

### Offer Models

#### Offer.js
```javascript
{
  offer_code: String (unique, required),
  offer_name: String (required),
  offer_type: 'BOGO' | 'BUNDLE_OFFER' | 'FLAT_DISCOUNT_PCT' | ...,
  start_date: Date,
  end_date: Date,
  is_active: Boolean,
  
  // Offer configuration (varies by type)
  config: {
    // For BOGO
    buy_sku, buy_qty, get_sku, get_qty,
    
    // For BUNDLE_OFFER
    bundle_skus: [{sku, qty_per_bundle}],
    bundle_price,
    
    // For FLAT_DISCOUNT
    discount_pct, discount_amt,
    
    // For DISCOUNT_SLAB
    slabs: [{min_qty, max_qty, discount_pct}],
    
    // For FREE_PRODUCT
    threshold_qty, free_sku, free_qty
  },
  
  created_at, created_by, updated_at, updated_by
}
```

#### OfferSend.js
```javascript
{
  offer_id: ObjectId → Offer,
  distributor_ids: [ObjectId],
  sent_by: ObjectId → User,
  sent_at: Date,
  notes: String
}
```

#### OfferReceive.js
```javascript
{
  offer_send_id: ObjectId → OfferSend,
  distributor_id: ObjectId → Distributor,
  received_at: Date,
  status: 'pending' | 'accepted' | 'rejected'
}
```

### Order Management Models

#### DemandOrder.js
```javascript
{
  do_no: String (unique, auto-generated),
  distributor_id: ObjectId → Distributor,
  db_point_id: ObjectId → Territory,
  
  items: [{
    product_id: ObjectId → Product,
    sku: String,
    product_name: String,
    
    // Offer integration
    offer_id: ObjectId → Offer,
    offer_type: String,
    bundle_definition: {
      bundle_size: Number,
      items: [{sku, qty_per_bundle}]
    },
    
    // Quantity tracking
    order_qty: Decimal128,
    order_bundles: Number,
    scheduled_qty: Decimal128,
    scheduled_bundles: Number,
    unscheduled_qty: Decimal128,
    unscheduled_bundles: Number,
    
    // Pricing
    unit_price: Decimal128,
    subtotal: Decimal128,
    discount_applied: Decimal128,
    final_amount: Decimal128,
    discount_locked: Boolean,
    threshold_met: Boolean,
    
    // Scheduling history
    schedules: [{
      schedule_id: String,
      deliver_bundles: Number,
      deliver_qty: Decimal128,
      deliver_qty_breakdown: Map,  // For multi-SKU bundles
      facility_id: ObjectId,
      facility_name: String,
      subtotal, discount_applied, final_amount,
      scheduled_at: Date,
      scheduled_by: ObjectId,
      scheduled_by_name: String,
      notes: String
    }],
    
    // Offer breaking detection
    is_offer_broken: Boolean,
    break_info: {
      broken_at: Date,
      broken_by: ObjectId,
      reason: String,
      original_bundles: Number,
      remaining_bundles: Number
    }
  }],
  
  total_amount: Decimal128,
  status: 'draft' | 'submitted' | 'asm_approved' | 'rsm_approved' | 'rejected' | 'scheduled' | 'completed',
  
  // Approval workflow
  submitted_at: Date,
  asm_approved_at: Date,
  asm_approved_by: ObjectId,
  asm_notes: String,
  rsm_approved_at: Date,
  rsm_approved_by: ObjectId,
  rsm_notes: String,
  rejection_notes: String,
  
  created_at, created_by, updated_at, updated_by
}
```

#### Scheduling.js
(Embedded in DemandOrder, not separate collection)

#### Collection.js
```javascript
{
  collection_no: String (unique, auto-generated),
  distributor_id: ObjectId → Distributor,
  demand_order_id: ObjectId → DemandOrder,
  
  amount: Decimal128,
  payment_method: 'cash' | 'bank_transfer' | 'cheque',
  payment_date: Date,
  
  // Cheque details
  cheque_no: String,
  cheque_date: Date,
  bank_id: ObjectId → Bank,
  
  // Status workflow
  status: 'draft' | 'submitted' | 'approved' | 'returned',
  submitted_at: Date,
  approved_at: Date,
  approved_by: ObjectId,
  returned_at: Date,
  return_reason: String,
  
  created_at, created_by, updated_at, updated_by
}
```

### Inventory Models

#### ProductionSendToStore.js
```javascript
{
  shipment_no: String (unique, auto-generated),
  from_facility_id: ObjectId → Facility (factory),
  to_facility_store_id: ObjectId → Facility (depot),
  
  items: [{
    product_id: ObjectId,
    sku, product_name,
    batch_no: String,
    production_date: Date,
    expiry_date: Date,
    qty_ctn: Decimal128,
    location: String
  }],
  
  status: 'pending' | 'in_transit' | 'received',
  shipped_at: Date,
  received_at: Date,
  received_by: ObjectId,
  
  created_at, created_by, updated_at, updated_by
}
```

#### FactoryStoreInventory.js
```javascript
{
  facility_store_id: ObjectId → Facility,
  product_id: ObjectId → Product,
  batch_no: String,
  production_date: Date,
  expiry_date: Date,
  
  qty_ctn: Decimal128,                // Current balance
  initial_qty_ctn: Decimal128,        // Original quantity
  location: String,                    // Rack/bin
  
  source_shipment_ref: String,
  status: 'active' | 'depleted' | 'expired' | 'quarantine',
  
  created_at, created_by, updated_at, updated_by
}
```

**Static Methods:**
- `getCurrentStock(facilityStoreId, productId)` - Total stock
- `getLowStock(facilityStoreId, threshold)` - Low stock items
- `getExpiringSoon(facilityStoreId, daysThreshold)` - Expiring items

#### FactoryStoreInventoryTransaction.js
```javascript
{
  facility_store_id: ObjectId → Facility,
  product_id: ObjectId → Product,
  batch_no: String,
  
  transaction_type: 'receipt' | 'transfer_out' | 'adjustment_in' | 'adjustment_out' | 'damage' | 'expired' | 'return',
  qty_ctn: Decimal128,              // Positive for IN, negative for OUT
  balance_after: Decimal128,
  
  reference_type: String,           // 'ProductionSendToStore', 'DepotTransfer', etc.
  reference_id: ObjectId,
  reference_no: String,
  
  related_facility_id: ObjectId,    // For transfers
  reason: String,
  
  created_at, created_by
}
```

**Static Methods:**
- `getHistory(facilityStoreId, filters, page, limit)` - Transaction history
- `getDailySummary(facilityStoreId, date)` - Daily summary

#### InventoryRequisition.js
```javascript
{
  requisition_no: String (unique, auto-generated),
  requesting_facility_id: ObjectId → Facility (depot),
  source_facility_id: ObjectId → Facility (factory/depot),
  
  items: [{
    product_id: ObjectId,
    sku, product_name,
    requested_qty_ctn: Decimal128,
    approved_qty_ctn: Decimal128,
    scheduled_qty_ctn: Decimal128,
    unscheduled_qty_ctn: Decimal128
  }],
  
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'scheduled' | 'completed',
  
  submitted_at: Date,
  approved_at: Date,
  approved_by: ObjectId,
  approval_notes: String,
  rejection_notes: String,
  
  created_at, created_by, updated_at, updated_by
}
```

#### RequisitionScheduling.js
```javascript
{
  scheduling_no: String (unique, auto-generated),
  requisition_id: ObjectId → InventoryRequisition,
  
  items: [{
    product_id: ObjectId,
    sku, product_name,
    schedule_qty_ctn: Decimal128
  }],
  
  scheduled_delivery_date: Date,
  status: 'pending' | 'approved' | 'dispatched' | 'received',
  
  approved_at: Date,
  approved_by: ObjectId,
  
  created_at, created_by, updated_at, updated_by
}
```

#### RequisitionLoadSheet.js
```javascript
{
  load_sheet_no: String (unique, auto-generated),
  requisition_scheduling_id: ObjectId → RequisitionScheduling,
  transport_id: ObjectId → Transport,
  
  items: [{
    product_id: ObjectId,
    sku, product_name,
    qty_ctn: Decimal128
  }],
  
  status: 'draft' | 'locked',
  locked_at: Date,
  locked_by: ObjectId,
  
  created_at, created_by, updated_at, updated_by
}
```

#### RequisitionChalan.js
```javascript
{
  chalan_no: String (unique, auto-generated),
  load_sheet_id: ObjectId → RequisitionLoadSheet,
  
  items: [{
    product_id: ObjectId,
    sku, product_name,
    qty_ctn: Decimal128,
    batch_no: String,
    production_date: Date,
    expiry_date: Date
  }],
  
  chalan_date: Date,
  status: 'draft' | 'dispatched' | 'received',
  
  dispatched_at: Date,
  received_at: Date,
  received_by: ObjectId,
  
  created_at, created_by, updated_at, updated_by
}
```

#### DepotTransfer.js
```javascript
{
  transfer_no: String (unique, auto-generated),
  from_facility_id: ObjectId → Facility,
  to_facility_id: ObjectId → Facility,
  
  items: [{
    product_id: ObjectId,
    sku, product_name,
    qty_ctn: Decimal128
  }],
  
  status: 'draft' | 'sent' | 'received',
  sent_at: Date,
  received_at: Date,
  received_by: ObjectId,
  
  created_at, created_by, updated_at, updated_by
}
```

### Finance Models

#### CustomerLedger.js
```javascript
{
  distributor_id: ObjectId → Distributor,
  transaction_date: Date,
  
  transaction_type: 'order' | 'payment' | 'return' | 'adjustment',
  reference_type: String,
  reference_id: ObjectId,
  reference_no: String,
  
  debit: Decimal128,          // Orders increase debt
  credit: Decimal128,         // Payments decrease debt
  balance: Decimal128,        // Running balance
  
  description: String,
  
  created_at, created_by
}
```

### Notification Model

#### Notification.js
```javascript
{
  user_id: ObjectId → User,
  title: String,
  message: String,
  type: 'info' | 'success' | 'warning' | 'error',
  
  action_type: String,        // 'demand_order', 'requisition', etc.
  action_id: ObjectId,
  action_url: String,
  
  is_read: Boolean (default: false),
  read_at: Date,
  
  created_at: Date
}
```

### Mobile & Secondary Sales Models (NEW - Feb 2026)

#### SecondaryOrder.js
```javascript
{
  order_number: String (unique, auto-generated "SO2602XXXX"),
  outlet_id: ObjectId → Outlet,
  distributor_id: ObjectId → Distributor,
  dsr_id: ObjectId → Employee (Sales Officer),
  route_id: ObjectId → Route,
  visit_id: ObjectId → OutletVisit,
  
  order_date: Date (default: now),
  
  items: [{
    product_id: ObjectId → Product,
    sku: String,
    quantity: Number,           // In PCS (pieces)
    unit_price: Decimal128,     // Trade price per piece
    subtotal: Decimal128        // Auto-calculated
  }],
  
  // Auto-calculated fields (pre-save hook)
  subtotal: Decimal128,
  discount_amount: Decimal128,  // From applied offers
  total_amount: Decimal128,
  
  // Offer integration
  applied_offers: [{
    offer_id: ObjectId → SecondaryOffer,
    offer_name: String,
    discount_amount: Decimal128
  }],
  
  // Order lifecycle
  order_status: 'Submitted' | 'Approved' | 'Cancelled' | 'Delivered',
  
  // Delivery (set by web portal)
  delivery_chalan_id: ObjectId → DeliveryChalan,
  delivery_chalan_no: String,
  delivered_at: Date,
  delivered_by: ObjectId → User,
  
  // GPS tracking
  gps_location: {
    type: "Point",
    coordinates: [Number, Number]  // [longitude, latitude]
  },
  gps_accuracy: Number,
  
  so_notes: String,
  
  created_at, created_by, updated_at, updated_by
}

// Virtuals
items_count: Number,       // Count of items
total_quantity: Number     // Sum of all quantities
```

**Static Methods:**
- `generateOrderNumber()` - Creates date-based sequential order number (SO2602XXXX)

**Pre-save Hook:**
- Auto-calculates subtotal from items
- Auto-calculates discount from applied_offers
- Auto-calculates total_amount = subtotal - discount

**Stock Integration:**
- Order creation triggers FIFO stock reduction via `DistributorStock.reduceStockFIFO()`
- Atomic transaction ensures data consistency
- Creates OutletVisit record with visit_type='sales'

#### OutletVisit.js
```javascript
{
  visit_id: String (unique, auto-generated "VISIT2602XXXX"),
  outlet_id: ObjectId → Outlet,
  route_id: ObjectId → Route,
  so_id: ObjectId → Employee (Sales Officer),
  dsr_id: ObjectId → Employee (same as so_id),
  distributor_id: ObjectId → Distributor,
  
  visit_date: Date (default: now),
  check_in_time: Date,
  check_out_time: Date,
  duration_minutes: Number,    // Auto-calculated on check-out
  
  // Visit classification
  visit_type: 'shop_closed' | 'no_sales' | 'visit_only' | 'sales' | 'audit' | 'claim',
  
  // Shop closed fields
  shop_status: 'Open' | 'Closed' | 'Temporarily Closed',
  shop_closed_reason: String,
  
  // No sales fields
  no_sales_reason: 'previous_order_not_delivered' | 'payment_issues' | 'overstocked' | 'credit_limit_reached' | 'outlet_requested_delay' | 'price_concerns' | 'competitor_issues' | 'other',
  no_sales_notes: String,
  
  // Reference to activities
  order_id: ObjectId → SecondaryOrder,
  audit_id: ObjectId → OutletAudit,
  claim_id: ObjectId → DamageClaim,
  
  // GPS tracking
  gps_location: {
    type: "Point",
    coordinates: [Number, Number]
  },
  gps_accuracy: Number,
  distance_from_outlet: Number,  // Calculated via Haversine
  
  // Productivity metrics
  productive: Boolean (default: false),  // true if sales/order placed
  
  so_notes: String,
  
  created_at, created_by, updated_at, updated_by
}
```

**Static Methods:**
- `generateVisitId()` - Creates date-based sequential visit ID

**Pre-save Hook:**
- Auto-calculates `duration_minutes` = (check_out_time - check_in_time) / 60000
- Only when both check_in and check_out times exist

**Indexing:**
- Compound index on (outlet_id, visit_date) for efficient today's visit queries
- Geospatial index on gps_location

#### OutletAudit.js
```javascript
{
  audit_id: String (unique, auto-generated "AUDIT2602XXXX"),
  outlet_id: ObjectId → Outlet,
  so_id: ObjectId → Employee,
  distributor_id: ObjectId → Distributor,
  route_id: ObjectId → Route,
  
  audit_date: Date (default: now),
  
  items: [{
    product_id: ObjectId → Product,
    audited_qty_pcs: Number,      // Counted quantity in pieces
    previous_qty_pcs: Number,     // From last audit
    variance: Number             // Auto-calculated: audited - previous
  }],
  
  // Auto-calculated summaries
  total_items: Number,           // Count of items
  total_qty_pcs: Number,         // Sum of audited quantities
  total_variance: Number,        // Sum of variances
  
  // Audit lifecycle
  status: 'Submitted' | 'Verified' | 'Flagged',
  
  // Verification (by manager)
  verified_by: ObjectId → User,
  verified_at: Date,
  verification_notes: String,
  
  // Link to previous audit
  previous_audit_id: ObjectId → OutletAudit,
  
  // GPS tracking
  gps_location: {
    type: "Point",
    coordinates: [Number, Number]
  },
  gps_accuracy: Number,
  
  so_notes: String,
  
  created_at, created_by, updated_at, updated_by
}
```

**Static Methods:**
- `generateAuditId()` - Creates date-based sequential audit ID
- `getPreviousAudit(outletId)` - Gets last audit for comparison

**Pre-save Hook:**
- Auto-calculates total_items, total_qty_pcs, total_variance
- Validates variance thresholds (optional flagging)

**Indexes:**
- Index on outlet_id for audit history queries
- Index on audit_date for time-based filtering

#### DamageClaim.js
```javascript
{
  claim_id: String (unique, auto-generated "CLAIM2602XXXX"),
  outlet_id: ObjectId → Outlet,
  distributor_id: ObjectId → Distributor,
  so_id: ObjectId → Employee,
  route_id: ObjectId → Route,
  
  claim_date: Date (default: now),
  
  items: [{
    product_id: ObjectId → Product,
    qty_claimed_pcs: Number,
    damage_reason: 'physical_damage' | 'expired' | 'defective' | 'near_expiry' | 'wrong_product' | 'packaging_damage' | 'quality_issue',
    notes: String,
    batch_number: String,
    estimated_value_bdt: Decimal128  // Auto-calculated from trade_price
  }],
  
  // Auto-calculated summaries
  total_items: Number,              // Count of items
  total_qty_pcs: Number,            // Sum of claimed quantities
  total_value_bdt: Decimal128,      // Sum of estimated values
  
  // Claim lifecycle
  status: 'Pending' | 'Under Review' | 'Verified' | 'Approved' | 'Rejected' | 'Replaced' | 'Closed',
  
  // Processing (by management)
  reviewed_by: ObjectId → User,
  reviewed_at: Date,
  review_notes: String,
  
  approved_by: ObjectId → User,
  approved_at: Date,
  approval_notes: String,
  
  replacement_order_id: ObjectId → SecondaryOrder,
  
  // GPS tracking
  gps_location: {
    type: "Point",
    coordinates: [Number, Number]
  },
  gps_accuracy: Number,
  
  so_notes: String,
  
  created_at, created_by, updated_at, updated_by
}
```

**Static Methods:**
- `generateClaimId()` - Creates date-based sequential claim ID
- `getPendingClaims(distributorId)` - Gets claims awaiting review
- `getClaimsByOutlet(outletId)` - Gets claim history for outlet

**Pre-save Hook:**
- Auto-calculates estimated_value_bdt per item (qty × trade_price)
- Auto-calculates total_items, total_qty_pcs, total_value_bdt

**Workflow:**
```
Pending → Under Review → Verified → Approved → Replaced → Closed
                              ↓
                          Rejected → Closed
```

---

## Routes Structure

### Route Organization
```
/api/v1
├── /health                           # Health check
├── /stats/summary                    # System statistics
├── /auth                            # Authentication
├── /users                           # User management
├── /roles                           # Role management
├── /permissions                     # Permission management
├── /menu-items                      # Sidebar menu
├── /brands                          # Brand master
├── /categories                      # Category master
├── /facilities                      # Facility management
├── /transports                      # Transport management
├── /master
│   ├── /banks                       # Bank master
│   └── /bd-banks                    # BD bank directory
├── /designations                    # Designation master
├── /employees                       # Employee management
├── /territories                     # Territory management
├── /distributors                    # Distributor management
├── /distributor                     # Distributor portal
├── /product
│   ├── /products                    # Product management
│   └── /offers                      # Offer management
├── /offers
│   ├── /send-items                  # Send offers
│   └── /receive-items               # Receive offers
├── /production
│   └── /send-to-store              # Production shipments
├── /inventory
│   ├── /factory-to-store           # Receive from production
│   ├── /local-stock                # Current inventory
│   ├── /requisitions               # Requisition management
│   ├── /requisition-schedulings    # Requisition scheduling
│   ├── /approved-req-schedules     # Approved schedules
│   ├── /req-load-sheets            # Load sheets
│   ├── /req-chalans                # Chalans
│   ├── /depot-transfers            # Depot transfers
│   ├── /depot-deliveries           # Depot deliveries
│   └── /load-sheets                # General load sheets
├── /ordermanagement
│   ├── /demandorders               # Demand order CRUD
│   ├── /approveorders              # ASM approval
│   ├── /rsmapproveorders           # RSM approval
│   ├── /do-list                    # Order listing
│   ├── /collections                # Payment collections
│   └── /schedulings                # Distribution scheduling
├── /distribution                    # Distribution portal
├── /finance
│   └── /customerledger             # Customer ledger
├── /dashboard                       # Dashboard data
├── /notifications                   # Notifications
│
├── /mobile                          # Mobile-specific routes (NEW - Feb 2026)
│   ├── /catalog                    # Product catalog for mobile
│   │   ├── GET /categories        # Categories with stock
│   │   ├── GET /products          # Products by category
│   │   └── GET /offers            # Eligible offers
│   └── /orders                     # Secondary orders
│       ├── POST /                  # Create order (FIFO stock reduction)
│       ├── GET /                   # List orders
│       └── GET /:id                # Order details
│
├── /outlet-visits                   # Outlet visit tracking (NEW - Feb 2026)
│   ├── POST /                      # Record visit (shop_closed, no_sales, etc.)
│   ├── GET /                       # List visits
│   ├── GET /:id                    # Visit details
│   ├── PUT /:id/checkout           # Check out from visit
│   └── GET /today-summary          # Today's visit durations (route map)
│
├── /outlet-audits                   # Inventory audits (NEW - Feb 2026)
│   ├── GET /products               # Products for audit (with previous data)
│   ├── POST /                      # Submit audit
│   ├── GET /history                # Audit history for outlet
│   ├── GET /:id                    # Audit details
│   └── PUT /:id/verify             # Verify audit (admin)
│
└── /damage-claims                   # Damage claims (NEW - Feb 2026)
    ├── GET /products               # Products for claim (delivery history)
    ├── POST /                      # Submit claim
    ├── GET /history                # Claim history for outlet
    ├── GET /:id                    # Claim details
    └── PUT /:id/status             # Update claim status
```

---

## Common Patterns

### Standard CRUD Endpoints
```javascript
GET    /resource           # List all (with pagination)
GET    /resource/:id       # Get single
POST   /resource           # Create new
PUT    /resource/:id       # Update
DELETE /resource/:id       # Delete
```

### Approval Workflow Endpoints
```javascript
POST   /resource/:id/submit     # Submit for approval
POST   /resource/:id/approve    # Approve
POST   /resource/:id/reject     # Reject
```

### Status Update Endpoints
```javascript
PATCH  /resource/:id/status     # Update status
POST   /resource/:id/lock       # Lock record
POST   /resource/:id/unlock     # Unlock record
```

### Pagination & Filtering
All list endpoints support:
```javascript
?page=1
&limit=10
&sort=created_at
&order=desc
&search=keyword
&status=active
&[field]=value
```

---

## Error Handling

### Global Error Handler
```javascript
// middleware/errorHandler.js
{
  success: false,
  message: "Error message",
  error: {
    code: "ERROR_CODE",
    details: {...}
  },
  stack: "..." // Only in development
}
```

### Common HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `422` - Validation Error
- `500` - Internal Server Error

---

## Socket.IO Events

### Server → Client
```javascript
'notification'              // New notification
'demand_order_updated'      // Order status changed
'collection_approved'       // Payment approved
'inventory_updated'         // Stock level changed
```

### Client → Server
```javascript
'join_room'                 // Join user-specific room
'leave_room'                // Leave room
'mark_notification_read'    // Mark notification as read
```

---

## Database Connection

### MongoDB (Mongoose)
```javascript
// config/database.js
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000
})
```

### Redis
```javascript
// config/redis.js
const client = redis.createClient({
  url: REDIS_URL,
  socket: {
    connectTimeout: 5000
  }
})
```

**Redis Usage:**
- Session storage
- Cache frequently accessed data
- Rate limiting counters
- Real-time analytics

---

## Scripts & Utilities

### Database Seeders
Located in `backend/` root:
- `create-*.js` - Create master data
- `insert-*.js` - Insert specific records
- `check-*.js` - Verify data
- `fix-*.js` - Fix data issues
- `add-*.js` - Add permissions/menus
- `seed-*.js` - Seed test data

### Common Scripts
```bash
npm start              # Production server
npm run dev            # Development with nodemon
npm test               # Run tests
npm run seed:products  # Seed products
```

---

## Next: [FRONTEND_CONTEXT.md](./FRONTEND_CONTEXT.md)
