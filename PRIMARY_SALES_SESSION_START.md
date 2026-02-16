# PRIMARY SALES - Session Start Context

**Last Updated:** February 13, 2026  
**System:** Pusti Happy Times ERP - Primary Sales Module  
**Scope:** Factory/Depot → Distributor (B2B Sales)

---

## 🎯 OVERVIEW

Primary Sales manages the complete order-to-delivery lifecycle from the company (Factories/Depots) to Distributors. This is a B2B sales system handling demand orders, approvals, scheduling, payments, and inventory management.

---

## 📐 ARCHITECTURE

### Tech Stack

- **Backend:** Node.js + Express.js + MongoDB
- **Frontend:** Next.js 14 + TypeScript + Tailwind CSS
- **Authentication:** JWT (Access + Refresh tokens)
- **Permissions:** Role-based API permissions + Page permissions

### Key Collections

1. **demand_orders** - Primary sales orders from distributors
2. **schedulings** - Delivery scheduling and finance approval
3. **delivery_chalans** - Goods delivery documentation
4. **collections** - Payment collection records
5. **customer_ledgers** - Distributor financial ledger
6. **distributor_stocks** - FIFO inventory management
7. **distributors** - Distributor master data
8. **facilities** - Factories and depots

---

## ⚠️ CRITICAL BUSINESS RULE: CTN vs PCS

### Unit Handling in Primary Sales

**PRIMARY SALES ALWAYS USES CTN (CARTONS/CONTAINERS)**

```
Distributor BUYS in CTN from Factory/Depot
```

**Key Points:**

- All stock quantities in CTN
- All order quantities in CTN
- All delivery quantities in CTN
- All invoicing in CTN
- Conversion factor stored in `product.unit_per_case` (pieces per carton)

**Example:**

```javascript
// Demand Order Item
{
  sku: "MILK-500G",
  quantity: 10,        // 10 CARTONS
  unit_per_case: 24,   // 24 pieces per carton
  // Distributor receives: 10 CTN = 240 PCS (for secondary sales)
}
```

**Stock Records (Depot/Factory):**

```javascript
{
  product_id: ObjectId,
  quantity_ctn: 500,   // 500 cartons in stock
  // Secondary conversion happens at distributor level
}
```

**Delivery Chalan:**

```javascript
{
  shipped_qty_ctn: 10,    // Shipped in cartons
  shipped_qty_pcs: 240,   // Informational (10 × 24)
  received_qty_ctn: 10,   // Received in cartons
  received_qty_pcs: 240,  // Converted for secondary stock
}
```

**When Distributor Receives:**

```javascript
// Primary side (this module): Record in CTN
chalan.received_qty_ctn = 10

// Secondary side conversion (happens in distributor stock):
distributor_stock.available_qty_pcs = 10 × 24 = 240
// Distributor now sells 240 pieces to retailers
```

---

## 🔄 PRIMARY SALES WORKFLOW

### 1. DEMAND ORDERS (DO)

**User Roles:** Distributor creates → ASM/RSM/Sales Admin/Order Management/Finance/Distribution approve

**Workflow:**

```
Draft → Submitted →
  → Approved (by ASM/RSM/Sales Admin) →
  → Forwarded to Order Management →
  → Forwarded to Finance →
  → Finance Approves (creates credit entry + scheduling) →
  → Forwarded to Distribution →
  → Scheduling in Progress →
  → Scheduling Completed →
  → Finance Approves Scheduling
```

**Key Features:**

- Dual source items: Products AND Offers
- Real-time stock validation (depot stock - pending DOs)
- Auto-calculation of totals
- Order number format: `DO-YYYYMMDD-XXXXX`
- Shopping cart experience for distributors
- Blacklist SKU support (distributors.skus_exclude)
- Product segment filtering (BIS/BEV/BISBEV)

**API Routes:**

```
GET  /api/v1/ordermanagement/demandorders/catalog/products
GET  /api/v1/ordermanagement/demandorders/catalog/offers
POST /api/v1/ordermanagement/demandorders/validate-cart
GET  /api/v1/ordermanagement/demandorders
POST /api/v1/ordermanagement/demandorders
PUT  /api/v1/ordermanagement/demandorders/:id
POST /api/v1/ordermanagement/demandorders/:id/submit
POST /api/v1/ordermanagement/demandorders/:id/forward-to-rsm
POST /api/v1/ordermanagement/demandorders/:id/forward-to-sales-admin
POST /api/v1/ordermanagement/demandorders/:id/forward-to-order-management
POST /api/v1/ordermanagement/demandorders/:id/forward-to-finance
POST /api/v1/ordermanagement/demandorders/:id/approve (Finance)
POST /api/v1/ordermanagement/demandorders/:id/forward-to-distribution
POST /api/v1/ordermanagement/demandorders/:id/return-to-sales-admin
POST /api/v1/ordermanagement/demandorders/:id/reject
DELETE /api/v1/ordermanagement/demandorders/:id
```

**Files:**

- Backend: `backend/src/models/DemandOrder.js`
- Backend: `backend/src/routes/ordermanagement/demandorders.js`
- Frontend: `frontend/src/app/ordermanagement/demandorders/page.tsx`

---

### 2. SCHEDULING

**User Roles:** Distribution schedules → Finance approves

**Purpose:**

- Progressive/partial delivery scheduling
- Multi-depot delivery management
- Finance approval for scheduled deliveries

**Workflow:**

```
DO Approved →
  Scheduling Created (auto) →
  Distribution Schedules Items (partial/full) →
  Submit to Finance →
  Finance Approves/Rejects →
  Generate Delivery Chalans
```

**Key Features:**

- Item-level scheduling (can schedule items separately)
- Progressive scheduling (schedule 50 today, 50 next week)
- Tracks: `order_qty`, `scheduled_qty`, `unscheduled_qty`
- Depot selection per scheduling event
- Finance approval required before chalan generation
- Multiple scheduling iterations per DO

**Scheduling Status Flow:**

```
Pending-scheduling →
  Scheduling-submitted →
  Approved / Rejected →
  (if rejected, back to Pending-scheduling)
```

**API Routes:**

```
GET  /api/v1/ordermanagement/schedulings
GET  /api/v1/ordermanagement/schedulings/:id
POST /api/v1/ordermanagement/schedulings/:id/schedule
POST /api/v1/ordermanagement/schedulings/:id/submit-to-finance
POST /api/v1/ordermanagement/schedulings/:id/approve (Finance)
POST /api/v1/ordermanagement/schedulings/:id/reject (Finance)
```

**Files:**

- Backend: `backend/src/models/Scheduling.js`
- Backend: `backend/src/routes/ordermanagement/schedulings.js`
- Frontend: `frontend/src/app/ordermanagement/schedulings/page.tsx`

---

### 3. CREDIT ENTRY CREATION

**When:** Finance approves DO (before scheduling)

**Purpose:** Create advance credit for discounts and free products

**Calculation:**

1. **Discounts:** Sum all `offer_details.discount_amount` by offer
2. **Free Products:** Sum `free_qty × db_price` for all free products

**Credit Entry Structure:**

```javascript
{
  distributor_id: ObjectId,
  order_id: ObjectId,
  order_number: String,
  type: "Credit",
  amount: Decimal128, // Total discounts + free products value
  particulars: "Advanced Discounts & Free goods",
  narration: "Detailed breakdown...",
  transaction_date: Date,
  entry_date: Date,
  status: "Posted",
  created_by: userId
}
```

**Files:**

- Backend: `backend/src/routes/ordermanagement/demandorders.js` (Finance approval endpoint)

---

### 4. DELIVERY CHALANS

**User Roles:** Distribution generates → Distributor receives

**Purpose:** Document goods dispatch and receipt

**Workflow:**

```
Scheduling Approved →
  Distribution Generates Chalan →
  Status: Generated →
  Goods Dispatched →
  Status: In-Transit →
  Distributor Receives →
  Status: Received →
  Distributor Stock Updated (FIFO)
```

**Key Features:**

- Chalan number format: `CHL-YYYYMMDD-XXXXX`
- Item-level tracking: `shipped_qty_ctn`, `shipped_qty_pcs`, `received_qty_ctn`, `received_qty_pcs`
- Damage tracking during receipt
- Links to scheduling and DO
- FIFO batch creation on receipt

**API Routes:**

```
GET  /api/v1/ordermanagement/chalans
GET  /api/v1/ordermanagement/chalans/:id
POST /api/v1/ordermanagement/chalans/generate
POST /api/v1/ordermanagement/chalans/:id/receive
```

**Files:**

- Backend: `backend/src/models/DeliveryChalan.js`
- Backend: `backend/src/routes/ordermanagement/chalans.js`
- Frontend: `frontend/src/app/ordermanagement/chalans/page.tsx`

---

### 5. DISTRIBUTOR RECEIVING & FIFO STOCK

**User Roles:** Distributor

**Purpose:** Receive goods and manage inventory with FIFO

**FIFO Implementation:**

- Each received chalan creates FIFO batches
- Batch structure: `{ batch_id, received_date, unit_price, received_qty, consumed_qty, balance_qty }`
- Stock consumption uses oldest batches first (FIFO)
- Tracks batch-level pricing for accurate COGS

**Stock Schema:**

```javascript
{
  product_id: ObjectId,
  distributor_id: ObjectId,
  sku: String,
  batches: [{
    batch_id: String,
    chalan_id: ObjectId,
    received_date: Date,
    unit_price: Number,
    received_qty: Number,
    consumed_qty: Number,
    balance_qty: Number
  }],
  total_balance: Number // Auto-calculated
}
```

**API Routes:**

```
GET /api/v1/distributor/stock
GET /api/v1/distributor/stock/:productId/batches
```

**Files:**

- Backend: `backend/src/models/DistributorStock.js`
- Backend: `backend/src/routes/distributor/stock.js`

---

### 6. COLLECTIONS (PAYMENTS)

**User Roles:** Distributor creates → Finance approves → Accounts posts

**Purpose:** Record payment collections from distributors

**Workflow:**

```
Draft → Submitted →
  Finance Approves →
  Accounts Posts to Ledger →
  Status: Posted
```

**Payment Types:**

- Cash
- Cheque (with cheque details)
- Bank Transfer (BEFTN, NPSB, RTGS)
- Mobile Banking (bKash, Nagad, Rocket)

**Key Features:**

- Collection number format: `COL-YYYYMMDD-XXXXX`
- Attachment support (payment evidence)
- Multi-level approval (Finance → Accounts)
- Auto-posting to customer ledger
- Return capability (if payment bounces)

**Collection Status Flow:**

```
draft → submitted → approved → posted / returned
```

**API Routes:**

```
GET  /api/v1/ordermanagement/collections
POST /api/v1/ordermanagement/collections
PUT  /api/v1/ordermanagement/collections/:id
POST /api/v1/ordermanagement/collections/:id/submit
POST /api/v1/ordermanagement/collections/:id/approve (Finance)
POST /api/v1/ordermanagement/collections/:id/reject (Finance)
POST /api/v1/ordermanagement/collections/:id/post (Accounts)
POST /api/v1/ordermanagement/collections/:id/return
DELETE /api/v1/ordermanagement/collections/:id
```

**Files:**

- Backend: `backend/src/models/Collection.js`
- Backend: `backend/src/routes/ordermanagement/collections.js`
- Frontend: `frontend/src/app/ordermanagement/collections/page.tsx`

---

### 7. CUSTOMER LEDGER

**Purpose:** Financial statement for each distributor

**Ledger Entry Types:**

- **Debit:** DO approvals (increase distributor liability)
- **Credit:** Payments, discounts, free products
- **Balance:** Running balance (Debit - Credit)

**Key Features:**

- Auto-posting from approved DOs
- Auto-posting from posted collections
- Credit entries from Finance-approved discounts/free products
- Historical audit trail
- Opening balance support
- Date-wise chronological ordering

**Ledger Schema:**

```javascript
{
  distributor_id: ObjectId,
  transaction_date: Date,
  entry_date: Date,
  type: "Debit" | "Credit",
  amount: Decimal128,
  balance: Decimal128,
  particulars: String,
  narration: String,
  reference_id: ObjectId, // DO, Collection, or Manual Entry
  reference_type: String, // "DemandOrder", "Collection", "Manual"
  status: "Posted" | "Draft",
  posted_by: ObjectId
}
```

**API Routes:**

```
GET /api/v1/finance/customerledger/:distributorId
GET /api/v1/finance/customerledger/:distributorId/balance
POST /api/v1/finance/customerledger/manual-entry
```

**Files:**

- Backend: `backend/src/models/CustomerLedger.js`
- Backend: `backend/src/routes/finance/customerledger.js`

---

## 🏢 MASTER DATA

### DISTRIBUTORS

**Key Fields:**

```javascript
{
  distributor_id: String (unique, e.g., "DPBIS001"),
  name: String,
  erp_id: Number,
  db_point_id: ObjectId (ref: DBPoint - territory),
  product_segment: Array ["BIS", "BEV", "BISBEV"],
  distributor_type: String,
  mobile: String,
  credit_limit: Decimal128,
  bank_guarantee: Decimal128,
  delivery_depot_id: ObjectId (ref: Facility),
  skus_exclude: [ObjectId] (blacklisted products),
  unit: "CTN" | "PCS",
  active: Boolean
}
```

**Territory Hierarchy:**

```
Division → Region → Zone → Area → DB Point
```

**Bulk Upload:**

- Excel-based distributor import
- Automatic territory assignment
- Validation for duplicates and constraints

**Files:**

- Backend: `backend/src/models/Distributor.js`
- Backend: `backend/src/routes/distributors.js`
- Frontend: `frontend/src/app/distributors/page.tsx`

---

### FACILITIES (Factories + Depots)

**Types:**

- Factory: Manufacturing units
- Depot: Distribution centers

**Key Fields:**

```javascript
{
  facility_name: String,
  facility_type: "factory" | "depot",
  facility_code: String (unique),
  location_id: ObjectId (ref: Location),
  address: String,
  capacity: Number,
  active: Boolean
}
```

**Files:**

- Backend: `backend/src/models/Facility.js`
- Backend: `backend/src/routes/facilities.js`

---

## 🔐 PERMISSIONS & ROLES

### API Permissions

**Demand Orders:**

- `demandorder:read`
- `demandorder:create`
- `demandorder:update`
- `demandorder:delete`
- `demandorder:approve`

**Schedulings:**

- `scheduling:read`
- `scheduling:create`
- `scheduling:update`
- `scheduling:approve`

**Collections:**

- `collection:read`
- `collection:create`
- `collection:update`
- `collection:delete`
- `collection:approve`
- `collection:post`
- `collection:return`

**Chalans:**

- `chalan:read`
- `chalan:create`
- `chalan:receive`

### Page Permissions

- `pgOrders` - Demand Orders page
- `pgSchedulings` - Scheduling page
- `pgCollections` - Collections page
- `pgChalans` - Delivery Chalans page

### Role Assignments

| Role             | Demand Orders     | Scheduling     | Collections      | Chalans           |
| ---------------- | ----------------- | -------------- | ---------------- | ----------------- |
| Distributor      | Create, View Own  | -              | Create, View Own | View Own, Receive |
| ASM              | Approve           | -              | -                | -                 |
| RSM              | Approve           | -              | -                | -                 |
| Sales Admin      | Approve           | -              | -                | -                 |
| Order Management | Approve, Forward  | -              | -                | -                 |
| Finance          | Approve, View All | Approve        | Approve          | -                 |
| Distribution     | View All          | Create, Submit | -                | Create, Generate  |
| Accounts         | -                 | -              | Post to Ledger   | -                 |

---

## 📊 KEY CALCULATIONS

### Available Quantity Formula

```javascript
available_quantity =
  (distributor_depot_qty + product_depots_qty) - pending_qty

where:
  distributor_depot_qty = stock at distributor's delivery_depot_id
  product_depots_qty = sum of stock at all product.depot_ids
  pending_qty = sum of quantities in submitted/approved DOs (not yet received)
```

### Credit Entry Amount

```javascript
credit_amount =
  sum(discount_amount for all offer items) +
  sum(free_qty × db_price for all free products)
```

### Ledger Balance

```javascript
balance = previous_balance + (type === "Debit" ? amount : -amount);
```

---

## 🗂️ FILE STRUCTURE

### Backend

```
backend/src/
├── models/
│   ├── DemandOrder.js
│   ├── Scheduling.js
│   ├── DeliveryChalan.js
│   ├── Collection.js
│   ├── CustomerLedger.js
│   ├── Distributor.js
│   ├── DistributorStock.js
│   └── Facility.js
├── routes/
│   ├── ordermanagement/
│   │   ├── demandorders.js
│   │   ├── schedulings.js
│   │   ├── collections.js
│   │   └── chalans.js
│   ├── distributors.js
│   ├── facilities.js
│   └── finance/
│       └── customerledger.js
└── scripts/
    ├── create-demand-orders-with-inventory.js
    └── setup-demandorder-menu.js
```

### Frontend

```
frontend/src/app/
├── ordermanagement/
│   ├── demandorders/page.tsx
│   ├── schedulings/page.tsx
│   ├── collections/page.tsx
│   └── chalans/page.tsx
├── distributors/page.tsx
├── facilities/page.tsx
└── finance/
    └── customerledger/page.tsx
```

---

## 🚀 IMPLEMENTATION STATUS

### ✅ COMPLETED MODULES

1. **Demand Orders** - Full CRUD, approval workflow, catalog browsing
2. **Scheduling** - Progressive scheduling, Finance approval
3. **Credit Entry** - Auto-creation on DO approval
4. **Delivery Chalans** - Generation, receipt, damage tracking
5. **FIFO Stock Management** - Batch-based inventory
6. **Collections** - Payment recording, multi-level approval
7. **Customer Ledger** - Auto-posting, balance calculation
8. **Distributor Management** - CRUD, bulk upload
9. **Facility Management** - Factory/Depot management

### 🔄 IN PROGRESS

- Advanced reporting and analytics
- Dashboard widgets for primary sales metrics

### 📋 PLANNED

- DO amendment feature
- Schedule modification after Finance approval
- Collection proof OCR/AI validation
- Credit limit enforcement
- Auto-scheduling based on inventory availability

---

## 🧪 TESTING

### Test Data Creation

**Script:** `backend/scripts/create-demand-orders-with-inventory.js`

**Creates:**

- 2 DOs per distributor (24 total if 12 distributors)
- 10+ product categories per DO
- 100-200 units per product
- Varying prices for FIFO testing
- Full approval + receiving + stock entries

**Run:**

```bash
cd backend
node scripts/create-demand-orders-with-inventory.js
```

### Manual Testing Scenarios

1. **Create DO as Distributor**
   - Login as distributor
   - Browse catalog
   - Add items to cart
   - Validate quantities
   - Submit order

2. **Approval Workflow**
   - ASM approves
   - RSM approves
   - Sales Admin forwards to Finance
   - Finance approves (check credit entry created)

3. **Scheduling**
   - Distribution schedules items
   - Finance approves scheduling
   - Check chalan generation availability

4. **Receiving**
   - Distributor receives chalan
   - Mark damages if any
   - Verify FIFO batches created

5. **Collections**
   - Distributor creates collection
   - Finance approves
   - Accounts posts to ledger
   - Verify ledger balance updated

---

## 🐛 KNOWN ISSUES & LIMITATIONS

1. **Free Products Pricing:**
   - Assumes `db_price` exists in Product collection
   - Raw materials may not have `db_price`
   - Solution: Only MANUFACTURED products should be in offers

2. **Credit Limit Enforcement:**
   - Currently not blocking DOs exceeding credit limit
   - Planned feature for future release

3. **Schedule Modification:**
   - Cannot modify scheduling after Finance approval
   - Must create new scheduling iteration

4. **DO Amendment:**
   - Not yet implemented
   - Must cancel and recreate DO

---

## 📚 DOCUMENTATION REFERENCES

- `DEMAND_ORDERS_IMPLEMENTATION.md` - Complete DO implementation guide
- `DISTRIBUTION_SCHEDULING_COMPLETE.md` - Scheduling module details
- `COLLECTIONS_COMPLETE_IMPLEMENTATION.md` - Payment collections
- `DISTRIBUTOR_RECEIVING_COMPLETE.md` - Chalan receiving process
- `DISTRIBUTOR_STOCK_FIFO_IMPLEMENTATION.md` - FIFO inventory system
- `DISTRIBUTOR_BULK_UPLOAD_IMPLEMENTATION.md` - Bulk distributor import
- `DATABASE_SCHEMA.md` - Complete schema documentation
- `BACKEND_CONTEXT.md` - Backend architecture overview
- `FRONTEND_CONTEXT.md` - Frontend structure and patterns

---

## 🎯 SESSION START CHECKLIST

Before starting a new session:

- [ ] Review current implementation status
- [ ] Check for new requirements or bug reports
- [ ] Understand user role and workflow context
- [ ] Review relevant model schemas
- [ ] Check API route permissions
- [ ] Verify test data availability
- [ ] Review related documentation files

---

## 💡 BEST PRACTICES

1. **Always validate stock** before allowing DO submission
2. **Use transactions** for multi-collection operations (DO approval + credit entry)
3. **Populate references** in API responses for better frontend UX
4. **Log approval history** in embedded arrays for audit trail
5. **Use Decimal128** for all monetary values
6. **Include timestamps** for all state changes
7. **Validate user roles** for approval actions
8. **Test FIFO consumption** when adding new stock operations

---

**END OF PRIMARY SALES SESSION START CONTEXT**
