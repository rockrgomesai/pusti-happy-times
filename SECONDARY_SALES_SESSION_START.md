# SECONDARY SALES - Session Start Context

**Last Updated:** February 13, 2026  
**System:** Pusti Happy Times ERP - Secondary Sales Module  
**Scope:** Distributor → Retailer/Outlet (Field Force Management)

---

## 🎯 OVERVIEW

Secondary Sales manages the complete field force operations from Distributors to Retail Outlets (Point of Sale). This is a field automation system covering outlet management, sales officer (SO) operations, order taking, delivery tracking, GPS monitoring, and comprehensive analytics.

**Key Concept:** While Primary Sales is Factory→Distributor, Secondary Sales is Distributor→Retailer through field staff.

---

## 📐 ARCHITECTURE

### Tech Stack

- **Backend:** Node.js + Express.js + MongoDB
- **Frontend:** Next.js 14 + TypeScript + Tailwind CSS
- **Mobile:** React Native 0.83.1 (Android + iOS)
- **Authentication:** JWT with role-based permissions
- **Geospatial:** MongoDB 2dsphere indexing for GPS operations

### Key Collections

1. **outlets** (POS) - Retail points of sale
2. **routes** - Logical groupings of outlets
3. **dsrs** - Distributor Sales Representatives
4. **secondaryorders** - Outlet orders
5. **secondarydeliveries** - Delivery documentation
6. **outlet_visits** - Visit tracking and coverage
7. **attendance** - SO/DSR attendance records
8. **tracking_sessions** - GPS movement tracking
9. **tracking_locations** - GPS point data

---

## ⚠️ CRITICAL BUSINESS RULE: PCS vs CTN

### Unit Handling in Secondary Sales

**SECONDARY SALES ALWAYS USES PCS (PIECES)**

```
Distributor SELLS in PCS to Retailers/Outlets
```

**Key Points:**

- Distributor buys in CTN (Primary Sales)
- Distributor stock converted to PCS
- All secondary orders in PCS
- All deliveries to outlets in PCS
- All invoicing to outlets in PCS

**Conversion Flow:**

```
[Primary] Distributor receives: 10 CTN
          ↓ (× unit_per_case)
[Secondary] Distributor stock: 240 PCS (10 × 24)
            ↓
[Secondary] Outlet orders: 50 PCS
            ↓
[Secondary] Delivery: 50 PCS
            ↓
[Stock Deduction] -50 PCS from 240 = 190 PCS remaining
```

**Example Product:**

```javascript
{
  sku: "MILK-500G",
  unit_per_case: 24,  // 24 pieces per carton
  dp_price: 2400,     // Distributor Price per CTN
  tp_price: 110,      // Trade Price per PCS to retailer
  // Margin = (110 × 24) - 2400 = 240 per carton
}
```

**Distributor Stock (After Primary Receipt):**

```javascript
{
  product_id: ObjectId,
  distributor_id: ObjectId,
  batches: [{
    received_qty_ctn: 10,      // What they bought (Primary)
    received_qty_pcs: 240,     // Converted (10 × 24)
    consumed_qty_pcs: 50,      // Sold to outlets (Secondary)
    balance_qty_pcs: 190,      // Remaining stock in PCS
    unit_price_per_ctn: 2400,  // Buying price
    unit_price_per_pcs: 100    // Cost per piece (2400 ÷ 24)
  }]
}
```

**Secondary Order (Outlet to Distributor):**

```javascript
{
  outlet_id: ObjectId,
  distributor_id: ObjectId,
  items: [{
    product_id: ObjectId,
    sku: "MILK-500G",
    quantity: 50,        // 50 PIECES (not cartons!)
    unit_price: 110,     // Trade Price per PIECE
    subtotal: 5500       // 50 × 110
  }],
  total_amount: 5500
}
```

**Stock Deduction Logic:**

```javascript
// When delivering 50 PCS to outlet:
// Use FIFO to find oldest batch
// Deduct 50 from batch.balance_qty_pcs

// FIFO calculation:
batch.consumed_qty_pcs += 50;
batch.balance_qty_pcs -= 50; // 240 - 50 = 190 PCS

// COGS = 50 × (batch.unit_price_per_ctn ÷ unit_per_case)
//      = 50 × (2400 ÷ 24) = 50 × 100 = 5000
```

**Mobile App Display:**

```
SO views product catalog:
- SKU: MILK-500G
- Available: 190 PCS  ← Always in pieces
- Price: ৳110 per piece
- Min Order: 12 PCS (or multiples)
```

**Reporting - Unit Conversions:**

```javascript
// Reports may show both units for clarity:
{
  sku: "MILK-500G",
  ordered_qty_pcs: 240,
  ordered_qty_ctn: 10,        // 240 ÷ 24 = 10 (informational)
  delivered_qty_pcs: 50,
  delivered_qty_ctn: 2.08,    // 50 ÷ 24 = 2.08 (partial carton)
  balance_qty_pcs: 190,
  balance_qty_ctn: 7.92       // 190 ÷ 24 = 7.92
}
```

---

## 🔄 SECONDARY SALES WORKFLOW

### 1. OUTLET MANAGEMENT

**Purpose:** Master data for retail points of sale

**Outlet Types:**

- Retail Shop
- Restaurant
- Hotel
- Grocery Store
- Supermarket
- Pharmacy
- Others

**Key Fields:**

```javascript
{
  outlet_number: String (unique, auto-generated),
  outlet_name: String,
  owner_name: String,
  mobile: String,
  address: String,
  location: {
    type: "Point",
    coordinates: [longitude, latitude]
  },
  route_id: ObjectId (ref: Route),
  distributor_id: ObjectId (ref: Distributor),
  dsr_id: ObjectId (ref: DSR, optional),
  outlet_type: String,
  market_size: String ["Small", "Medium", "Large"],
  visit_frequency: String ["Daily", "Weekly", "Bi-Weekly", "Monthly"],
  operation_status: String ["Active", "Closed", "Seasonal"],
  active: Boolean
}
```

**Geospatial Features:**

- 2dsphere index on `location` field
- Proximity-based outlet discovery for SOs
- GPS-based visit validation
- Territory boundary checking

**API Routes:**

```
GET  /api/v1/outlets
POST /api/v1/outlets
GET  /api/v1/outlets/:id
PUT  /api/v1/outlets/:id
DELETE /api/v1/outlets/:id
GET  /api/v1/outlets/nearby (geospatial query)
POST /api/v1/outlets/bulk-upload (Excel import)
```

**Files:**

- Backend: `backend/src/models/Outlet.js`
- Backend: `backend/src/routes/outlets.js`
- Frontend: `frontend/src/app/outlets/page.tsx`

---

### 2. ROUTE MANAGEMENT

**Purpose:** Organize outlets into logical visit routes

**Route Structure:**

```javascript
{
  route_name: String,
  route_code: String (unique),
  dsr_id: ObjectId (ref: DSR),
  distributor_id: ObjectId (ref: Distributor),
  territory_id: ObjectId (ref: Territory),
  outlets: [ObjectId] (ref: Outlet),
  visit_day: String ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  scheduled_outlets: Number,
  active: Boolean
}
```

**Features:**

- Day-wise route scheduling
- SO/DSR assignment
- Outlet count tracking
- Territory-based grouping
- Coverage planning

**API Routes:**

```
GET  /api/v1/routes
POST /api/v1/routes
GET  /api/v1/routes/:id
PUT  /api/v1/routes/:id
DELETE /api/v1/routes/:id
GET  /api/v1/routes/by-dsr/:dsrId
```

**Files:**

- Backend: `backend/src/models/Route.js`
- Backend: `backend/src/routes/routes.js`

---

### 3. DSR (DISTRIBUTOR SALES REPRESENTATIVE)

**Purpose:** Field staff master data

**DSR Types:**

- SO (Sales Officer) - Primary field staff
- DSR (Distributor Sales Rep)
- Territory Sales Officer (TSO)
- Sub-Distributor (SDB)

**Schema:**

```javascript
{
  dsr_name: String,
  dsr_code: String (unique, auto-generated),
  distributor_id: ObjectId (ref: Distributor),
  user_id: ObjectId (ref: User, for app login),
  mobile: String,
  email: String,
  nid_number: String,
  date_of_birth: Date,
  gender: String,
  designation: String,
  employment_type: String ["Permanent", "Contract", "Part-time"],
  joining_date: Date,
  territory_id: ObjectId (ref: Territory),
  routes: [ObjectId] (ref: Route),
  active: Boolean
}
```

**Files:**

- Backend: `backend/src/models/DSR.js`
- Backend: `backend/src/routes/dsrs.js`

---

### 4. OUTLET VISITS & COVERAGE

**Purpose:** Track SO visits and product availability at outlets

**Visit Workflow (Mobile App):**

```
1. SO selects route for the day
2. GPS tracking enabled
3. SO navigates to outlet (map-based)
4. Proximity detection (within 50-100m)
5. Mark shop status (Open/Closed)
6. If Open:
   - Check product coverage (which brands available)
   - Place order OR record reason for no order
7. Submit visit data
8. Move to next outlet
```

**Visit Schema:**

```javascript
{
  visit_id: String (unique),
  dsr_id: ObjectId (ref: DSR),
  outlet_id: ObjectId (ref: Outlet),
  route_id: ObjectId (ref: Route),
  visit_date: Date,
  check_in_time: Date,
  check_out_time: Date,
  duration_minutes: Number,
  shop_status: String ["Open", "Closed"],
  coverage_data: {
    brands_available: [ObjectId], // Which TK brands present
    brands_checked: [ObjectId]
  },
  order_status: String ["Order_Placed", "No_Order"],
  no_order_reason: String,
  location: {
    type: "Point",
    coordinates: [longitude, latitude]
  },
  accuracy: Number,
  notes: String
}
```

**Coverage Tracking:**

- Which company brands are available at outlet
- Brand presence tracking over time
- Coverage percentage per route/territory
- Time-series analysis of brand penetration

**Proximity Validation:**

- Must be within configured distance (default 100m)
- Uses Haversine formula for distance calculation
- Prevents remote order placement fraud

**Files:**

- Backend: `backend/src/models/OutletVisit.js`
- Backend: `backend/src/routes/visits.js`

---

### 5. SECONDARY ORDERS

**Purpose:** Orders placed by SO at retail outlets

**Order Types:**

- Manual Entry - SO inputs order details
- System-based - SO selects from product list
- OTC (Over The Counter) - Immediate cash sales

**Order Schema:**

```javascript
{
  order_number: String (unique, auto-generated),
  outlet_id: ObjectId (ref: Outlet),
  distributor_id: ObjectId (ref: Distributor),
  dsr_id: ObjectId (ref: DSR),
  route_id: ObjectId (ref: Route),
  visit_id: ObjectId (ref: OutletVisit),
  order_date: Date,
  items: [{
    product_id: ObjectId,
    sku: String,
    quantity: Number,
    unit_price: Number, // TP (Trade Price) or DP
    subtotal: Number
  }],
  total_amount: Number,
  order_status: String ["Draft", "Submitted", "Approved", "Delivered", "Cancelled"],
  delivery_status: String ["Pending", "Partial", "Full", "Failed"],
  gps_location: {
    type: "Point",
    coordinates: [longitude, latitude]
  },
  created_via: String ["Mobile_App", "Web_Portal"],
  notes: String
}
```

**Order Workflow:**

```
Draft → Submitted →
  Approved (by Distributor/Manager) →
  Scheduled for Delivery →
  Delivered (full/partial) →
  Closed
```

**Pricing:**

- **TP (Trade Price):** Price to retailer
- **DP (Distributor Price):** What distributor paid
- **Margin:** TP - DP

**Files:**

- Backend: `backend/src/models/SecondaryOrder.js`
- Backend: `backend/src/routes/secondaryorders.js`

---

### 6. ORDER AMENDMENT

**Purpose:** Modify orders before delivery

**Amendment Types:**

- Add items
- Remove items
- Change quantities
- Cancel order

**Restrictions:**

- Only before delivery scheduling
- Requires approval for significant changes
- Audit trail maintained

---

### 7. SECONDARY DELIVERIES

**Purpose:** Track delivery of orders to outlets

**Delivery Schema:**

```javascript
{
  delivery_number: String (unique),
  order_id: ObjectId (ref: SecondaryOrder),
  outlet_id: ObjectId (ref: Outlet),
  distributor_id: ObjectId (ref: Distributor),
  dsr_id: ObjectId (ref: DSR - delivery person),
  delivery_date: Date,
  items: [{
    product_id: ObjectId,
    ordered_qty: Number,
    delivered_qty: Number,
    damaged_qty: Number,
    variance: Number // ordered - delivered - damaged
  }],
  delivery_status: String ["Pending", "In-Transit", "Delivered", "Failed"],
  delivery_location: GeoJSON,
  delivery_time: Date,
  received_by: String (outlet person name),
  signature: String (base64 image),
  notes: String
}
```

**Delivery Workflow:**

```
Order Approved →
  Scheduled →
  Picked from Stock →
  In-Transit →
  Delivered to Outlet →
  Proof of Delivery Captured →
  Stock Deducted
```

**Files:**

- Backend: `backend/src/models/SecondaryDelivery.js`
- Backend: `backend/src/routes/deliveries.js`

---

### 8. ATTENDANCE MANAGEMENT

**Purpose:** Track SO/DSR daily attendance

**Attendance Types:**

- On-Time
- Late
- Half-Day
- Absent
- Leave (Casual, Sick, Earned)
- Holiday

**Attendance Schema:**

```javascript
{
  dsr_id: ObjectId (ref: DSR),
  attendance_date: Date,
  check_in_time: Date,
  check_out_time: Date,
  check_in_location: GeoJSON,
  check_out_location: GeoJSON,
  status: String,
  working_hours: Number,
  leave_type: String,
  leave_reason: String,
  approved_by: ObjectId (ref: User),
  notes: String
}
```

**Mobile App Features:**

- Geo-fenced check-in (must be at office/designated location)
- Face recognition (planned)
- Selfie capture for verification
- Auto-calculate working hours

**Files:**

- Backend: `backend/src/models/Attendance.js`
- Backend: `backend/src/routes/attendance.js`

---

### 9. GPS MOVEMENT TRACKING

**Purpose:** Real-time tracking of SO movements (Uber-like)

**Status:** ✅ Fully Implemented (Session 3 Complete)

**Tracking Sessions:**

```javascript
{
  session_id: String (unique),
  user_id: ObjectId (ref: User/DSR),
  route_id: ObjectId (ref: Route),
  session_date: Date,
  start_time: Date,
  end_time: Date,
  status: String ["active", "paused", "completed", "flagged"],
  total_distance_km: Number,
  total_duration_minutes: Number,
  fraud_score: Number,
  fraud_flags: [{
    type: String,
    description: String,
    severity: String,
    timestamp: Date
  }]
}
```

**Location Points:**

```javascript
{
  point_id: String,
  session_id: String (ref: TrackingSession),
  latitude: Number,
  longitude: Number,
  timestamp: Date,
  accuracy: Number,
  speed: Number,
  heading: Number,
  provider: String ["gps", "network", "fused"],
  is_mock: Boolean
}
```

**Features Implemented:**

- ✅ Background GPS tracking (1-minute intervals)
- ✅ Batch upload to save mobile data
- ✅ Offline queue with retry mechanism
- ✅ Fraud detection (mock GPS, speed, teleportation)
- ✅ Polyline visualization on map
- ✅ Multiple sessions per day support
- ✅ Real-time HQ monitoring dashboard (planned)

**Fraud Detection:**

1. **Mock GPS Detection** (+20 score)
2. **Speed Violation** (>120 km/h) (+15 score)
3. **Teleportation** (>5km in <60 seconds) (+25 score)
4. **Territory Boundary** (outside assigned area) (+10 score)
5. **Suspicious Pattern** (erratic zigzag movement) (+10 score)

**Auto-Flagging:** Sessions with fraud score ≥ 50 automatically flagged

**Files:**

- Backend: `backend/src/models/TrackingSession.js`
- Backend: `backend/src/models/TrackingLocation.js`
- Backend: `backend/src/routes/tracking.js`
- Backend: `backend/services/trackingValidationService.js`
- Mobile: `mobile/src/services/locationService.ts`
- Mobile: `mobile/src/services/trackingAPI.ts`
- Mobile: `mobile/src/services/syncService.ts`

**Documentation:**

- `GPS_TRACKING_SESSION_3_COMPLETE.md`
- `GPS_TRACKING_IMPLEMENTATION_STATUS.md`
- `GPS_TRACKING_TESTING_GUIDE.md`

---

## 📊 REPORTING & ANALYTICS

### Key Performance Indicators (KPIs)

**Route-wise KPI:**

- Total outlets
- Visited outlets
- Memo count (orders)
- Productive Call % = (Orders / Visited Outlets) × 100
- Lines per Call (LPC)
- Categories per Call (CCP)
- Sales Order Amount (TP/DP)
- Delivery Amount
- Variance %

**SO-wise KPI:**

- Daily performance metrics
- Achievement against targets
- Visit efficiency
- Order value trends

**DB/Category-wise KPI:**

- Category performance by distributor
- SKU-level analysis
- Price point analysis

**Territory-wise KPI:**

- Area, Region, Zone aggregations
- Coverage percentage
- Market penetration

### Report Categories

1. **Dashboard Reports:**
   - Sales Dashboard
   - Live Dashboard
   - Mobile App Dashboard

2. **Order Reports:**
   - Order Summary
   - Orders by Route
   - Orders by SKU
   - Order vs Execution
   - Raw Order Data

3. **Delivery Reports:**
   - Delivery Summary
   - Delivery by Route
   - Delivery by SKU
   - Delivery Status

4. **Productivity Reports:**
   - Daily Order Summary
   - Productivity Report
   - Outlet Visit Status
   - SO Movement Report

5. **Outlet Reports:**
   - POS Information
   - Outlet-wise SKU Category Order
   - Route-wise outlet quantity
   - Zone-wise outlet order/delivery

6. **Attendance & Payroll:**
   - Daily/Weekly/Monthly attendance
   - Leave reports
   - Working hours tracking

7. **Statistical Reports:**
   - Distribution analysis
   - Distributor details
   - Distributor-wise products
   - Voucher summary

8. **Target vs Achievement:**
   - Target details (SO-wise, SKU-wise)
   - Area-based targets
   - Achievement percentages

### Report Filters

- **Geographic:** National → Division → Region → Zone → Area → Route
- **Temporal:** Daily, Weekly, Monthly, Date Range
- **Entity:** SO, Distributor, Outlet, SKU, Category
- **Status:** Order status, Delivery status
- **Performance:** Top performers, Bottom performers

### Export Formats

- Excel (.xlsx)
- CSV
- PDF
- JSON API

---

## 🔐 PERMISSIONS & ROLES

### Secondary Sales Roles

1. **SO (Sales Officer)** - Field staff creating orders
2. **DSR (Distributor Sales Rep)** - Delivery personnel
3. **ASM (Area Sales Manager)** - Area supervision
4. **RSM (Regional Sales Manager)** - Regional oversight
5. **ZSM (Zonal Sales Manager)** - Zonal management
6. **Distributor** - Order approval, delivery management
7. **MIS** - Reporting and analytics access

### API Permissions

- `secondary_order:read`
- `secondary_order:create`
- `secondary_order:update`
- `secondary_order:approve`
- `outlet:read`
- `outlet:create`
- `outlet:update`
- `route:read`
- `route:create`
- `dsr:read`
- `dsr:create`
- `attendance:read`
- `attendance:mark`
- `tracking:read`
- `tracking:start`
- `tracking:stop`

---

## 📱 MOBILE APP FEATURES

### For SO (Sales Officer):

**Implemented:**

- ✅ Login/Authentication
- ✅ GPS Movement Tracking
- ✅ Home Screen with role-based features

**Planned:**

- [ ] Outlet Visit & Coverage
  - GPS-based proximity detection
  - Shop open/closed status
  - Brand coverage tracking
- [ ] Order Placement
  - Manual order entry
  - System-based order creation
  - Offline order capability
- [ ] Order Amendment
- [ ] Outlet Summary
- [ ] Attendance Marking
- [ ] Daily reports
- [ ] Target tracking

### For DSR:

- [ ] Delivery management
- [ ] Stock visibility
- [ ] Collection recording
- [ ] Route optimization

### Common Features:

- ✅ Offline-first architecture
- ✅ Background sync with retry
- ✅ Network-aware operations
- [ ] Real-time notifications
- [ ] Camera for photos
- [ ] Signature capture
- [ ] Map navigation

---

## 🗺️ GEOSPATIAL FEATURES

### MongoDB Geospatial Indexes

```javascript
// Outlets
db.outlets.createIndex({ location: "2dsphere" });

// Secondary Orders
db.secondaryorders.createIndex({ gps_location: "2dsphere" });

// Tracking Locations
db.tracking_locations.createIndex({ location: "2dsphere" });
```

### Geospatial Queries

**Find Nearby Outlets:**

```javascript
db.outlets.find({
  location: {
    $near: {
      $geometry: {
        type: "Point",
        coordinates: [longitude, latitude],
      },
      $maxDistance: 5000, // 5 km
    },
  },
});
```

**Proximity Validation:**

```javascript
// Check if SO is within 100m of outlet
const distance = calculateHaversineDistance(soLocation, outletLocation);
return distance <= 100; // meters
```

**Territory Boundary Check:**

```javascript
db.territories.findOne({
  boundary: {
    $geoIntersects: {
      $geometry: {
        type: "Point",
        coordinates: [longitude, latitude],
      },
    },
  },
});
```

---

## 🗂️ FILE STRUCTURE

### Backend

```
backend/src/
├── models/
│   ├── Outlet.js
│   ├── Route.js
│   ├── DSR.js
│   ├── SecondaryOrder.js
│   ├── SecondaryDelivery.js
│   ├── OutletVisit.js
│   ├── Attendance.js
│   ├── TrackingSession.js
│   └── TrackingLocation.js
├── routes/
│   ├── outlets.js
│   ├── routes.js
│   ├── dsrs.js
│   ├── secondaryorders.js
│   ├── deliveries.js
│   ├── visits.js
│   ├── attendance.js
│   └── tracking.js
├── services/
│   └── trackingValidationService.js
└── utils/
    └── geoUtils.js
```

### Frontend

```
frontend/src/app/
├── outlets/page.tsx
├── routes/page.tsx
├── dsrs/page.tsx
├── secondary/
│   ├── orders/page.tsx
│   ├── deliveries/page.tsx
│   └── reports/
│       ├── route-kpi/page.tsx
│       ├── so-kpi/page.tsx
│       └── sales-summary/page.tsx
└── tracking/
    └── dashboard/page.tsx
```

### Mobile

```
mobile/src/
├── screens/
│   ├── LoginScreen.tsx
│   ├── HomeScreen.tsx
│   ├── OutletListScreen.tsx (planned)
│   ├── OutletVisitScreen.tsx (planned)
│   └── OrderCreateScreen.tsx (planned)
├── services/
│   ├── authService.ts
│   ├── locationService.ts
│   ├── trackingAPI.ts
│   └── syncService.ts
└── components/
    └── PustiLogo.tsx
```

---

## 🚀 IMPLEMENTATION STATUS

### ✅ COMPLETED MODULES

1. **GPS Tracking System** - Complete with fraud detection
2. **Mobile Authentication** - Login for all roles
3. **Backend Infrastructure** - Models and routes foundation
4. **Offline Sync Service** - Mobile data synchronization

### 🔄 IN PROGRESS

- Outlet management CRUD
- Route assignment workflows
- Secondary order placement (web)

### 📋 PLANNED

1. **Mobile App - Phase 2:**
   - Outlet visit module
   - Coverage tracking
   - Order placement
   - Offline order creation

2. **Web Portal - Secondary Sales:**
   - Comprehensive reporting dashboards
   - Real-time tracking visualization
   - Target vs achievement analysis
   - Commission calculations

3. **Advanced Features:**
   - AI-based route optimization
   - Predictive demand forecasting
   - Competitor tracking
   - Promotional offer management
   - Trade programs

---

## 🧪 TESTING

### Mobile App Testing (Android Emulator)

**Prerequisites:**

```powershell
# 1. Start Backend
cd C:\tkg\pusti-ht-mern\backend
node server.js

# 2. Start Metro Bundler
cd C:\tkg\pusti-ht-mern\mobile
npx react-native start

# 3. Start Emulator & Run App
Start-Process -FilePath "C:\Android\Sdk\emulator\emulator.exe" -ArgumentList "-avd", "Medium_Phone"
cd C:\tkg\pusti-ht-mern\mobile
npx react-native run-android
```

**Test Login:**

- Username: `superadmin`
- Password: `admin123`

**GPS Tracking Test:**

1. Login as SO user
2. Enable location services
3. Press "Track On" button
4. Mock GPS movements (Android emulator supports this)
5. Monitor location points in backend
6. Press "Track Off" button
7. Verify session completion

### Backend Testing

**Test Outlets:**

```bash
# Create test outlets with GPS coordinates
node scripts/seed-outlets.js
```

**Test Secondary Orders:**

```bash
# Create sample orders
node scripts/create-secondary-orders.js
```

---

## 🎯 KEY METRICS & FORMULAS

### Productive Call Percentage (PC%)

```
PC% = (Number of Orders / Number of Visited Outlets) × 100
```

### Lines Per Call (LPC)

```
LPC = Total Order Lines / Number of Orders
```

### Categories Per Call (CCP)

```
CCP = Unique Categories Ordered / Number of Orders
```

### Coverage Percentage

```
Coverage% = (Outlets Visited / Total Scheduled Outlets) × 100
```

### Drop Size

```
Drop Size = Total Order Value / Number of Orders
```

### Achievement Percentage

```
Achievement% = (Actual Sales / Target Sales) × 100
```

### Haversine Distance

```javascript
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}
```

---

## 🐛 KNOWN ISSUES & LIMITATIONS

1. **GPS Accuracy:**
   - Indoor locations may have poor accuracy
   - Network-based location less accurate than GPS
   - Mock GPS detection not 100% foolproof

2. **Offline Capabilities:**
   - Mobile app currently requires network for some operations
   - Full offline order creation not yet implemented
   - Image uploads require network

3. **Territory Boundaries:**
   - Polygon data not yet populated for all territories
   - Boundary validation in development

4. **Real-time Tracking:**
   - HQ monitoring dashboard not yet built
   - Historical playback feature pending

---

## 📚 DOCUMENTATION REFERENCES

- `SECONDARY_SRS_STRUCTURED.md` - Complete SRS document
- `SECONDARY_SRS_EXTRACTED.md` - Requirements extraction
- `GPS_TRACKING_SESSION_3_COMPLETE.md` - GPS tracking implementation
- `MOBILE_APP_REQUIREMENTS.md` - Mobile app features and roadmap
- `TECHNICAL_SPECIFICATION.md` - System architecture
- `DATABASE_SCHEMA.md` - Complete schema documentation

---

## 🎯 SESSION START CHECKLIST

Before starting a new session:

- [ ] Review GPS tracking status
- [ ] Check mobile app build requirements
- [ ] Understand SO workflow and mobile features
- [ ] Review geospatial query requirements
- [ ] Check outlet and route data availability
- [ ] Verify Android emulator configuration
- [ ] Review fraud detection thresholds
- [ ] Check background service implementation

---

## 💡 BEST PRACTICES

1. **Mobile Development:**
   - Always test on actual device before production
   - Use background services for GPS tracking
   - Implement offline-first architecture
   - Batch API calls to save mobile data
   - Handle network failures gracefully

2. **Geospatial Operations:**
   - Always use 2dsphere indexes
   - Store coordinates as [longitude, latitude]
   - Validate GPS accuracy before storing
   - Use appropriate distance thresholds
   - Consider Earth curvature for long distances

3. **Performance:**
   - Cache frequently accessed data
   - Use aggregation pipelines for complex reports
   - Implement pagination for large datasets
   - Optimize GPS point storage (batch inserts)

4. **Data Quality:**
   - Validate GPS coordinates (range checks)
   - Detect and flag anomalies
   - Maintain audit trails
   - Log all fraud detections

5. **User Experience:**
   - Minimize battery drain
   - Show real-time sync status
   - Provide offline feedback
   - Handle permission requests gracefully

---

**END OF SECONDARY SALES SESSION START CONTEXT**
