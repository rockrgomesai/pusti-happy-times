# Database Schema Context

**Application:** Pusti Happy Times ERP  
**Database:** MongoDB (pusti_happy_times)  
**Generated:** January 5, 2026

---

## Database Overview

### Technology
- **Database:** MongoDB 7.0
- **ODM:** Mongoose 7.5
- **Admin Interface:** Mongo Express (port 8081)

### Connection
```javascript
mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin
```

### Collections (48 total)
```
Authentication & Authorization (6)
├── users
├── roles
├── api_permissions
├── page_permissions
├── sidebar_menu_items
└── junction tables (role permissions)

Master Data (12)
├── products
├── brands
├── categories
├── territories
├── facilities
├── transports
├── banks
├── bd_banks
├── designations
├── employees
└── distributors

Offers (3)
├── offers
├── offer_sends
└── offer_receives

Order Management (4)
├── demand_orders
├── schedulings (embedded in demand_orders)
├── collections
└── customer_ledger

Inventory (11)
├── production_send_to_stores
├── factory_store_inventories
├── factory_store_inventory_transactions
├── inventory_requisitions
├── requisition_schedulings
├── requisition_load_sheets
├── requisition_chalans
├── requisition_invoices
├── depot_transfers
├── load_sheets
└── delivery_chalans

Distributor (1)
└── distributor_stocks

Notifications (1)
└── notifications
```

---

## Schema Conventions

### Audit Fields (Standard in all collections)
```javascript
{
  created_at: { type: Date, required: true, default: Date.now },
  created_by: { type: ObjectId, ref: 'User', required: true },
  updated_at: { type: Date, required: true, default: Date.now },
  updated_by: { type: ObjectId, ref: 'User', required: true }
}
```

### Common Status Fields
```javascript
{
  active: { type: Boolean, default: true }  // For master data
  status: { type: String, enum: [...] }     // For transactional data
}
```

### Naming Conventions
- **Collections:** Plural, snake_case (e.g., `demand_orders`)
- **Fields:** snake_case (e.g., `created_at`, `user_id`)
- **References:** `{entity}_id` (e.g., `role_id`, `product_id`)
- **ObjectIds:** Explicit reference with `ref` property

---

## Authentication & Authorization Schemas

### Collection: `users`
```javascript
{
  _id: ObjectId,
  username: String (unique, required, index),
  password: String (required, select: false, bcrypt hashed),
  role_id: ObjectId → roles (required, index),
  email: String (unique, required, lowercase, index),
  active: Boolean (default: true),
  
  // User classification
  user_type: String (enum: ['employee', 'distributor'], required, index),
  
  // Conditional references
  employee_id: ObjectId → employees (required if user_type='employee', index),
  distributor_id: ObjectId → distributors (required if user_type='distributor', index),
  
  // Session management
  tokenVersion: Number (default: 0),
  
  // Audit fields
  created_at: Date,
  created_by: ObjectId → users,
  updated_at: Date,
  updated_by: ObjectId → users
}
```

**Indexes:**
- `username` (unique)
- `email` (unique)
- `role_id`
- `user_type`
- `employee_id`
- `distributor_id`

**Validation:**
- If `user_type='employee'` → `employee_id` required, `distributor_id` must be null
- If `user_type='distributor'` → `distributor_id` required, `employee_id` must be null

---

### Collection: `roles`
```javascript
{
  _id: ObjectId,
  role: String (unique, required, trim),
  active: Boolean (default: true),
  created_at: Date,
  created_by: ObjectId → users,
  updated_at: Date,
  updated_by: ObjectId → users
}
```

**Common Roles:**
- System Admin
- Inventory Manager - Factory
- Inventory Manager - Depot
- Production Manager
- Finance Manager
- Sales Admin
- Area Sales Manager (ASM)
- Regional Sales Manager (RSM)
- Zonal Sales Manager (ZSM)
- Distributor

---

### Collection: `api_permissions`
```javascript
{
  _id: ObjectId,
  api_permission: String (unique, required, trim),
  description: String,
  active: Boolean (default: true),
  created_at: Date,
  created_by: ObjectId → users,
  updated_at: Date,
  updated_by: ObjectId → users
}
```

**Permission Format:** `{resource}_{action}`

**Examples:**
- `products_read`
- `products_create`
- `products_update`
- `products_delete`
- `demandorders_approve`
- `requisitions_schedule`

---

### Collection: `page_permissions`
```javascript
{
  _id: ObjectId,
  page_permission: String (unique, required, trim),
  description: String,
  active: Boolean (default: true),
  created_at: Date,
  created_by: ObjectId → users,
  updated_at: Date,
  updated_by: ObjectId → users
}
```

---

### Collection: `sidebar_menu_items`
```javascript
{
  _id: ObjectId,
  label: String (required, trim),
  href: String (nullable for parent items),
  icon: String (Material-UI icon name),
  parent_id: ObjectId → sidebar_menu_items (nullable),
  m_order: Number (required, for ordering),
  active: Boolean (default: true),
  created_at: Date,
  created_by: ObjectId → users,
  updated_at: Date,
  updated_by: ObjectId → users
}
```

**Hierarchical Structure:**
- **Parent Items:** `parent_id=null`, `href=null`
- **Child Items:** `parent_id` points to parent, `href` contains route

---

### Junction Collections

#### `role_api_permissions`
```javascript
{
  role_id: ObjectId → roles,
  api_permission_id: ObjectId → api_permissions
}
```

#### `role_page_permissions`
```javascript
{
  role_id: ObjectId → roles,
  page_permission_id: ObjectId → page_permissions
}
```

#### `role_sidebar_menu_items`
```javascript
{
  role_id: ObjectId → roles,
  sidebar_menu_item_id: ObjectId → sidebar_menu_items
}
```

---

## Master Data Schemas

### Collection: `products`
```javascript
{
  _id: ObjectId,
  sku: String (unique, required, uppercase, trim, index),
  product_name: String (required, trim),
  bangla_name: String (trim, index),
  brand_id: ObjectId → brands (required, index),
  category_id: ObjectId → categories (required, index),
  price: Decimal128 (required),
  unit_ctn: Number (required), // Units per carton
  unit_size: String, // e.g., "25g", "500ml"
  product_segment: String (enum: ['Hot', 'Snacks', 'Oil'], index),
  active: Boolean (default: true),
  created_at: Date,
  created_by: ObjectId → users,
  updated_at: Date,
  updated_by: ObjectId → users
}
```

**Indexes:**
- `sku` (unique)
- `product_name`
- `bangla_name`
- `brand_id`
- `category_id`
- `product_segment`

---

### Collection: `brands`
```javascript
{
  _id: ObjectId,
  brand_name: String (unique, required, trim, index),
  active: Boolean (default: true, index),
  created_at: Date,
  created_by: ObjectId → users,
  updated_at: Date,
  updated_by: ObjectId → users
}
```

---

### Collection: `categories`
```javascript
{
  _id: ObjectId,
  category_name: String (unique, required, trim, index),
  active: Boolean (default: true),
  created_at: Date,
  created_by: ObjectId → users,
  updated_at: Date,
  updated_by: ObjectId → users
}
```

---

### Collection: `territories`
```javascript
{
  _id: ObjectId,
  name: String (required, trim),
  code: String (required, uppercase, trim, index),
  level: String (enum: ['zone', 'region', 'area', 'db_point'], required, index),
  parent_id: ObjectId → territories (nullable, index),
  active: Boolean (default: true, index),
  created_at: Date,
  created_by: ObjectId → users,
  updated_at: Date,
  updated_by: ObjectId → users
}
```

**Hierarchical Structure:**
```
Zone (parent_id=null)
  └─ Region (parent_id=zone_id)
      └─ Area (parent_id=region_id)
          └─ DB Point (parent_id=area_id)
```

**Indexes:**
- `code`
- `level`
- `parent_id`
- `active`
- Compound: `{level: 1, active: 1}`

---

### Collection: `facilities`
```javascript
{
  _id: ObjectId,
  facility_code: String (unique, required, uppercase, trim, index),
  facility_name: String (required, trim, index),
  facility_type: String (enum: ['factory', 'depot'], required, index),
  location: String,
  address: String,
  product_segment: [String] (enum: ['Hot', 'Snacks', 'Oil']),
  active: Boolean (default: true, index),
  created_at: Date,
  created_by: ObjectId → users,
  updated_at: Date,
  updated_by: ObjectId → users
}
```

**Note:** Unified schema replaces separate `factories` and `depots` collections

---

### Collection: `transports`
```javascript
{
  _id: ObjectId,
  vehicle_no: String (unique, required, uppercase, trim, index),
  vehicle_type: String (enum: ['truck', 'van', 'pickup'], required),
  driver_name: String (required, trim),
  driver_phone: String,
  capacity_ton: Decimal128,
  active: Boolean (default: true),
  created_at: Date,
  created_by: ObjectId → users,
  updated_at: Date,
  updated_by: ObjectId → users
}
```

---

### Collection: `banks`
```javascript
{
  _id: ObjectId,
  bank_name: String (unique, required, trim, index),
  swift_code: String (unique, uppercase, trim),
  active: Boolean (default: true),
  created_at: Date,
  created_by: ObjectId → users,
  updated_at: Date,
  updated_by: ObjectId → users
}
```

---

### Collection: `bd_banks`
```javascript
{
  _id: ObjectId,
  bank_name: String (unique, required, trim, index),
  routing_number: String (unique, trim),
  branch_name: String,
  district: String,
  active: Boolean (default: true),
  created_at: Date,
  created_by: ObjectId → users,
  updated_at: Date,
  updated_by: ObjectId → users
}
```

---

### Collection: `designations`
```javascript
{
  _id: ObjectId,
  designation_name: String (unique, required, trim, index),
  description: String,
  active: Boolean (default: true),
  created_at: Date,
  created_by: ObjectId → users,
  updated_at: Date,
  updated_by: ObjectId → users
}
```

---

### Collection: `employees`
```javascript
{
  _id: ObjectId,
  employee_code: String (unique, required, uppercase, trim, index),
  employee_name: String (required, trim, index),
  employee_type: String (enum: ['system_admin', 'field', 'facility', 'hq'], required, index),
  designation_id: ObjectId → designations (required, index),
  
  // Single facility assignment (for facility employees)
  facility_id: ObjectId → facilities (nullable, index),
  
  // Factory store assignment (for production employees)
  factory_store_id: ObjectId → facilities (nullable, index),
  
  phone: String (trim),
  email: String (lowercase, trim),
  active: Boolean (default: true, index),
  created_at: Date,
  created_by: ObjectId → users,
  updated_at: Date,
  updated_by: ObjectId → users
}
```

**Employee Types:**
- `system_admin` - Full system access
- `field` - Field sales officers (territory-based)
- `facility` - Depot/factory employees (single facility)
- `hq` - Head office employees

---

### Junction Collection: `employee_territories`
```javascript
{
  employee_id: ObjectId → employees,
  territory_id: ObjectId → territories
}
```

**Note:** Only for `employee_type='field'` employees

---

### Collection: `distributors`
```javascript
{
  _id: ObjectId,
  distributor_code: String (unique, required, uppercase, trim, index),
  distributor_name: String (required, trim, index),
  db_point_id: ObjectId → territories (required, index),
  phone: String (required, trim),
  email: String (lowercase, trim),
  address: String,
  
  // Product access control
  product_segment: [String] (enum: ['Hot', 'Snacks', 'Oil']),
  skus_exclude: [String], // Excluded SKUs
  
  // Financial
  credit_limit: Decimal128 (default: 0),
  
  active: Boolean (default: true, index),
  created_at: Date,
  created_by: ObjectId → users,
  updated_at: Date,
  updated_by: ObjectId → users
}
```

**Indexes:**
- `distributor_code` (unique)
- `distributor_name`
- `db_point_id`
- `active`

---

## Offer Schemas

### Collection: `offers`
```javascript
{
  _id: ObjectId,
  offer_code: String (unique, required, uppercase, trim, index),
  offer_name: String (required, trim, index),
  
  offer_type: String (
    enum: [
      'BOGO',                    // Buy One Get One
      'BOGO_DIFFERENT_SKU',      // Buy X Get Y
      'BUNDLE_OFFER',            // Multi-SKU bundle
      'FLAT_DISCOUNT_PCT',       // Flat percentage discount
      'FLAT_DISCOUNT_AMT',       // Flat amount discount
      'DISCOUNT_SLAB_PCT',       // Tiered percentage discount
      'DISCOUNT_SLAB_AMT',       // Tiered amount discount
      'VOLUME_DISCOUNT',         // Volume-based pricing
      'FREE_PRODUCT'             // Threshold-based free gift
    ],
    required,
    index
  ),
  
  start_date: Date (required, index),
  end_date: Date (required, index),
  is_active: Boolean (default: false, index),
  
  // Offer configuration (varies by type)
  config: {
    // BOGO / BOGO_DIFFERENT_SKU
    buy_sku: String,
    buy_qty: Number,
    get_sku: String,
    get_qty: Number,
    
    // BUNDLE_OFFER
    bundle_skus: [
      {
        sku: String,
        qty_per_bundle: Number,
        product_name: String,
        unit_price: Decimal128
      }
    ],
    bundle_price: Decimal128,
    bundle_discount_amt: Decimal128,
    
    // FLAT_DISCOUNT_PCT / FLAT_DISCOUNT_AMT
    discount_pct: Number,
    discount_amt: Decimal128,
    
    // DISCOUNT_SLAB_PCT / DISCOUNT_SLAB_AMT
    slabs: [
      {
        min_qty: Number,
        max_qty: Number,
        discount_pct: Number,
        discount_amt: Decimal128
      }
    ],
    
    // VOLUME_DISCOUNT
    volume_tiers: [
      {
        min_qty: Number,
        max_qty: Number,
        unit_price: Decimal128
      }
    ],
    
    // FREE_PRODUCT
    threshold_qty: Number,
    free_sku: String,
    free_qty: Number,
    free_product_name: String
  },
  
  created_at: Date,
  created_by: ObjectId → users,
  updated_at: Date,
  updated_by: ObjectId → users
}
```

**Indexes:**
- `offer_code` (unique)
- `offer_name`
- `offer_type`
- `start_date`, `end_date`
- `is_active`
- Compound: `{is_active: 1, start_date: 1, end_date: 1}`

---

### Collection: `offer_sends`
```javascript
{
  _id: ObjectId,
  offer_id: ObjectId → offers (required, index),
  distributor_ids: [ObjectId] → distributors (required),
  sent_by: ObjectId → users (required),
  sent_at: Date (default: Date.now, index),
  notes: String,
  created_at: Date,
  created_by: ObjectId → users,
  updated_at: Date,
  updated_by: ObjectId → users
}
```

---

### Collection: `offer_receives`
```javascript
{
  _id: ObjectId,
  offer_send_id: ObjectId → offer_sends (required, index),
  offer_id: ObjectId → offers (required, index),
  distributor_id: ObjectId → distributors (required, index),
  received_at: Date (default: Date.now),
  status: String (enum: ['pending', 'accepted', 'rejected'], default: 'pending', index),
  rejection_reason: String,
  created_at: Date,
  created_by: ObjectId → users,
  updated_at: Date,
  updated_by: ObjectId → users
}
```

**Indexes:**
- `offer_send_id`
- `offer_id`
- `distributor_id`
- `status`
- Compound: `{distributor_id: 1, status: 1}`

---

## Order Management Schemas

### Collection: `demand_orders`
```javascript
{
  _id: ObjectId,
  do_no: String (unique, required, auto-generated: 'DO-YYYYMMDD-####', index),
  
  distributor_id: ObjectId → distributors (required, index),
  db_point_id: ObjectId → territories (required, index),
  
  items: [
    {
      product_id: ObjectId → products (required),
      sku: String,
      product_name: String,
      
      // Offer integration
      offer_id: ObjectId → offers,
      offer_type: String,
      
      // Bundle definition (for BOGO, BUNDLE_OFFER)
      bundle_definition: {
        bundle_size: Number,  // Number of SKUs in bundle
        items: [
          {
            sku: String,
            product_name: String,
            qty_per_bundle: Number,
            unit_price: Decimal128
          }
        ]
      },
      
      // Quantity tracking
      order_qty: Decimal128 (required),      // Total units ordered
      order_bundles: Number,                 // Total bundles ordered
      scheduled_qty: Decimal128 (default: 0),
      scheduled_bundles: Number (default: 0),
      unscheduled_qty: Decimal128,
      unscheduled_bundles: Number,
      
      // Pricing
      unit_price: Decimal128 (required),
      subtotal: Decimal128 (required),
      discount_applied: Decimal128 (default: 0),
      final_amount: Decimal128 (required),
      
      // Offer state tracking
      discount_locked: Boolean (default: false),
      threshold_met: Boolean (default: false),
      
      // Scheduling history
      schedules: [
        {
          schedule_id: String,
          deliver_bundles: Number,
          deliver_qty: Decimal128,
          deliver_qty_breakdown: Map,  // {"SKU1": 10, "SKU2": 20} for multi-SKU bundles
          facility_id: ObjectId → facilities,
          facility_name: String,
          subtotal: Decimal128,
          discount_applied: Decimal128,
          final_amount: Decimal128,
          scheduled_at: Date,
          scheduled_by: ObjectId → users,
          scheduled_by_name: String,
          notes: String
        }
      ],
      
      // Offer breaking detection
      is_offer_broken: Boolean (default: false),
      break_info: {
        broken_at: Date,
        broken_by: ObjectId,
        reason: String,
        original_bundles: Number,
        remaining_bundles: Number,
        remaining_qty: Decimal128
      }
    }
  ],
  
  total_amount: Decimal128 (required),
  
  status: String (
    enum: [
      'draft',
      'submitted',
      'asm_approved',
      'asm_rejected',
      'rsm_approved',
      'rsm_rejected',
      'scheduled',
      'completed',
      'cancelled'
    ],
    default: 'draft',
    index
  ),
  
  // Workflow tracking
  submitted_at: Date,
  
  asm_approved_at: Date,
  asm_approved_by: ObjectId → users,
  asm_notes: String,
  
  rsm_approved_at: Date,
  rsm_approved_by: ObjectId → users,
  rsm_notes: String,
  
  rejection_notes: String,
  rejection_at: Date,
  rejected_by: ObjectId → users,
  
  completed_at: Date,
  
  created_at: Date,
  created_by: ObjectId → users,
  updated_at: Date,
  updated_by: ObjectId → users
}
```

**Indexes:**
- `do_no` (unique)
- `distributor_id`
- `db_point_id`
- `status`
- Compound: `{distributor_id: 1, status: 1, created_at: -1}`
- Compound: `{status: 1, submitted_at: -1}`

---

### Collection: `collections` (Payment Collections)
```javascript
{
  _id: ObjectId,
  collection_no: String (unique, required, auto-generated: 'COL-YYYYMMDD-####', index),
  
  distributor_id: ObjectId → distributors (required, index),
  demand_order_id: ObjectId → demand_orders (required, index),
  
  amount: Decimal128 (required),
  payment_method: String (enum: ['cash', 'bank_transfer', 'cheque'], required),
  payment_date: Date (required, index),
  
  // Bank transfer details
  bank_id: ObjectId → banks,
  bank_account_no: String,
  transaction_ref: String,
  
  // Cheque details
  cheque_no: String,
  cheque_date: Date,
  cheque_bank_id: ObjectId → bd_banks,
  
  status: String (
    enum: ['draft', 'submitted', 'approved', 'returned'],
    default: 'draft',
    index
  ),
  
  // Workflow
  submitted_at: Date,
  approved_at: Date,
  approved_by: ObjectId → users,
  approval_notes: String,
  
  returned_at: Date,
  return_reason: String,
  
  created_at: Date,
  created_by: ObjectId → users,
  updated_at: Date,
  updated_by: ObjectId → users
}
```

**Indexes:**
- `collection_no` (unique)
- `distributor_id`
- `demand_order_id`
- `status`
- `payment_date`
- Compound: `{distributor_id: 1, status: 1, payment_date: -1}`

---

### Collection: `customer_ledger`
```javascript
{
  _id: ObjectId,
  distributor_id: ObjectId → distributors (required, index),
  transaction_date: Date (required, index),
  
  transaction_type: String (
    enum: ['order', 'payment', 'return', 'adjustment'],
    required,
    index
  ),
  
  reference_type: String, // 'DemandOrder', 'Collection', etc.
  reference_id: ObjectId,
  reference_no: String,
  
  debit: Decimal128 (default: 0),   // Orders increase debt
  credit: Decimal128 (default: 0),  // Payments decrease debt
  balance: Decimal128 (required),   // Running balance
  
  description: String,
  notes: String,
  
  created_at: Date,
  created_by: ObjectId → users
}
```

**Indexes:**
- `distributor_id`
- `transaction_date`
- `transaction_type`
- Compound: `{distributor_id: 1, transaction_date: -1}`

---

## Inventory Schemas

### Collection: `production_send_to_stores`
```javascript
{
  _id: ObjectId,
  shipment_no: String (unique, required, auto-generated: 'PS-YYYYMMDD-####', index),
  
  from_facility_id: ObjectId → facilities (required, facility_type='factory', index),
  to_facility_store_id: ObjectId → facilities (required, facility_type='depot', index),
  
  items: [
    {
      product_id: ObjectId → products (required),
      sku: String,
      product_name: String,
      batch_no: String (required),
      production_date: Date (required),
      expiry_date: Date (required),
      qty_ctn: Decimal128 (required),
      location: String // Storage location at depot
    }
  ],
  
  status: String (
    enum: ['pending', 'in_transit', 'received'],
    default: 'pending',
    index
  ),
  
  shipped_at: Date,
  received_at: Date,
  received_by: ObjectId → users,
  notes: String,
  
  created_at: Date,
  created_by: ObjectId → users,
  updated_at: Date,
  updated_by: ObjectId → users
}
```

**Indexes:**
- `shipment_no` (unique)
- `from_facility_id`
- `to_facility_store_id`
- `status`
- Compound: `{to_facility_store_id: 1, status: 1, shipped_at: -1}`

---

### Collection: `factory_store_inventories`
```javascript
{
  _id: ObjectId,
  facility_store_id: ObjectId → facilities (required, index),
  product_id: ObjectId → products (required, index),
  batch_no: String (required, index),
  production_date: Date (required),
  expiry_date: Date (required, index),
  
  qty_ctn: Decimal128 (required),        // Current balance
  initial_qty_ctn: Decimal128 (required), // Original quantity
  location: String,                       // Rack/bin location
  
  source_shipment_ref: String,  // Reference to ProductionSendToStore shipment_no
  
  status: String (
    enum: ['active', 'depleted', 'expired', 'quarantine'],
    default: 'active',
    index
  ),
  
  created_at: Date,
  created_by: ObjectId → users,
  updated_at: Date,
  updated_by: ObjectId → users
}
```

**Indexes:**
- `facility_store_id`
- `product_id`
- `batch_no`
- `expiry_date`
- `status`
- Compound: `{facility_store_id: 1, product_id: 1, batch_no: 1}` (unique)
- Compound: `{facility_store_id: 1, status: 1}`
- Compound: `{facility_store_id: 1, expiry_date: 1, status: 1}`

---

### Collection: `factory_store_inventory_transactions`
```javascript
{
  _id: ObjectId,
  facility_store_id: ObjectId → facilities (required, index),
  product_id: ObjectId → products (required, index),
  batch_no: String (required, index),
  
  transaction_type: String (
    enum: [
      'receipt',          // Receiving from production
      'transfer_out',     // Sending to other depot/distributor
      'adjustment_in',    // Manual increase
      'adjustment_out',   // Manual decrease
      'damage',           // Damaged goods
      'expired',          // Expired goods removal
      'return'            // Return from depot/distributor
    ],
    required,
    index
  ),
  
  qty_ctn: Decimal128 (required),      // Positive for IN, negative for OUT
  balance_after: Decimal128 (required), // Balance after this transaction
  
  reference_type: String,  // 'ProductionSendToStore', 'DepotTransfer', etc.
  reference_id: ObjectId,
  reference_no: String,
  
  related_facility_id: ObjectId → facilities,  // For transfers
  reason: String,
  notes: String,
  
  created_at: Date (index),
  created_by: ObjectId → users
}
```

**Indexes:**
- `facility_store_id`
- `product_id`
- `batch_no`
- `transaction_type`
- `created_at`
- Compound: `{facility_store_id: 1, product_id: 1, created_at: -1}`
- Compound: `{facility_store_id: 1, transaction_type: 1, created_at: -1}`

---

### Collection: `inventory_requisitions`
```javascript
{
  _id: ObjectId,
  requisition_no: String (unique, required, auto-generated: 'REQ-YYYYMMDD-####', index),
  
  requesting_facility_id: ObjectId → facilities (required, facility_type='depot', index),
  source_facility_id: ObjectId → facilities (required, index),
  
  items: [
    {
      product_id: ObjectId → products (required),
      sku: String,
      product_name: String,
      requested_qty_ctn: Decimal128 (required),
      approved_qty_ctn: Decimal128 (default: 0),
      scheduled_qty_ctn: Decimal128 (default: 0),
      unscheduled_qty_ctn: Decimal128
    }
  ],
  
  status: String (
    enum: ['draft', 'submitted', 'approved', 'rejected', 'scheduled', 'completed'],
    default: 'draft',
    index
  ),
  
  // Workflow
  submitted_at: Date,
  approved_at: Date,
  approved_by: ObjectId → users,
  approval_notes: String,
  
  rejection_notes: String,
  rejected_at: Date,
  
  completed_at: Date,
  
  created_at: Date,
  created_by: ObjectId → users,
  updated_at: Date,
  updated_by: ObjectId → users
}
```

**Indexes:**
- `requisition_no` (unique)
- `requesting_facility_id`
- `source_facility_id`
- `status`
- Compound: `{requesting_facility_id: 1, status: 1, created_at: -1}`

---

### Collection: `requisition_schedulings`
```javascript
{
  _id: ObjectId,
  scheduling_no: String (unique, required, auto-generated: 'REQSCH-YYYYMMDD-####', index),
  requisition_id: ObjectId → inventory_requisitions (required, index),
  
  items: [
    {
      product_id: ObjectId → products (required),
      sku: String,
      product_name: String,
      schedule_qty_ctn: Decimal128 (required)
    }
  ],
  
  scheduled_delivery_date: Date (required, index),
  
  status: String (
    enum: ['pending', 'approved', 'dispatched', 'received'],
    default: 'pending',
    index
  ),
  
  approved_at: Date,
  approved_by: ObjectId → users,
  
  dispatched_at: Date,
  received_at: Date,
  received_by: ObjectId → users,
  
  created_at: Date,
  created_by: ObjectId → users,
  updated_at: Date,
  updated_by: ObjectId → users
}
```

**Indexes:**
- `scheduling_no` (unique)
- `requisition_id`
- `status`
- `scheduled_delivery_date`
- Compound: `{requisition_id: 1, status: 1}`

---

### Collection: `requisition_load_sheets`
```javascript
{
  _id: ObjectId,
  load_sheet_no: String (unique, required, auto-generated: 'RLS-YYYYMMDD-####', index),
  requisition_scheduling_id: ObjectId → requisition_schedulings (required, index),
  transport_id: ObjectId → transports (required, index),
  
  items: [
    {
      product_id: ObjectId → products (required),
      sku: String,
      product_name: String,
      qty_ctn: Decimal128 (required)
    }
  ],
  
  status: String (
    enum: ['draft', 'locked'],
    default: 'draft',
    index
  ),
  
  locked_at: Date,
  locked_by: ObjectId → users,
  
  created_at: Date,
  created_by: ObjectId → users,
  updated_at: Date,
  updated_by: ObjectId → users
}
```

---

### Collection: `requisition_chalans`
```javascript
{
  _id: ObjectId,
  chalan_no: String (unique, required, auto-generated: 'RCH-YYYYMMDD-####', index),
  load_sheet_id: ObjectId → requisition_load_sheets (required, index),
  
  items: [
    {
      product_id: ObjectId → products (required),
      sku: String,
      product_name: String,
      qty_ctn: Decimal128 (required),
      batch_no: String (required),
      production_date: Date (required),
      expiry_date: Date (required)
    }
  ],
  
  chalan_date: Date (required, index),
  
  status: String (
    enum: ['draft', 'dispatched', 'received'],
    default: 'draft',
    index
  ),
  
  dispatched_at: Date,
  received_at: Date,
  received_by: ObjectId → users,
  notes: String,
  
  created_at: Date,
  created_by: ObjectId → users,
  updated_at: Date,
  updated_by: ObjectId → users
}
```

---

### Collection: `depot_transfers`
```javascript
{
  _id: ObjectId,
  transfer_no: String (unique, required, auto-generated: 'DT-YYYYMMDD-####', index),
  
  from_facility_id: ObjectId → facilities (required, facility_type='depot', index),
  to_facility_id: ObjectId → facilities (required, facility_type='depot', index),
  
  items: [
    {
      product_id: ObjectId → products (required),
      sku: String,
      product_name: String,
      qty_ctn: Decimal128 (required),
      batch_no: String,
      production_date: Date,
      expiry_date: Date
    }
  ],
  
  status: String (
    enum: ['draft', 'sent', 'received'],
    default: 'draft',
    index
  ),
  
  sent_at: Date,
  received_at: Date,
  received_by: ObjectId → users,
  notes: String,
  
  created_at: Date,
  created_by: ObjectId → users,
  updated_at: Date,
  updated_by: ObjectId → users
}
```

---

### Collection: `load_sheets`
```javascript
{
  _id: ObjectId,
  load_sheet_no: String (unique, required, auto-generated: 'LS-YYYYMMDD-####', index),
  reference_type: String (required), // 'DemandOrder', 'DepotTransfer', etc.
  reference_id: ObjectId (required),
  transport_id: ObjectId → transports (required, index),
  
  items: [
    {
      product_id: ObjectId → products (required),
      sku: String,
      product_name: String,
      qty_ctn: Decimal128 (required)
    }
  ],
  
  status: String (
    enum: ['draft', 'locked'],
    default: 'draft',
    index
  ),
  
  locked_at: Date,
  locked_by: ObjectId → users,
  
  created_at: Date,
  created_by: ObjectId → users,
  updated_at: Date,
  updated_by: ObjectId → users
}
```

---

### Collection: `delivery_chalans`
```javascript
{
  _id: ObjectId,
  chalan_no: String (unique, required, auto-generated: 'DCH-YYYYMMDD-####', index),
  load_sheet_id: ObjectId → load_sheets (required, index),
  
  items: [
    {
      product_id: ObjectId → products (required),
      sku: String,
      product_name: String,
      qty_ctn: Decimal128 (required),
      batch_no: String (required),
      production_date: Date (required),
      expiry_date: Date (required)
    }
  ],
  
  chalan_date: Date (required, index),
  
  status: String (
    enum: ['draft', 'dispatched', 'received'],
    default: 'draft',
    index
  ),
  
  dispatched_at: Date,
  received_at: Date,
  received_by: ObjectId → users,
  notes: String,
  
  created_at: Date,
  created_by: ObjectId → users,
  updated_at: Date,
  updated_by: ObjectId → users
}
```

---

## Distributor Schema

### Collection: `distributor_stocks`
```javascript
{
  _id: ObjectId,
  distributor_id: ObjectId → distributors (required, index),
  product_id: ObjectId → products (required, index),
  batch_no: String (required, index),
  
  qty_ctn: Decimal128 (required),
  production_date: Date,
  expiry_date: Date,
  
  last_updated: Date (default: Date.now, index),
  
  created_at: Date,
  created_by: ObjectId → users,
  updated_at: Date,
  updated_by: ObjectId → users
}
```

**Indexes:**
- `distributor_id`
- `product_id`
- `batch_no`
- `last_updated`
- Compound: `{distributor_id: 1, product_id: 1, batch_no: 1}` (unique)

---

## Notification Schema

### Collection: `notifications`
```javascript
{
  _id: ObjectId,
  user_id: ObjectId → users (required, index),
  
  title: String (required),
  message: String (required),
  type: String (enum: ['info', 'success', 'warning', 'error'], default: 'info', index),
  
  action_type: String, // 'demand_order', 'requisition', 'collection', etc.
  action_id: ObjectId,
  action_url: String,
  
  is_read: Boolean (default: false, index),
  read_at: Date,
  
  created_at: Date (default: Date.now, index)
}
```

**Indexes:**
- `user_id`
- `type`
- `is_read`
- `created_at`
- Compound: `{user_id: 1, is_read: 1, created_at: -1}`

---

## Data Relationships Summary

### User Authentication Chain
```
User → Role → [ApiPermissions, PagePermissions, SidebarMenuItems]
User → Employee/Distributor
Employee → Designation, Facility, Territories
Distributor → Territory (DB Point)
```

### Product Hierarchy
```
Product → Brand
Product → Category
```

### Territory Hierarchy
```
Zone → Region → Area → DB Point (Distributor)
```

### Order Flow
```
Distributor → DemandOrder → [ASM Approval] → [RSM Approval] → Scheduling → Collection → CustomerLedger
```

### Inventory Flow
```
Production → ProductionSendToStore → FactoryStoreInventory
FactoryStoreInventory → InventoryRequisition → RequisitionScheduling → RequisitionLoadSheet → RequisitionChalan
FactoryStoreInventory → DepotTransfer → LoadSheet → DeliveryChalan
```

### Offer Flow
```
Offer → OfferSend → OfferReceive → DemandOrder (with offer integration)
```

---

## Database Maintenance

### Backup Strategy
```bash
# Full backup
mongodump --uri="mongodb://admin:password@localhost:27017/pusti_happy_times?authSource=admin" --out=/backup/$(date +%Y%m%d)

# Restore
mongorestore --uri="mongodb://admin:password@localhost:27017/pusti_happy_times?authSource=admin" /backup/20260105
```

### Index Maintenance
```javascript
// Rebuild indexes
db.users.reIndex();
db.demand_orders.reIndex();
db.factory_store_inventories.reIndex();
```

### Data Cleanup
```javascript
// Remove old notifications (> 90 days)
db.notifications.deleteMany({
  created_at: { $lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
  is_read: true
});

// Archive completed orders (> 1 year)
// Move to separate archive collection
```

---

## Performance Considerations

### Query Optimization
- All foreign keys have indexes
- Compound indexes for common query patterns
- Sparse indexes for optional fields
- TTL indexes for temporary data (if needed)

### Data Volume Estimates
- **Users:** ~500 records
- **Products:** ~1,000 records
- **Territories:** ~500 records
- **Distributors:** ~200 records
- **DemandOrders:** ~100,000/year
- **Collections:** ~50,000/year
- **Inventory Transactions:** ~500,000/year
- **Notifications:** ~1,000,000/year (with cleanup)

---

## End of Database Context

**See Also:**
- [MODULES_OVERVIEW.md](./MODULES_OVERVIEW.md) - Module documentation
- [BACKEND_CONTEXT.md](./BACKEND_CONTEXT.md) - Backend architecture
- [FRONTEND_CONTEXT.md](./FRONTEND_CONTEXT.md) - Frontend architecture
