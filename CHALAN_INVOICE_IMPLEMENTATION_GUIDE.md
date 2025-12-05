# Chalan & Invoice Implementation Guide

**Module**: Inventory Depot - Load Sheet Lock, Chalan & Invoice Generation
**Date**: December 4, 2025

---

## ✅ COMPLETED: Database Models

### 1. LoadSheet Model Updates

**File**: `backend/src/models/LoadSheet.js`

**Added Fields**:

```javascript
transport_id: ObjectId ref Transport
locked_at: Date
locked_by: ObjectId ref User
```

**Updated Status Enum**:

```javascript
[
  "Draft",
  "Locked",
  "Chalan_Generated",
  "Invoice_Generated",
  "Completed",
  "Validated",
  "Loading",
  "Loaded",
  "Converted",
];
```

**Vehicle Info**: Made optional (not required until lock)

---

### 2. DeliveryChalan Model

**File**: `backend/src/models/DeliveryChalan.js`

**Structure**:

```javascript
{
  chalan_no: String (unique, indexed) // Format: SHABNAM-INV-202511271|4609-595859
  load_sheet_id: ObjectId ref LoadSheet
  distributor_id: ObjectId ref Distributor
  distributor_name: String
  distributor_address: String
  distributor_phone: String
  depot_id: ObjectId ref Facility
  depot_name: String
  transport_id: ObjectId ref Transport
  transport_name: String
  vehicle_no: String
  driver_name: String
  driver_phone: String
  items: [{
    do_number: String
    sku: String
    sku_name: String
    uom: String (default: "CTN")
    qty_ctn: Decimal128
    qty_pcs: Decimal128
  }]
  total_qty_ctn: Decimal128
  total_qty_pcs: Decimal128
  chalan_date: Date (default: now)
  remarks: String
  status: ["Generated", "Delivered", "Cancelled"]
  created_by: ObjectId ref User
  delivered_at: Date
  delivered_by: ObjectId ref User
}
```

---

### 3. DeliveryInvoice Model

**File**: `backend/src/models/DeliveryInvoice.js`

**Structure**:

```javascript
{
  invoice_no: String (unique, indexed)
  load_sheet_id: ObjectId ref LoadSheet
  chalan_id: ObjectId ref DeliveryChalan
  distributor_id: ObjectId ref Distributor
  distributor_name: String
  distributor_address: String
  distributor_phone: String
  depot_id: ObjectId ref Facility
  depot_name: String
  items: [{
    do_number: String
    sku: String
    sku_name: String
    uom: String
    qty_ctn: Decimal128
    qty_pcs: Decimal128
    dp_price: Decimal128
    amount: Decimal128 // qty_ctn * dp_price
  }]
  subtotal: Decimal128
  tax_amount: Decimal128
  tax_percentage: Decimal128
  total_amount: Decimal128
  invoice_date: Date (default: now)
  due_date: Date
  remarks: String
  status: ["Generated", "Paid", "Partial", "Cancelled"]
  payment_status: ["Unpaid", "Partial", "Paid"]
  paid_amount: Decimal128
  created_by: ObjectId ref User

  // Debit Entry Fields
  voucher_type: String (default: "INV")
  voucher_no: String // DO Number
  particulars: String
}
```

---

## 🔧 PENDING: Backend APIs

### API 1: Lock Load Sheet

**Endpoint**: `PUT /api/v1/inventory/load-sheets/:id/lock`
**Permission**: `load-sheet:lock`
**Role**: Inventory Depot

**Request Body**:

```javascript
{
  transport_id: "mongo_id",
  vehicle_no: "DHK-123456",
  driver_name: "John Doe",
  driver_phone: "01712345678",
  adjustments: [
    {
      distributor_id: "mongo_id",
      do_items: [
        {
          sku: "ALO-150G-MGV5SQ9K-QSNY",
          delivery_qty: 3 // Can be reduced, not increased
        }
      ]
    }
  ]
}
```

**Process Flow**:

1. Validate load sheet exists and status = "Draft"
2. Validate transport_id exists in Transport model
3. Validate adjustments:
   - Can only reduce quantities, not increase
   - Cannot exceed originally planned quantities
4. Update load sheet:
   - Set transport_id, vehicle_no, driver_name, driver_phone
   - Update distributor do_items with adjusted quantities
   - Set status = "Locked"
   - Set locked_at = now, locked_by = user_id
5. Update stock:
   - For each SKU: Release blocked_qty (from draft quantities)
   - For each SKU: Deduct qty_ctn by actual locked quantities
6. Return updated load sheet

**Response**:

```javascript
{
  success: true,
  message: "Load sheet locked successfully",
  data: { load_sheet }
}
```

---

### API 2: Generate Chalans

**Endpoint**: `POST /api/v1/inventory/load-sheets/:id/generate-chalans`
**Permission**: `chalan:create`
**Role**: Inventory Depot

**Request Body**: None (uses load sheet data)

**Process Flow**:

1. Validate load sheet exists and status = "Locked"
2. For each distributor in load sheet:
   a. Generate chalan_no: `{DEPOT_CODE}-INV-{YYYYMMDDHHMM}-{RANDOM6}`
   b. Get distributor details (name, address, phone)
   c. Calculate totals (sum of qty_ctn, qty_pcs)
   d. Create DeliveryChalan document
   e. Add chalan_id to load_sheet.chalan_ids array
3. Update load sheet status:
   - If all distributors have chalans: status = "Chalan_Generated"
4. Return array of created chalans

**Response**:

```javascript
{
  success: true,
  message: "Chalans generated successfully",
  data: {
    chalans: [{ _id, chalan_no, distributor_name, total_qty_ctn }],
    count: 2
  }
}
```

---

### API 3: Generate Invoices

**Endpoint**: `POST /api/v1/inventory/load-sheets/:id/generate-invoices`
**Permission**: `invoice:create`
**Role**: Inventory Depot

**Request Body**: None (uses load sheet and DO pricing data)

**Process Flow**:

1. Validate load sheet exists and status = "Locked" or "Chalan_Generated"
2. For each distributor in load sheet:
   a. Generate invoice_no: `INV-{YYYYMMDD}-{DEPOT_CODE}-{SEQ}`
   b. Get distributor details
   c. For each item:
   - Get dp_price from original DemandOrder scheduling_details
   - Calculate amount = qty_ctn \* dp_price
     d. Calculate subtotal (sum of amounts)
     e. Calculate tax if applicable
     f. Calculate total_amount
     g. Set voucher_no = first DO number of distributor
     h. Set particulars = `Invoice for DO ${voucher_no} - ${distributor_name}`
     i. Create DeliveryInvoice document
     j. Add invoice_id to load_sheet.invoice_ids array
     k. **Create Debit Entry** (if accounting module exists):
   - Debit: Distributor Account (AR)
   - Credit: Sales Account
   - Amount: total_amount
3. Update load sheet status:
   - If has chalans and invoices: status = "Completed"
   - Else: status = "Invoice_Generated"
4. Return array of created invoices

**Response**:

```javascript
{
  success: true,
  message: "Invoices generated successfully",
  data: {
    invoices: [{ _id, invoice_no, distributor_name, total_amount }],
    count: 2
  }
}
```

---

### API 4: Get Chalan Details

**Endpoint**: `GET /api/v1/inventory/chalans/:id`
**Permission**: `chalan:read`

**Response**: Full chalan document with populated references

---

### API 5: Get Invoice Details

**Endpoint**: `GET /api/v1/inventory/invoices/:id`
**Permission**: `invoice:read`

**Response**: Full invoice document with populated references

---

### API 6: List Chalans

**Endpoint**: `GET /api/v1/inventory/chalans`
**Permission**: `chalan:read`
**Query Params**: page, limit, status, distributor_id, date_from, date_to

---

### API 7: List Invoices

**Endpoint**: `GET /api/v1/inventory/invoices`
**Permission**: `invoice:read`
**Query Params**: page, limit, status, payment_status, distributor_id, date_from, date_to

---

## 🎨 PENDING: Frontend UI Pages

### Page 1: Lock Load Sheet (Review & Finalize)

**Route**: `/inventory/load-sheets/:id/lock`
**Component**: `app/inventory/load-sheets/[id]/lock/page.tsx`
**Design**: Mobile-First

**Layout**:

```
┌─────────────────────────────────┐
│ ← Lock Load Sheet               │
│ Load Sheet #LS-202512-001       │
├─────────────────────────────────┤
│ 📦 Transport Details            │
│                                 │
│ Transport: [Dropdown]           │
│ Vehicle No: [Input]             │
│ Driver Name: [Input]            │
│ Driver Phone: [Input]           │
├─────────────────────────────────┤
│ 📋 Review & Adjust Quantities   │
│                                 │
│ Dist Test (101010)              │
│ ┌─────────────────────────────┐ │
│ │ DO: DO-2025-101010-0001     │ │
│ │ SKU: ALO-150G               │ │
│ │ Planned: 5 CTN              │ │
│ │ Stock: 3 CTN available      │ │
│ │ Adjust: [3] CTN ▼           │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ DO: DO-2025-101010-0001     │ │
│ │ SKU: ALO-75G                │ │
│ │ Planned: 2 CTN              │ │
│ │ Adjust: [2] CTN ▼           │ │
│ └─────────────────────────────┘ │
│                                 │
│ DistBIS (3333) - 12 items...    │
├─────────────────────────────────┤
│ 📊 Summary                      │
│ Total Distributors: 2           │
│ Total Items: 13                 │
│ Total Quantity: 45 CTN          │
├─────────────────────────────────┤
│ [Cancel] [Lock & Finalize] →   │
└─────────────────────────────────┘
```

**Functionality**:

- Fetch Transport dropdown from Transport model
- Pre-fill with load sheet data
- Allow reducing quantities (validate against stock)
- Show warnings if reducing below originally requested
- On submit: Call Lock API, show success, redirect to load sheet view

---

### Page 2: Load Sheet View (Updated)

**Route**: `/distribution/load-sheets/:id/page.tsx`
**Updates Needed**:

**Add buttons based on status**:

```javascript
// Status: Draft
<Button onClick={navigateToLock}>Lock & Finalize</Button>

// Status: Locked
<Button onClick={generateChalans}>Generate Chalans</Button>
<Button onClick={generateInvoices}>Generate Invoices</Button>

// Status: Chalan_Generated
<Button onClick={viewChalans}>View Chalans</Button>
<Button onClick={generateInvoices}>Generate Invoices</Button>

// Status: Invoice_Generated or Completed
<Button onClick={viewChalans}>View Chalans</Button>
<Button onClick={viewInvoices}>View Invoices</Button>
```

**Add status badge**:

- Draft: Blue
- Locked: Orange
- Chalan_Generated: Purple
- Invoice_Generated: Teal
- Completed: Green

---

### Page 3: Chalan PDF Viewer

**Route**: `/inventory/chalans/:id/view`
**Component**: `app/inventory/chalans/[id]/view/page.tsx`

**Layout**: 4 tabs for 4 copies

```
┌─────────────────────────────────┐
│ [CUSTOMER COPY] [OFFICE COPY]   │
│ [TRANSPORT COPY] [GATE PASS]    │
├─────────────────────────────────┤
│                                 │
│    T.K Food Products Ltd.       │
│    Delivery Challan             │
│                                 │
│    [PDF Content]                │
│                                 │
│                                 │
├─────────────────────────────────┤
│ [Download PDF] [Print]          │
└─────────────────────────────────┘
```

**PDF Format** (A4 Portrait):

```
┌────────────────────────────────┐
│ [LOGO]  T.K Food Products Ltd. │ CUSTOMER
│         Address...              │ COPY
│                                 │
│      Delivery Challan           │ Date: 27-Nov-2025
│ Challan No: SHABNAM-INV-        │
│             202511271|4609-...  │
│                                 │
│ To:                        From:│
│ SOHAG ENTERPRISE           Factory/Depot Name:│
│ Address: CHATMOHOR...      Shabnam│
│ Phone: 8801720-354428      Transport Name:    │
│                            Kashem & Brothers  │
│                            Vehicle No: DH KA...│
│                            Driver Name: SANTO │
│                            Driver Phone: 016..│
│                                 │
│ No. │DO No │Sku Name│UOM│Qty CTN│Qty PCS│
│ ────┼──────┼────────┼───┼───────┼───────│
│  1  │86018 │FG.RAN  │CTN│ 68.00 │1,632  │
│     │5622- │NA.RSO  │   │       │       │
│     │12701 │.500ML  │   │       │       │
│     │456   │        │   │       │       │
│  2  │86018 │FG.RAN  │CTN│ 50.00 │ 800.00│
│     │5622- │NA.RSO  │   │       │       │
│     │12701 │.1L     │   │       │       │
│     │456   │        │   │       │       │
│  3  │86018 │FG.RAN  │CTN│ 10.00 │  40.00│
│     │5622- │NA.RSO  │   │       │       │
│     │12701 │.5L     │   │       │       │
│     │456   │        │   │       │       │
│ ────┴──────┴────────┴───┴───────┴───────│
│           Total         128.00  2,472.00 │
│                                 │
│ Remarks:                        │
│                                 │
│                                 │
│ Receiver    Driver    SIC       │
│ Signature   Signature Signature │
│                                 │
│ DIC         HOD                 │
│ Signature   Signature           │
└────────────────────────────────┘
```

**4 Copies**:
Each copy identical except top-right label:

1. CUSTOMER COPY
2. OFFICE COPY
3. TRANSPORT COPY
4. GATE PASS COPY

**Implementation**: Use jsPDF + autoTable (landscape A4)

---

### Page 4: Invoice PDF Viewer

**Route**: `/inventory/invoices/:id/view`
**Component**: `app/inventory/invoices/[id]/view/page.tsx`

**Layout**: 2 tabs for 2 copies

```
┌─────────────────────────────────┐
│ [CUSTOMER COPY] [OFFICE COPY]   │
├─────────────────────────────────┤
│                                 │
│    T.K Food Products Ltd.       │
│    Tax Invoice                  │
│                                 │
│    [PDF Content with Pricing]   │
│                                 │
│                                 │
├─────────────────────────────────┤
│ [Download PDF] [Print]          │
└─────────────────────────────────┘
```

**PDF Format** (A4 Portrait):
Similar to Chalan but with additional columns:

```
│ No. │DO No │Sku │UOM│Qty CTN│Qty PCS│DP Price│Amount│
│ ────┼──────┼────┼───┼───────┼───────┼────────┼──────│
│  1  │86018 │FG. │CTN│ 68.00 │1,632  │ 424.65 │28,876│
│     │5622  │RAN │   │       │       │        │      │
│  2  │86018 │FG. │CTN│ 50.00 │ 800   │ 256.50 │12,825│
│ ────┴──────┴────┴───┴───────┴───────┴────────┴──────│
│                              Subtotal:     41,701.00 │
│                              Tax (0%):          0.00 │
│                              Total:        41,701.00 │
```

**2 Copies**:

1. CUSTOMER COPY
2. OFFICE COPY

---

### Page 5: Chalans List

**Route**: `/inventory/chalans`
**Component**: `app/inventory/chalans/page.tsx`

**Table Columns**:

- Chalan No
- Distributor Name
- Chalan Date
- Total Qty CTN
- Status
- Actions (View, Print)

---

### Page 6: Invoices List

**Route**: `/inventory/invoices`
**Component**: `app/inventory/invoices/page.tsx`

**Table Columns**:

- Invoice No
- Distributor Name
- Invoice Date
- Total Amount
- Payment Status
- Status
- Actions (View, Print, Record Payment)

---

## 🔐 PENDING: Permissions & Menu Items

### API Permissions to Create

```javascript
// Load Sheet Permissions
{
  name: "load-sheet:lock",
  description: "Lock and finalize load sheet",
  module: "Inventory",
  type: "write"
}

// Chalan Permissions
{
  name: "chalan:create",
  description: "Generate delivery chalans",
  module: "Inventory",
  type: "write"
},
{
  name: "chalan:read",
  description: "View delivery chalans",
  module: "Inventory",
  type: "read"
},
{
  name: "chalan:print",
  description: "Print delivery chalans",
  module: "Inventory",
  type: "read"
}

// Invoice Permissions
{
  name: "invoice:create",
  description: "Generate invoices",
  module: "Inventory",
  type: "write"
},
{
  name: "invoice:read",
  description: "View invoices",
  module: "Inventory",
  type: "read"
},
{
  name: "invoice:print",
  description: "Print invoices",
  module: "Inventory",
  type: "read"
}
```

### Role Permissions (Inventory Depot)

Add to role with role="Inventory Depot" (not name):

- load-sheet:lock
- chalan:create
- chalan:read
- chalan:print
- invoice:create
- invoice:read
- invoice:print

### Menu Items

```javascript
// Under "Inventory" parent menu
{
  label: "Delivery Chalans",
  href: "/inventory/chalans",
  icon: "FileText",
  m_order: 45,
  parent_id: [inventory_parent_id],
  is_submenu: true
},
{
  label: "Invoices",
  href: "/inventory/invoices",
  icon: "Receipt",
  m_order: 46,
  parent_id: [inventory_parent_id],
  is_submenu: true
}
```

Assign to "Inventory Depot" role.

---

## 📊 Status Flow Diagram

```
Draft
  │
  ├─ Lock & Finalize (with transport details) → Locked
  │
Locked
  │
  ├─ Generate Chalans → Chalan_Generated
  │
  ├─ Generate Invoices (without chalans) → Invoice_Generated
  │
Chalan_Generated
  │
  ├─ Generate Invoices → Completed
  │
Invoice_Generated
  │
  ├─ Generate Chalans → Completed
  │
Completed
  (End state - both chalans and invoices created)
```

---

## 🔄 Stock Movement Flow

### On Create Load Sheet (Draft)

```
DepotStock.blocked_qty += requested_qty
```

### On Lock Load Sheet

```
// Release all blocked from draft
DepotStock.blocked_qty -= original_requested_qty

// Deduct actual locked quantities
DepotStock.qty_ctn -= actual_locked_qty
```

**Note**: This means stock is physically deducted when locked, not when chalan/invoice generated.

---

## 📝 Number Generation Patterns

### Chalan Number

```
{DEPOT_CODE}-INV-{YYYYMMDDHHMM}-{RANDOM6}

Example: SHABNAM-INV-202511271146-595859
```

### Invoice Number

```
INV-{YYYYMMDD}-{DEPOT_CODE}-{SEQ}

Example: INV-20251127-SHABNAM-0001
```

Sequence resets daily per depot.

---

## 🎯 Key Business Rules

1. **Cannot lock without transport details** - All fields required
2. **Cannot increase quantities during lock** - Only reduce or keep same
3. **Stock physically deducted on lock** - Not on chalan/invoice generation
4. **Chalan and Invoice are independent** - Can create in any order after lock
5. **Must be locked before chalan/invoice** - Cannot generate from Draft
6. **4 chalan copies, 2 invoice copies** - Different labels only
7. **Voucher No = First DO Number** - Used for debit entry reference
8. **DP Price from original DO** - Fetch from scheduling_details
9. **Debit Entry auto-created** - When invoice generated

---

## 🚀 Implementation Order

### Phase 1: Backend Foundation

1. Lock Load Sheet API
2. Generate Chalans API
3. Generate Invoices API

### Phase 2: Frontend UI

4. Lock Load Sheet page
5. Update Load Sheet View page (add buttons)
6. Chalan List page
7. Invoice List page

### Phase 3: PDF Generation

8. Chalan PDF generation (4 copies)
9. Invoice PDF generation (2 copies)

### Phase 4: Permissions & Access

10. Create API permissions
11. Add to Inventory Depot role
12. Create menu items
13. Testing

---

## ✅ Review Checklist

Before implementation:

- [ ] Chalan number format approved?
- [ ] Invoice number format approved?
- [ ] Tax calculation needed? (currently 0%)
- [ ] Debit entry accounting integration?
- [ ] Signature fields sufficient?
- [ ] PDF layout matches requirements?
- [ ] Status flow makes sense?
- [ ] Stock deduction timing correct?

---

## 📞 Questions for Clarification

1. **Tax Calculation**: Do we need to calculate tax? If yes, what percentage?
2. **Debit Entry**: Do we have an existing accounting module to integrate with?
3. **Chalan/Invoice Order**: Must chalan be created before invoice, or independent?
4. **Payment Tracking**: Should invoices have payment recording functionality?
5. **Signature Capture**: Digital signatures or just print with blank lines?
6. **Numbering Sequence**: Should sequence be depot-specific or company-wide?
7. **Date Flexibility**: Can chalan/invoice date be edited or always today?

---

**End of Implementation Guide**
