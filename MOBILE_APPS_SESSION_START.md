# MOBILE APPS - Session Start Context

**Last Updated:** February 13, 2026  
**Platform:** React Native 0.83.1 (iOS + Android)  
**Backend API:** Node.js + Express.js  
**Status:** GPS Tracking System - All Priorities Delivered ✅

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

### Phase 2: Outlet Management (Planned)

**Features:**

- [ ] Outlet list by route
- [ ] GPS-based outlet discovery
- [ ] Proximity detection (within 50-100m)
- [ ] Outlet details view
- [ ] Google Maps integration
- [ ] Navigate to outlet
- [ ] Search outlets by name/code

### Phase 3: Outlet Visits (Planned)

**Features:**

- [ ] Check-in to outlet (GPS validated)
- [ ] Shop status marking (Open/Closed)
- [ ] Brand coverage tracking
  - [ ] Select available brands
  - [ ] Time-series coverage data
- [ ] Visit duration tracking
- [ ] Photo capture capability
- [ ] Offline visit recording

### Phase 4: Order Placement (Planned)

**Features:**

- [ ] Product catalog browsing
- [ ] Add to cart
- [ ] Offline order creation
- [ ] Order draft management
- [ ] Submit order (with GPS)
- [ ] Order history
- [ ] Order amendment

### Phase 5: Attendance (Planned)

**Features:**

- [ ] Geo-fenced check-in
- [ ] Check-out with location
- [ ] Leave application
- [ ] Attendance history
- [ ] Working hours calculation

### Phase 6: Daily Reports (Planned)

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
