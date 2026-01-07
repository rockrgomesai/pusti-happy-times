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

## Database Models (48 total)

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
└── /notifications                   # Notifications
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
