# MOBILE APPS - Session Start Context

**Last Updated:** February 18, 2026  
**Platform:** React Native 0.83.1 (iOS + Android)  
**Backend API:** Node.js + Express.js  
**Status:** Open Shop Implementation Complete (4/5 Modules) ✅

---

## 🎯 OVERVIEW

The Pusti Happy Times Mobile App is a field force automation tool designed for Sales Officers (SO), Distributors, and management roles. The app provides offline-first capabilities with background sync, GPS tracking, outlet management, and order placement features.

**Primary Use Case:** Enable field staff to work efficiently in areas with poor network connectivity while maintaining data integrity and real-time location tracking.

---

## 📐 ARCHITECTURE

### Tech Stack

- **Framework:** React Native 0.83.1
- **Language:** TypeScript
- **State Management:** React Hooks + Context API
- **Navigation:** React Navigation
- **Storage:** AsyncStorage (local persistence)
- **Networking:** Axios with retry logic
- **Geolocation:** react-native-geolocation-service
- **Background Tasks:** react-native-background-actions
- **Network Detection:** @react-native-community/netinfo

### Backend Integration

- **Base URL (Production):** `https://api.pusti-ht.com/api/v1`
- **Base URL (Emulator):** `http://10.0.2.2:8080/api/v1`
- **Authentication:** JWT (Access + Refresh tokens)
- **Token Storage:** AsyncStorage
- **Auto-refresh:** Implemented in axios interceptors

### Project Structure

```
mobile/
├── android/                 # Android native code
│   ├── app/
│   │   └── src/main/AndroidManifest.xml
│   └── build.gradle
├── ios/                     # iOS native code (future)
├── src/
│   ├── screens/            # Screen components
│   │   ├── LoginScreen.tsx
│   │   └── HomeScreen.tsx
│   ├── components/         # Reusable components
│   │   └── PustiLogo.tsx
│   ├── services/           # Business logic & API clients
│   │   ├── authService.ts
│   │   ├── locationService.ts
│   │   ├── trackingAPI.ts
│   │   └── syncService.ts
│   ├── utils/              # Helper functions
│   ├── types/              # TypeScript types
│   └── assets/             # Images, fonts, etc.
│       └── images/
│           └── logo.png
├── App.tsx                 # Root component
├── package.json
└── tsconfig.json
```

---

## 🚀 QUICK START GUIDE

### Every Session Startup - 3 Steps

**Step 1: Start Backend**

```powershell
cd C:\tkg\pusti-ht-mern\backend
node server.js
```

Wait for "Server running successfully" on port 8080.

**Step 2: Start Metro Bundler** (new terminal)

```powershell
cd C:\tkg\pusti-ht-mern\mobile
npx react-native start
```

Wait for "Metro ready" message.

**Step 3: Start Emulator & Install App** (new terminal)

```powershell
# Start emulator
Start-Process -FilePath "C:\Android\Sdk\emulator\emulator.exe" -ArgumentList "-avd", "Medium_Phone"

# Wait 20 seconds for emulator to boot, then:
cd C:\tkg\pusti-ht-mern\mobile
npx react-native run-android
```

**Test Login:**

- Username: `superadmin`
- Password: `admin123`

### Important Configuration Notes

- **Backend must be running on port 8080**
- Metro bundler may ask about port 8081 - choose "Yes" for alternate port
- First build takes 2-3 minutes (Gradle downloads dependencies)
- Subsequent builds are faster due to caching
- **HTTP cleartext traffic is enabled** in AndroidManifest.xml for development

---

## 🔧 COMMON ISSUES & FIXES

### Problem: Login fails with network error

**Fix:**

- Ensure `android:usesCleartextTraffic="true"` in AndroidManifest.xml
- Rebuild the app after AndroidManifest changes

### Problem: Cannot connect to backend

**Fix:**

- Verify backend is running: `netstat -ano | Select-String ":8080"`
- Use `10.0.2.2:8080` for Android emulator (NOT `localhost`)
- Check Windows Firewall isn't blocking port 8080

### Problem: App doesn't update after code changes

**Fix:**

```powershell
cd C:\tkg\pusti-ht-mern\mobile\android
.\gradlew.bat clean assembleDebug
cd ..
npx react-native run-android
```

### Problem: App shows old cached code

**Fix:**

```powershell
cd C:\tkg\pusti-ht-mern\mobile
Remove-Item -Recurse -Force android\app\build
npx react-native start --reset-cache
# In new terminal:
npx react-native run-android
```

### Problem: Metro bundler port already in use

**Fix:**

```powershell
# Kill existing Metro bundler
Get-Process node | Where-Object {$_.Path -like "*node.exe"} | Stop-Process -Force
# Restart Metro
npx react-native start
```

### Problem: Gradle build fails

**Fix:**

```powershell
cd mobile\android
.\gradlew.bat clean
# Clear Gradle cache
Remove-Item -Recurse -Force $env:USERPROFILE\.gradle\caches
cd ..
npx react-native run-android
```

---

## ✅ COMPLETED FEATURES

### 1. Authentication Module ✅

**Features:**

- Common login screen for all user roles
- Username/password authentication with JWT
- Token management (access + refresh tokens)
- AsyncStorage persistence
- Auto-navigation based on auth state
- Embedded company logo (local asset)
- Token refresh on 401 responses
- Secure token storage

**API Integration:**

```typescript
// Login
POST /api/v1/auth/login
Body: { username: string, password: string }
Response: {
  accessToken: string,
  refreshToken: string,
  user: {...}
}

// Refresh Token
POST /api/v1/auth/refresh-token
Body: { refreshToken: string }
Response: { accessToken: string }
```

**AsyncStorage Keys:**

- `@access_token` - JWT access token
- `@refresh_token` - JWT refresh token
- `@user` - Serialized user object

**Files:**

- `mobile/src/screens/LoginScreen.tsx` (180 lines)
- `mobile/src/services/authService.ts` (120 lines)
- `mobile/src/components/PustiLogo.tsx` (40 lines)
- `mobile/src/assets/images/logo.png`

---

### 2. GPS Movement Tracking ✅

**Status:** Session 3 Complete - All Priorities Delivered

**Features Implemented:**

#### A. Location Service

- Background GPS tracking (1-minute intervals)
- Permission handling (runtime requests)
- Accuracy monitoring
- Speed and heading capture
- Mock GPS detection
- Battery-optimized tracking
- Configurable tracking intervals

**Location Point Data:**

```typescript
{
  latitude: number,
  longitude: number,
  timestamp: Date,
  accuracy: number,      // meters
  speed: number,          // m/s
  heading: number,        // degrees
  provider: string,       // "gps" | "network" | "fused"
  is_mock: boolean
}
```

**Files:**

- `mobile/src/services/locationService.ts` (250+ lines)

#### B. Tracking API Client

- Session management (start/stop/pause)
- Batch location upload (network efficient)
- Error handling with retry logic
- Mock GPS testing capability

**API Endpoints:**

```typescript
// Start tracking session
POST /api/v1/tracking/sessions/start
Body: { route_id?: string }
Response: { sessionId: string }

// Stop tracking session
POST /api/v1/tracking/sessions/:id/stop

// Upload locations (batch)
POST /api/v1/tracking/sessions/:id/locations/batch
Body: { locations: LocationPoint[] }
```

**Files:**

- `mobile/src/services/trackingAPI.ts` (200+ lines)

#### C. Offline Sync Service ✅

- Persistent queue in AsyncStorage
- Exponential backoff retry strategy
- Network state monitoring
- Auto-sync when network restored
- Priority-based queue (Sessions > Locations)
- Max 5 retry attempts
- Real-time sync status updates

**Retry Delays:**

```
Attempt 1: 2 seconds
Attempt 2: 4 seconds
Attempt 3: 8 seconds
Attempt 4: 16 seconds
Attempt 5: 32 seconds
Max delay: 60 seconds
```

**Queue Item Structure:**

```typescript
{
  id: string,
  type: "start_session" | "stop_session" | "upload_locations",
  priority: 1 | 2,  // 1 = High (sessions), 2 = Normal (locations)
  endpoint: string,
  method: "POST" | "PUT",
  data: any,
  retryCount: number,
  createdAt: Date,
  lastAttempt: Date
}
```

**Files:**

- `mobile/src/services/syncService.ts` (350+ lines)

#### D. Home Screen Integration

- Track On/Off toggle button
- Visual tracking status indicator
- Session duration display
- Location count display
- Network status indicator
- Sync queue status
- Error handling and user feedback

**UI States:**

```
Idle → Starting → Active (Tracking) → Paused → Stopping → Idle
```

**Files:**

- `mobile/src/screens/HomeScreen.tsx` (400+ lines)

---

### 3. Fraud Detection System ✅

**Location:** Backend - `backend/services/trackingValidationService.js`

**Validation Checks:**

1. **Mock GPS Detection** (+20 fraud score)
   - Checks `is_mock` flag
   - Verifies GPS provider
   - One-time penalty per session

2. **Speed Validation** (+15 fraud score)
   - Flags speeds > 120 km/h
   - Calculates speed from GPS coordinates
   - Considers realistic vehicle speeds

3. **Teleportation Detection** (+25 fraud score)
   - Detects jumps > 5 km in < 60 seconds
   - Uses Haversine distance calculation
   - Catches location spoofing

4. **Territory Boundary Validation** (+10 fraud score)
   - Checks if outside assigned territory
   - Foundation ready (needs polygon data)

5. **Suspicious Pattern Detection** (+10 fraud score)
   - Detects erratic zigzag movement
   - Calculates bearing change rate
   - Flags >40% sharp turns

6. **Low Accuracy Warning**
   - Flags GPS accuracy > 100m
   - Informational only (no score penalty)

**Auto-Flagging:**

- Sessions with fraud score ≥ 50 automatically flagged
- Status changed to `"flagged"` for admin review
- All flags stored in session document

**Thresholds (Configurable):**

```javascript
MAX_SPEED_KMH: 120;
MAX_DISTANCE_JUMP_KM: 5;
MOCK_GPS_PENALTY: 20;
SPEED_VIOLATION_PENALTY: 15;
TELEPORT_PENALTY: 25;
TERRITORY_VIOLATION_PENALTY: 10;
SUSPICIOUS_PATTERN_PENALTY: 10;
```

---

### 4. Open Shop Flow - 5 Action Modules ✅

**Status:** 4 of 5 Sub-modules Complete

**Overview:** SO proximity-based action system that activates when within 10m of outlet. Provides 5 options for different visit scenarios.

---

#### A. Shop Action Screen ✅

**Purpose:** Central hub that presents 5 action options after GPS proximity validation

**Features:**
- GPS proximity validation (10m threshold)
- Haversine distance calculation
- Real-time location accuracy display
- Visual status indicators
- Permission handling
- Auto-navigation to selected action

**Proximity Validation:**
```typescript
// Validation flow
1. Request GPS permissions
2. Get current location (high accuracy)
3. Calculate distance to outlet
4. If distance ≤ 10m → Show actions
5. If distance > 10m → Show error + distance
```

**5 Action Options:**
1. 🏪 Shop Closed (Orange)
2. 🚫 No Sales (Purple)  
3. 📋 Audit Inventory (Cyan)
4. 🛒 Sales & Orders (Green)
5. 📦 Damage Claim (Red)

**Files:**
- `mobile/src/screens/ShopActionScreen.tsx` (504 lines)

**API Integration:**
- None (Navigation hub only)

---

#### B. Shop Closed Module ✅

**Purpose:** Record when outlet is found closed during visit

**Features:**
- One-tap marking with optional reason
- GPS coordinates capture
- Automatic visit record creation
- Close reason prompt (optional text)
- Immediate sync to backend

**Visit Record:**
```typescript
{
  outlet_id: ObjectId,
  visit_type: "shop_closed",
  shop_status: "Closed",
  shop_closed_reason: string (optional),
  gps_location: { coordinates: [lng, lat] },
  check_in_time: Date,
  so_notes: string
}
```

**API:**
```
POST /api/v1/outlet-visits
Body: { outlet_id, visit_type: "shop_closed", ... }
```

**Files:**
- Integrated in `ShopActionScreen.tsx` (inline handler)

---

#### C. No Sales Reason Module ✅

**Purpose:** Record why no order was placed at open outlet

**Features:**
- 8 predefined reasons with descriptions
- Radio button selection
- Required notes for "Other" reason
- Icon-based UI for clarity
- GPS validation
- Visit tracking

**Reasons:**
1. Previous Order Not Delivered
2. Payment Issues
3. Overstocked
4. Credit Limit Reached
5. Outlet Requested Delay
6. Price Concerns
7. Competitor Issues
8. Other (requires notes)

**Visit Record:**
```typescript
{
  outlet_id: ObjectId,
  visit_type: "no_sales",
  shop_status: "Open",
  no_sales_reason: string,
  no_sales_notes: string (optional/required for "other"),
  gps_location: { coordinates: [lng, lat] }
}
```

**API:**
```
POST /api/v1/outlet-visits
Body: { 
  outlet_id, 
  visit_type: "no_sales",
  no_sales_reason: "payment_issues",
  no_sales_notes: "..."
}
```

**Files:**
- `mobile/src/screens/NoSalesReasonScreen.tsx` (420 lines)

---

#### D. Audit Inventory Module ✅

**Purpose:** Count outlet's stock by category for variance tracking

**Features:**
- Product listing by category
- Accordion UI (expandable categories)
- Previous audit comparison
- Real-time variance calculation
- Quantity input with validation
- Draft save/restore
- Search products
- Optional notes

**Audit Flow:**
```
1. Load products with previous audit data
2. Expand category → Show products
3. Enter audited quantity (PCS)
4. System calculates variance (current - previous)
5. Save draft OR Submit audit
6. Create OutletVisit record
```

**Variance Display:**
```typescript
// Color coding
variance > 0  → Green (+50 PCS)
variance < 0  → Red (-20 PCS)
variance = 0  → Gray (0 PCS)
```

**Audit Data Structure:**
```typescript
{
  audit_id: string (auto-generated),
  outlet_id: ObjectId,
  so_id: ObjectId,
  items: [
    {
      product_id: ObjectId,
      audited_qty_pcs: number,
      previous_qty_pcs: number,
      variance: number
    }
  ],
  total_items: number,
  total_qty_pcs: number,
  total_variance: number,
  status: "Submitted" | "Verified",
  gps_location: { coordinates: [lng, lat] }
}
```

**API:**
```
GET /api/v1/outlet-audits/products?outlet_id=...
Response: {
  categories: [
    {
      category: string,
      products: [
        { _id, sku, english_name, previous_qty_pcs }
      ]
    }
  ],
  previous_audit: { audit_id, audit_date }
}

POST /api/v1/outlet-audits
Body: { outlet_id, so_id, items[], so_notes }
```

**Files:**
- `mobile/src/screens/AuditInventoryScreen.tsx` (716 lines)
- `backend/src/routes/outletAudits.js` (403 lines)
- `backend/src/models/OutletAudit.js`

**Draft Storage:**
- AsyncStorage key: `@audit_draft_{outletId}`
- Restores on revisit with timestamp

---

#### E. Sales Module (Sales & Orders) ✅

**Purpose:** Browse catalog, apply offers, and place orders with FIFO stock reduction

**Status:** COMPLETE

**Features:**
- Product catalog by category (3-column grid)
- Offers carousel (auto-apply eligible offers)
- Add to cart with quantity stepper
- Stock availability display (color-coded)
- Cart drawer with subtotal calculation
- Order placement with atomic transaction
- FIFO stock reduction
- Cart persistence (per outlet)
- Insufficient stock handling

**UI Layout:**
```
┌─────────────────────────┐
│  Header (Outlet Name)   │
├─────────────────────────┤
│  Offers Carousel        │ ← Top 1/3
│  [Offer 1] [Offer 2]    │
├─────────────────────────┤
│  Category Grid          │ ← Bottom 2/3
│  [Cat1] [Cat2] [Cat3]   │
│  [Cat4] [Cat5] [Cat6]   │
└─────────────────────────┘
       ↓ Tap category
┌─────────────────────────┐
│  Products Bottom Sheet  │
│  [Product 1] [+ Add]    │
│  [Product 2] [- 2 +]    │
└─────────────────────────┘
       ↓ View cart
┌─────────────────────────┐
│  Cart Drawer            │
│  Product A × 10 = ৳500  │
│  Product B × 5 = ৳250   │
│  ─────────────────────  │
│  Total: ৳750            │
│  [Place Order]          │
└─────────────────────────┘
```

**Stock Color Coding:**
```
> 50 PCS  → Green
10-50 PCS → Orange
< 10 PCS  → Red
0 PCS     → Gray (disabled)
```

**Order Creation Flow:**
```javascript
1. SO adds products to cart (local)
2. Cart saved to AsyncStorage per outlet
3. SO submits order
4. Backend starts MongoDB transaction:
   ├─ Validate stock with row locking
   ├─ Generate order_number (SO2602XXXX)
   ├─ Calculate totals
   ├─ Reduce stock FIFO per item
   ├─ Create SecondaryOrder
   ├─ Create OutletVisit (visit_type='sales')
   └─ Update outlet.last_visit_date
5. On success: Clear cart, show order_number
6. On INSUFFICIENT_STOCK: Show conflicts
```

**Order Data Structure:**
```typescript
{
  order_number: string,  // Auto-generated SO2602XXXX
  outlet_id: ObjectId,
  distributor_id: ObjectId,
  dsr_id: ObjectId,
  items: [
    {
      product_id: ObjectId,
      sku: string,
      quantity: number,      // PCS
      unit_price: number,    // Per PCS
      subtotal: number
    }
  ],
  subtotal: number,
  discount_amount: number,  // From applied offers
  total_amount: number,
  order_status: "Submitted" | "Approved" | "Cancelled" | "Delivered",
  delivery_chalan_id: ObjectId (set by web portal),
  gps_location: { coordinates: [lng, lat] }
}
```

**FIFO Stock Reduction:**
```javascript
// DistributorStock.reduceStockFIFO(quantity)
// Reduces oldest batches first
batches.sort((a, b) => a.receive_date - b.receive_date)
for each batch:
  if batch.qty >= remaining_qty:
    batch.qty -= remaining_qty
    break
  else:
    remaining_qty -= batch.qty
    batch.qty = 0
```

**API Endpoints:**
```
GET /api/v1/mobile/catalog/categories?distributor_id=...
Response: {
  data: [
    { _id, name, product_segment, product_count }
  ]
}

GET /api/v1/mobile/catalog/products?category_id=...&distributor_id=...
Response: {
  data: [
    { _id, sku, bangla_name, trade_price, available_qty }
  ]
}

GET /api/v1/mobile/catalog/offers?outlet_id=...&distributor_id=...
Response: {
  data: [
    { _id, name, description, config: { minOrderValue, discountPercentage } }
  ]
}

POST /api/v1/mobile/orders
Body: {
  outlet_id, distributor_id, dsr_id,
  items: [{ product_id, sku, quantity, unit_price }],
  gps_location
}
Response: {
  success: true,
  data: { order_number, order_status, total_amount, items_count }
}
Error (INSUFFICIENT_STOCK): {
  success: false,
  code: "INSUFFICIENT_STOCK",
  message: "...",
  conflicts: [
    { sku, requested, available, message }
  ]
}

GET /api/v1/mobile/orders?dsr_id=...&outlet_id=...&status=...
Response: {
  data: [{ order_number, outlet, order_date, total_amount, order_status }],
  pagination: { total, page, pages, limit }
}
```

**Files:**
- `mobile/src/screens/SalesModuleScreen.tsx` (754 lines)
- `mobile/src/services/salesAPI.ts` (308 lines)
- `backend/src/routes/mobile/catalog.js` (263 lines)
- `backend/src/routes/mobile/orders.js` (310 lines)
- `backend/src/models/SecondaryOrder.js` (320 lines)

**Cart Storage:**
- AsyncStorage key: `@sales_cart_{outletId}`
- Structure: `CartItem[]` with product_id, sku, quantity, unit_price, subtotal

**Stock Synchronization:**
- Fresh stock fetched per outlet visit (no reservation)
- Validation at submission (atomic transaction)
- SO sees real-time availability
- Conflicts resolved gracefully with user alert

---

#### F. Damage Claim Module ✅

**Purpose:** Report damaged/expired products found at outlets

**Features:**
- Product selection (from delivery history)
- 7 damage reasons with icons
- Quantity input (PCS)
- Batch number (optional)
- Notes per item
- Draft save/restore
- Multi-item claims
- GPS capture

**Damage Reasons:**
1. Physical Damage
2. Expired
3. Defective/Quality Issue
4. Near Expiry
5. Wrong Product
6. Packaging Damage
7. Quality Issue

**Claim Flow:**
```
1. Load products (from outlet's delivery history)
2. Tap product → Open modal
3. Enter quantity, select reason, add notes
4. Add to claim
5. Repeat for multiple products
6. Save draft OR Submit claim
```

**Claim Data Structure:**
```typescript
{
  claim_id: string (auto-generated),
  outlet_id: ObjectId,
  distributor_id: ObjectId,
  so_id: ObjectId,
  claim_date: Date,
  items: [
    {
      product_id: ObjectId,
      qty_claimed_pcs: number,
      damage_reason: string,
      notes: string (optional),
      batch_number: string (optional),
      estimated_value_bdt: number
    }
  ],
  total_items: number,
  total_qty_pcs: number,
  total_value_bdt: number,
  status: "Pending" | "Under Review" | "Verified" | "Approved" | "Rejected",
  gps_location: { coordinates: [lng, lat] }
}
```

**API:**
```
GET /api/v1/damage-claims/products?outlet_id=...&distributor_id=...
Response: {
  data: [
    {
      category: string,
      products: [
        { _id, sku, english_name, trade_price, last_delivered }
      ]
    }
  ]
}

POST /api/v1/damage-claims
Body: {
  outlet_id, distributor_id,
  items: [{ product_id, qty_claimed_pcs, damage_reason, notes }],
  gps_location,
  so_notes
}
```

**Files:**
- `mobile/src/screens/DamageClaimScreen.tsx` (899 lines)
- `mobile/src/services/damageClaimAPI.ts` (268 lines)
- `backend/src/routes/damageClaims.js`
- `backend/src/models/DamageClaim.js`

**Draft Storage:**
- AsyncStorage key: `@damage_claim_draft_{outletId}`
- Restores with timestamp prompt

---

### 5. Visit Duration Tracking ✅

**Purpose:** Show SO time spent at each outlet on route map

**Status:** COMPLETE

**Features:**
- Duration calculation (check_out_time - check_in_time)
- Today's visit summary endpoint
- Display in TraceRouteScreen outlet list
- Real-time in-progress indicator
- Color-coded display

**Backend Implementation:**
```javascript
// OutletVisit model pre-save hook
if (this.check_out_time && this.check_in_time) {
  this.duration_minutes = Math.round(
    (this.check_out_time - this.check_in_time) / 60000
  );
}
```

**API Endpoint:**
```
GET /api/v1/outlet-visits/today-summary?outlet_ids=id1,id2,id3
Response: {
  success: true,
  data: {
    outlet_id_1: {
      outlet_id, visit_type, duration_minutes,
      check_in_time, check_out_time, is_checked_out
    },
    outlet_id_2: { ... }
  }
}
```

**Mobile Integration:**
```typescript
// TraceRouteScreen fetch logic
1. Load outlets for route
2. Extract outlet IDs (comma-separated)
3. Fetch GET /outlet-visits/today-summary?outlet_ids=...
4. Merge visit data into outlet objects:
   - visit_duration: number
   - is_visited_today: boolean
   - is_checked_out: boolean
5. Display in outlet list
```

**UI Display:**
```tsx
// Outlet list item
{item.is_visited_today && item.is_checked_out && (
  <Text style={styles.visitDuration}>
    ⏱️ {item.visit_duration} min{item.visit_duration !== 1 ? 's' : ''}
  </Text>
)}

{item.is_visited_today && !item.is_checked_out && (
  <Text style={styles.visitInProgress}>
    🟢 Visit in progress
  </Text>
)}
```

**Color Coding:**
```
Completed visit: Green (#4CAF50)
In progress: Orange (#FF9800)
```

**Files:**
- `mobile/src/screens/TraceRouteScreen.tsx` (modified lines 23-36, 95-148, 587-612, 814-832)
- `backend/src/routes/outletVisits.js` (added lines 323-381)

**Performance:**
- Single batch query for all outlets
- Map structure for O(1) lookup
- Graceful degradation (continues without visit data if fetch fails)

---

**Thresholds (Configurable):**

```javascript
MAX_SPEED_KMH: 120;
MAX_DISTANCE_JUMP_KM: 5;
MOCK_GPS_PENALTY: 20;
SPEED_VIOLATION_PENALTY: 15;
TELEPORT_PENALTY: 25;
TERRITORY_VIOLATION_PENALTY: 10;
SUSPICIOUS_PATTERN_PENALTY: 10;
```

---

## ⚠️ CRITICAL BUSINESS RULE: MOBILE APP USES PCS

### Unit Handling in Mobile App

**MOBILE APP ALWAYS DISPLAYS AND WORKS WITH PCS (PIECES)**

```
SO/DSR creates orders in PCS for retailers
```

**Why PCS in Mobile?**

- Mobile app is for Secondary Sales (Distributor → Retailer)
- Retailers buy small quantities (pieces, not full cartons)
- Stock availability shown in pieces
- Order quantities entered in pieces
- Delivery quantities tracked in pieces

**Example Mobile Flow:**

**1. SO Views Product Catalog:**

```
Product: Milk Powder 500g
Available: 240 PCS
Price: ৳110/piece
Min Order: 12 PCS
```

**2. SO Creates Order at Outlet:**

```javascript
// Order Item
{
  sku: "MILK-500G",
  quantity: 50,      // 50 PIECES (entered by SO)
  unit_price: 110,   // Price per PIECE
  subtotal: 5500     // 50 × 110
}
```

**3. Stock Deduction:**

```
Before: 240 PCS available
Ordered: 50 PCS
After: 190 PCS remaining
```

**Relationship to Primary Sales:**

```
┌─────────────────────────┐
│  PRIMARY SALES (CTN)    │
│  Factory → Distributor  │
└───────────┬─────────────┘
            │
            │ Distributor receives: 10 CTN
            ↓ Convert: 10 × 24 = 240 PCS
┌─────────────────────────┐
│ SECONDARY SALES (PCS)   │
│ Distributor → Retailer  │
│                         │
│ Mobile App shows:       │
│ • Stock: 240 PCS        │
│ • Order: 50 PCS         │
│ • Remaining: 190 PCS    │
└─────────────────────────┘
```

**Conversion Factor:**

```javascript
// Product master data
{
  sku: "MILK-500G",
  unit_per_case: 24,  // Critical field: 24 pieces per carton
  dp_price: 2400,     // Distributor pays per CTN (Primary)
  tp_price: 110,      // Retailer pays per PCS (Secondary)
}

// Stock in mobile app API response:
{
  product_id: "...",
  sku: "MILK-500G",
  available_qty_pcs: 240,  // ← Mobile app uses this
  unit_price_pcs: 110,     // ← Price per piece
  unit_per_case: 24        // ← For display/info
}
```

**Mobile API Considerations:**

```typescript
// GET /api/v1/secondary/products (for SO mobile app)
Response: {
  products: [
    {
      sku: "MILK-500G",
      available_qty: 240, // Always in PCS
      unit: "PCS", // Explicit unit
      price: 110, // Price per PCS
      unit_per_case: 24, // Reference info
    },
  ];
}

// POST /api/v1/secondary/orders (create order)
Request: {
  items: [
    {
      sku: "MILK-500G",
      quantity: 50, // In PCS
      unit_price: 110, // Per PCS
    },
  ];
}
```

**Display in Mobile UI:**

```tsx
// React Native component
<ProductCard>
  <Text>Milk Powder 500g</Text>
  <Text>Available: {available_qty_pcs} PCS</Text>
  <Text>Price: ৳{price}/piece</Text>
  <Text style={{ fontSize: 12, color: "gray" }}>({unit_per_case} pieces per carton)</Text>
  <TextInput placeholder="Enter quantity (PCS)" keyboardType="numeric" />
</ProductCard>
```

**Important Notes:**

- Never show CTN in mobile app UI (confuses field staff)
- Always validate qty in PCS against available PCS
- Backend converts PCS to CTN for FIFO stock deduction
- Reports may show both units, but mobile works only in PCS

---

## 📋 PLANNED FEATURES (ROADMAP)

### Phase 2: Route & Outlet Management ✅ COMPLETE

**Features:**

- [x] Outlet list by route (TraceRouteScreen)
- [x] GPS-based outlet discovery
- [x] Proximity detection (within 10m - ShopActionScreen)
- [x] Outlet details view
- [x] Visit duration tracking ✅ NEW
- [ ] Google Maps integration
- [ ] Navigate to outlet

### Phase 3: Outlet Visits ✅ COMPLETE

**Features:**

- [x] Check-in to outlet (GPS validated)
- [x] Shop status marking (Open/Closed) ✅
- [x] Visit duration tracking ✅
- [x] No sales reason recording ✅
- [x] Offline visit recording (via sync queue)
- [ ] Brand coverage tracking
  - [ ] Select available brands
  - [ ] Time-series coverage data
- [ ] Photo capture capability

### Phase 4: Order Placement ✅ COMPLETE

**Features:**

- [x] Product catalog browsing ✅
- [x] Add to cart ✅
- [x] Offline order creation (cart persistence) ✅
- [x] Order draft management (AsyncStorage) ✅
- [x] Submit order (with GPS) ✅
- [x] Order history ✅
- [ ] Order amendment
- [x] FIFO stock reduction ✅
- [x] Offer system integration ✅

### Phase 5: Inventory & Claims ✅ COMPLETE

**Features:**

- [x] Audit inventory by category ✅
- [x] Variance tracking (previous vs current) ✅
- [x] Draft save/restore ✅
- [x] Damage/Expired product claims ✅
- [x] Multi-item claims ✅
- [x] Claim reason selection ✅

### Phase 6: Attendance (Planned)

**Features:**

- [ ] Geo-fenced check-in
- [ ] Check-out with location
- [ ] Leave application
- [ ] Attendance history
- [ ] Working hours calculation

### Phase 7: Daily Reports (Planned)

**Features:**

- [ ] Order summary
- [ ] Delivery summary
- [ ] Target vs achievement
- [ ] Visit summary
- [ ] Offline report generation

---

## 🏗️ CORE SERVICES

### authService.ts

**Purpose:** Authentication and token management

**Methods:**

```typescript
login(username: string, password: string): Promise<User>
logout(): Promise<void>
refreshAccessToken(): Promise<string>
getCurrentUser(): Promise<User | null>
isAuthenticated(): Promise<boolean>
```

**Token Refresh Logic:**

- Auto-refresh on 401 response
- Fallback to refresh token
- Logout if refresh fails

---

### locationService.ts

**Purpose:** GPS tracking and location management

**Methods:**

```typescript
requestLocationPermission(): Promise<boolean>
startTracking(callback: LocationCallback): void
stopTracking(): void
getCurrentLocation(): Promise<Location>
mockGPSMovement(path: Location[]): void  // For testing
```

**Configuration:**

```typescript
{
  enableHighAccuracy: true,
  interval: 60000,         // 1 minute
  fastestInterval: 30000,  // 30 seconds
  distanceFilter: 10,      // 10 meters
  showsBackgroundLocationIndicator: true,
  foregroundService: {
    notificationTitle: "Pusti HT",
    notificationBody: "Tracking your location"
  }
}
```

---

### trackingAPI.ts

**Purpose:** API client for tracking endpoints

**Methods:**

```typescript
startSession(routeId?: string): Promise<{ sessionId: string }>
stopSession(sessionId: string): Promise<void>
uploadLocations(sessionId: string, locations: Location[]): Promise<void>
getActiveSessions(): Promise<Session[]>
getSessionHistory(startDate: Date, endDate: Date): Promise<Session[]>
```

---

### syncService.ts

**Purpose:** Offline queue and background synchronization

**Methods:**

```typescript
addToQueue(item: QueueItem): Promise<void>
syncAll(): Promise<void>
clearQueue(): Promise<void>
getQueueSize(): Promise<number>
addSyncListener(callback: SyncStatusCallback): void
removeSyncListener(callback: SyncStatusCallback): void
```

**Sync Status:**

```typescript
{
  isOnline: boolean,
  queueSize: number,
  isSyncing: boolean,
  lastSyncTime: Date,
  failedItems: number
}
```

---

## 🧪 TESTING

### Manual Testing Checklist

**Authentication:**

- [ ] Login with valid credentials
- [ ] Login with invalid credentials
- [ ] Token refresh on expiry
- [ ] Logout clears stored data
- [ ] Auto-login on app restart

**GPS Tracking:**

- [ ] Request location permission
- [ ] Start tracking session
- [ ] Location points captured every minute
- [ ] Background tracking (minimize app)
- [ ] Stop tracking session
- [ ] Offline queue creation
- [ ] Auto-sync when online

**Mock GPS Testing:**

- [ ] Enable developer options on Android
- [ ] Set mock location app
- [ ] Simulate GPS movement
- [ ] Verify mock detection in backend
- [ ] Check fraud score calculation

### Android Emulator GPS Simulation

**Method 1: Extended Controls**

1. Open emulator
2. Click `...` (Extended controls)
3. Go to "Location"
4. Enter latitude/longitude
5. Click "Send"

**Method 2: GPX Route Playback**

1. Create GPX file with route
2. Load in emulator extended controls
3. Playback at desired speed

**Method 3: Manual Commands**

```bash
adb shell
geo fix <longitude> <latitude>
```

---

## 📊 PERFORMANCE METRICS

### Battery Optimization

**Strategies:**

- Use `distanceFilter` to reduce GPS queries
- 1-minute interval (configurable)
- Stop tracking when paused
- Batch location uploads
- Minimal wake locks

**Expected Battery Drain:**

- ~5-10% per hour of active tracking
- Depends on GPS accuracy mode

### Network Optimization

**Strategies:**

- Batch location upload (max 50 points)
- Upload every 5 minutes or 50 points
- Compress payloads
- Retry failed requests
- Queue offline requests

**Data Usage:**

- ~1-2 KB per location point
- ~50-100 KB per 50 points
- ~5-10 MB per 8-hour shift

### Storage Usage

**AsyncStorage:**

- Tokens: ~2 KB
- User object: ~1-2 KB
- Offline queue: ~10-50 KB (varies)
- Total: ~15-55 KB

**Database (Backend):**

- Session: ~500 bytes
- Location point: ~150 bytes
- 1 day (480 points): ~72 KB
- 1 month: ~2.2 MB per SO

---

## 🔐 PERMISSIONS

### Android Permissions (AndroidManifest.xml)

```xml
<!-- Required -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />

<!-- Background tracking (Android 10+) -->
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />

<!-- Foreground service for tracking -->
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />

<!-- Network state -->
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

<!-- Future features -->
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
```

### iOS Permissions (Info.plist) - Planned

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>We need your location to track your field visits</string>

<key>NSLocationAlwaysUsageDescription</key>
<string>We need your location to track your movement in background</string>

<key>NSCameraUsageDescription</key>
<string>We need camera access to capture outlet photos</string>
```

---

## 📱 SUPPORTED DEVICES

### Android

**Minimum Requirements:**

- Android 8.0 (API Level 26)
- 2 GB RAM
- GPS capability
- 100 MB storage

**Recommended:**

- Android 10+ (API Level 29)
- 4 GB RAM
- GPS + Network location
- 500 MB storage

### iOS (Planned)

**Minimum Requirements:**

- iOS 13.0
- iPhone 6s or newer
- GPS capability
- 100 MB storage

---

## 🗂️ FILE ORGANIZATION

### Key Configuration Files

**package.json**

- Dependencies and scripts
- React Native version: 0.83.1

**tsconfig.json**

- TypeScript configuration
- Strict mode enabled

**android/app/build.gradle**

- Android SDK versions
- Dependencies
- Build configurations

**android/app/src/main/AndroidManifest.xml**

- Permissions
- Application configuration
- Cleartext traffic enabled (dev only)

**.env (if needed)**

```
API_BASE_URL=http://10.0.2.2:8080/api/v1
TRACKING_INTERVAL=60000
LOCATION_BATCH_SIZE=50
```

---

## 🚀 DEPLOYMENT

### Development Build

```powershell
cd mobile
npx react-native run-android
```

### Debug APK

```powershell
cd mobile\android
.\gradlew.bat assembleDebug
# APK location: android\app\build\outputs\apk\debug\app-debug.apk
```

### Release APK (Future)

```powershell
cd mobile\android
.\gradlew.bat assembleRelease
# Requires signing key
```

### Play Store Deployment (Future)

1. Generate signed APK/AAB
2. Update version in build.gradle
3. Create release notes
4. Upload to Play Console
5. Submit for review

---

## 🐛 KNOWN ISSUES

### 1. Metro Bundler Port Conflict

**Impact:** Cannot start Metro bundler  
**Workaround:** Kill node processes manually

### 2. Android Build Cache Issues

**Impact:** Code changes not reflected  
**Workaround:** Clean build directory

### 3. Emulator GPS Accuracy

**Impact:** Mock GPS always detected  
**Status:** Expected behavior in emulator

### 4. Background Tracking on iOS

**Impact:** Not yet implemented  
**Status:** Planned for iOS version

---

## 📚 DOCUMENTATION REFERENCES

- `MOBILE_APP_REQUIREMENTS.md` - Complete requirements and use cases
- `GPS_TRACKING_SESSION_3_COMPLETE.md` - GPS implementation details
- `GPS_TRACKING_IMPLEMENTATION_STATUS.md` - Implementation status
- `GPS_TRACKING_TESTING_GUIDE.md` - Step-by-step testing guide
- `MOBILE_FIRST_SCHEDULING_IMPLEMENTATION.md` - Mobile scheduling features

---

## 🎯 SESSION START CHECKLIST

Before starting a new mobile app session:

- [ ] Check Android SDK and emulator setup
- [ ] Verify backend API is accessible from emulator
- [ ] Review current feature implementation status
- [ ] Check for any new requirements or bug reports
- [ ] Test existing features (auth, GPS tracking)
- [ ] Review network and battery optimization strategies
- [ ] Check AsyncStorage data structure compatibility
- [ ] Verify permissions are properly requested

---

## 💡 BEST PRACTICES

### React Native Development

1. **Use TypeScript** for type safety
2. **Follow component hierarchy:** Screens > Components > Services
3. **Keep business logic in services,** not screens
4. **Use hooks** instead of class components
5. **Memoize expensive computations** with useMemo
6. **Optimize re-renders** with React.memo and useCallback

### Mobile-Specific Considerations

1. **Offline-First Design:**
   - Always assume network can fail
   - Queue operations when offline
   - Sync when online
   - Provide user feedback

2. **Battery Optimization:**
   - Minimize GPS queries
   - Use appropriate accuracy modes
   - Stop tracking when not needed
   - Batch network requests

3. **Storage Management:**
   - Clear old data periodically
   - Limit cache size
   - Compress stored data
   - Use pagination for lists

4. **User Experience:**
   - Show loading states
   - Handle errors gracefully
   - Provide offline indicators
   - Use optimistic UI updates

5. **Security:**
   - Never store sensitive data unencrypted
   - Use HTTPS only (except dev)
   - Validate all user inputs
   - Implement certificate pinning (production)

### Code Organization

```typescript
// Good: Separate concerns
// locationService.ts - GPS logic only
// trackingAPI.ts - API calls only
// HomeScreen.tsx - UI rendering only

// Bad: Everything in one file
// HomeScreen.tsx - GPS + API + UI (Avoid!)
```

### Error Handling

```typescript
// Always handle Promise rejections
try {
  await someAsyncOperation();
} catch (error) {
  console.error("Operation failed:", error);
  // Show user-friendly message
  Alert.alert("Error", "Something went wrong. Please try again.");
}
```

### State Management

```typescript
// Use useState for local state
const [isTracking, setIsTracking] = useState(false);

// Use useEffect for side effects
useEffect(() => {
  // Load data on mount
  loadUserData();
}, []);

// Use Context for global state (if needed)
const { user, setUser } = useContext(AuthContext);
```

---

## 🔄 COMMON WORKFLOWS

### Adding a New Screen

1. Create screen component in `src/screens/`
2. Add navigation route
3. Create API service if needed
4. Add permissions if required
5. Test on emulator
6. Test on real device

### Adding New API Integration

1. Define TypeScript types
2. Add method to relevant service (e.g., `trackingAPI.ts`)
3. Handle errors and retries
4. Add to offline queue if needed
5. Update sync service if applicable

### Debugging Mobile Issues

1. Check Metro bundler console for JS errors
2. Check Android logcat for native crashes
3. Use React DevTools for component inspection
4. Add strategic console.logs
5. Use network inspector for API issues

---

**END OF MOBILE APPS SESSION START CONTEXT**
