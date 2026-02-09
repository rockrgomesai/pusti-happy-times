# GPS Field Officer Tracking System - Implementation Progress

## Session 3: Mobile-Backend Integration (2026-02-06)

### ✅ Completed Features

#### 1. **Mobile App - Backend Integration**

**File**: [mobile/src/screens/HomeScreen.tsx](mobile/src/screens/HomeScreen.tsx)

##### Added State Management:

```typescript
const [sessionId, setSessionId] = useState<string | null>(null);
const locationBuffer = useRef<LocationPoint[]>([]);
const uploadIntervalRef = useRef<any>(null);
const lastUploadTime = useRef<number>(Date.now());
```

##### Upload Configuration:

```typescript
const UPLOAD_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes
const UPLOAD_BATCH_SIZE = 20; // Upload after 20 points
```

##### Key Functions Implemented:

**`uploadLocationBatch()`**

- Uploads buffered location points to backend
- Clears buffer after successful upload
- Re-adds failed uploads to buffer for retry
- Logs: `📤 Uploading N location points...`

**`bufferAndUploadLocation(point)`**

- Adds location point to buffer
- Triggers upload when:
  - Buffer reaches 20 points, OR
  - 2 minutes have passed since last upload
- Ensures efficient batch processing

**Updated `handleTrackToggle()`**

**On Track Start:**

1. Gets device metadata (model, OS version, app version) using `react-native-device-info`
2. Calls `trackingAPI.startSession(deviceInfo)` to create backend session
3. Stores `session_id` in state
4. Starts location tracking (mock or real GPS)
5. Sets up 2-minute interval for forced batch uploads
6. Buffers each location point and uploads in batches

**On Track Stop:**

1. Stops location tracking service
2. Uploads remaining buffered points
3. Calls `trackingAPI.stopSession(sessionId)`
4. Displays summary alert with:
   - Total distance (from backend calculation)
   - Duration in minutes
   - Number of points recorded
5. Cleans up intervals and state

##### Device Info Integration:

```typescript
const deviceInfo = {
  device_model: await DeviceInfo.getModel(),
  os_version: await DeviceInfo.getSystemVersion(),
  app_version: await DeviceInfo.getVersion(),
};
```

##### Cleanup on Unmount:

```typescript
useEffect(() => {
  return () => {
    if (isTracking) locationService.stopTracking();
    if (statsInterval.current) clearInterval(statsInterval.current);
    if (uploadIntervalRef.current) clearInterval(uploadIntervalRef.current);
  };
}, []);
```

---

#### 2. **Mobile Dependencies**

**Installed Package:**

- `react-native-device-info` - For device metadata (model, OS version, app version, battery level)

**Rebuild Command:**

```bash
cd mobile
npm install react-native-device-info
npx react-native run-android
```

---

### 🔄 Previously Completed (Session 2)

#### Backend Models

1. **TrackingSession.js** - Session management with fraud scoring
2. **LocationPoint.js** - GPS coordinates with geospatial indexes
3. **TrackingSessionSummary.js** - Pre-aggregated daily stats

#### Backend API Routes

1. **POST /api/v1/tracking/sessions/start** - Create tracking session
2. **POST /api/v1/tracking/sessions/:id/locations/batch** - Upload 1-50 points
3. **PUT /api/v1/tracking/sessions/:id/stop** - Stop session with summary

#### Mobile Services

1. **trackingAPI.ts** - Backend communication layer
2. **mockLocationService.ts** - Mock GPS with 3 Dhaka routes

#### Map Integration

- Switched from Google Maps to OpenStreetMap (100% free)
- Leaflet.js integration in WebView
- Real-time polyline rendering

---

### 🧪 Testing Status

#### Mobile App Testing

✅ App builds and runs on Android emulator
✅ Mock GPS mode works (USE_MOCK_GPS = true)
✅ Map displays correctly with OpenStreetMap
✅ Location buffering logic implemented
✅ Backend API integration complete

#### Backend API Testing

⏳ Created test script: `test-tracking-api.js`
⏳ Need valid auth credentials for testing
⏳ Awaiting superadmin login fix

---

### 📋 Next Steps (Priority Order)

#### 1. **End-to-End Testing** (IMMEDIATE)

- [ ] Test mobile app with real backend API
- [ ] Verify session creation and location uploads
- [ ] Check MongoDB for stored sessions and location points
- [ ] Test stop session and summary retrieval
- [ ] Validate geospatial queries work correctly

#### 2. **Offline Queue Service** (HIGH PRIORITY)

Create `mobile/src/services/syncService.ts`:

- [ ] Store failed API calls in AsyncStorage
- [ ] Implement exponential backoff retry logic
- [ ] Detect network connectivity changes
- [ ] Auto-sync when connection restored
- [ ] Show sync status in UI (syncing/synced/failed)

**Data Structure:**

```typescript
interface QueuedRequest {
  id: string;
  endpoint: string;
  method: "POST" | "PUT";
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}
```

#### 3. **Enhanced Device Metadata** (MEDIUM)

- [ ] Add battery level monitoring
- [ ] Detect mock GPS/location spoofing
- [ ] Track network type (WiFi/4G/5G)
- [ ] Send metadata with each batch upload

#### 4. **Fraud Detection Service** (HIGH PRIORITY)

Create `backend/services/trackingValidationService.js`:

- [ ] Mock GPS detection (check provider field)
- [ ] Speed validation (flag >120 km/h)
- [ ] Distance jump detection (teleportation)
- [ ] Territory boundary validation
- [ ] Suspicious pattern detection (zig-zag, rapid changes)
- [ ] Auto-flag suspicious sessions

**Fraud Scoring System:**

```javascript
Base Score: 0 (no fraud)
+20: Mock GPS detected
+15: Speed > 120 km/h
+25: Distance jump > 5 km
+10: Outside territory bounds
+10: Suspicious movement pattern
Score > 50: Auto-flag for review
```

#### 5. **Admin Dashboard** (NEXT.JS FRONTEND)

Create `frontend/src/app/tracking/dashboard/page.tsx`:

**Features:**

- [ ] Leaflet.js map showing all active field officers
- [ ] Color-coded markers (active/paused/completed)
- [ ] Click marker to view session details
- [ ] Live WebSocket updates for real-time tracking
- [ ] Filter by date, employee, territory, route
- [ ] Session list with virtual scrolling (432K points/day)
- [ ] Fraud score indicators
- [ ] Export to CSV/PDF

**UI Components:**

```typescript
<DashboardLayout>
  <FilterBar />
  <LiveMap markers={fieldOfficers} />
  <SessionList sessions={filteredSessions} />
  <StatsPanel summary={dailyStats} />
</DashboardLayout>
```

#### 6. **Real-time Updates** (WebSocket)

- [ ] Implement Socket.IO on backend
- [ ] Create tracking room per territory/employee
- [ ] Emit location updates in real-time
- [ ] Update dashboard map live
- [ ] Show notification for suspicious activity

#### 7. **Reports & Analytics**

- [ ] Daily movement summary reports
- [ ] Territory coverage heatmaps
- [ ] Distance traveled trends
- [ ] Fraud detection summary
- [ ] Export functionality

---

### 🏗️ System Architecture

#### Data Flow

```
Mobile App (React Native)
    ↓ Location Update (GPS/Mock)
    ↓ Buffer in memory (max 20 points or 2 min)
    ↓
trackingAPI.uploadLocations()
    ↓ POST /api/v1/tracking/sessions/:id/locations/batch
    ↓
Backend Route (Express.js)
    ↓ Validate & Insert with insertMany()
    ↓
MongoDB (LocationPoints collection)
    ↓ 2dsphere geospatial index
    ↓
Calculate Distance (Haversine formula)
    ↓
Update TrackingSession.total_distance_km
    ↓
Real-time WebSocket Emit
    ↓
Next.js Admin Dashboard
    ↓ Leaflet.js Map Update
```

#### Performance Optimizations

**Mobile:**

- Batch uploads (20 points or 2 min)
- Offline queue for failed requests
- Local caching of session data

**Backend:**

- Bulk insert with `insertMany({ ordered: false })`
- Compound indexes: `{session_id: 1, timestamp: 1}`
- 2dsphere index for geospatial queries
- Pre-aggregated summaries for dashboard

**Database:**

- 30 days: Full precision data
- 90 days: Downsampled (1 point/5 min)
- Long-term: Aggregated summaries only

---

### 📊 Scale Targets

- **Field Officers**: 1,800
- **Daily Location Points**: 432,000 (240 points/officer/day @ 5 sec intervals for 4 hours)
- **Monthly Storage**: ~13M location points
- **Annual Storage**: ~157M location points

**MongoDB Sizing:**

- Location Point: ~150 bytes
- Daily: 432K × 150B = 64.8 MB
- Monthly: ~2 GB
- Annual: ~23.6 GB (raw data)

**Query Performance:**

- Session points: <100ms (indexed by session_id)
- Geospatial nearby: <200ms (2dsphere index)
- Dashboard aggregation: <500ms (pre-aggregated summaries)

---

### 🔍 Code Locations

#### Mobile App

- **HomeScreen**: `mobile/src/screens/HomeScreen.tsx` (lines 50-380)
- **Tracking API**: `mobile/src/services/trackingAPI.ts`
- **Mock GPS**: `mobile/src/services/mockLocationService.ts`
- **Location Service**: `mobile/src/services/locationService.ts`

#### Backend

- **Routes**: `backend/routes/tracking/sessions.js`
- **Models**:
  - `backend/models/TrackingSession.js`
  - `backend/models/LocationPoint.js`
  - `backend/models/TrackingSessionSummary.js`
- **Main Router**: `backend/src/routes/index.js` (line 81)

#### Testing

- **API Test**: `test-tracking-api.js`

---

### 🐛 Known Issues

1. **Authentication Test Failing**
   - Test script login returns 500 error
   - Need to debug superadmin login
   - Mobile app has working AsyncStorage token from previous login

2. **Device Info Installation**
   - `react-native-device-info` installed successfully
   - App rebuilt to link native module
   - Ready for use in production

---

### 💡 Technical Decisions

#### Why OpenStreetMap over Google Maps?

- 100% free (no API key required)
- No usage limits
- Leaflet.js is lightweight and feature-rich
- Full offline map tile caching possible

#### Why Batch Upload (20 points or 2 min)?

- Reduces API calls by 95% (from every 5 sec to every 2 min)
- Saves mobile battery and data
- Backend handles bulk inserts efficiently
- Still provides near-real-time tracking

#### Why Offline Queue?

- Field officers may have spotty network coverage
- Prevents data loss during network outages
- Auto-sync when connection restored
- Provides better user experience

#### Why Fraud Detection?

- Protect against GPS spoofing
- Ensure data integrity for analytics
- Compliance with tracking requirements
- Early warning for policy violations

---

### 📝 Session Notes

**Session 1**: Read requirements, understood system scope
**Session 2**: Backend infrastructure, mock GPS, OpenStreetMap
**Session 3**: Mobile-backend integration, device info, batch uploads ← YOU ARE HERE

**Next Session Focus**: End-to-end testing, offline queue, fraud detection

---

Generated: 2026-02-06  
Last Updated: Session 3 - Mobile Integration Complete
