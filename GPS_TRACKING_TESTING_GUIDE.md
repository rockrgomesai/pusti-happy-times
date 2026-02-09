# GPS Tracking - Mobile App Testing Guide

## Quick Start Testing

### Prerequisites

✅ Android emulator running  
✅ Backend server running on port 8080  
✅ MongoDB running (via Docker)  
✅ Metro bundler running on port 8081  
✅ Mobile app installed and running

---

## Test Flow

### 1. Login to Mobile App

Use any valid user with tracking role (ZSM, RSM, ASM, SO):

- Username: `testuser` (or any field officer user)
- Password: `123456`

### 2. Navigate to Home Screen

- You should see the **Track Movement** button (only visible for field officer roles)

### 3. Enable Mock GPS (For Testing)

The mock GPS mode is currently enabled in the code:

**File**: `mobile/src/screens/HomeScreen.tsx` (line 25)

```typescript
const USE_MOCK_GPS = true; // Set to false for real GPS
const MOCK_ROUTE = "DHAKA_COMMUTE"; // Options: GULSHAN_LOOP, DHAKA_COMMUTE, QUICK_TEST
```

### 4. Start Tracking

1. Tap **"Track On"** button
2. App will:
   - Call backend API to create tracking session
   - Get back a `session_id`
   - Start mock GPS simulation (updates every 5 seconds)
   - Buffer location points in memory
   - Upload batch to backend every **2 minutes** or **20 points**

**Console Logs to Watch:**

```
🧪 MOCK GPS MODE ENABLED
📍 Using route: DHAKA_COMMUTE
✅ Session started: {session_id: "..."}
🧪 Mock location update: {lat: 23.8103, lng: 90.4125}
📤 Uploading 20 location points...
✅ Upload successful
```

### 5. Map Display

- OpenStreetMap will display in WebView
- Blue polyline shows your tracked route
- Map auto-centers on current location
- Real-time updates every 5 seconds

### 6. Stats Display

During tracking, you'll see:

- **Distance**: Kilometers traveled (incremental)
- **Duration**: Time elapsed (HH:MM:SS)
- **Visits**: Number of outlet visits (placeholder)

### 7. Stop Tracking

1. Tap **"Track Off"** button
2. App will:
   - Upload remaining buffered points
   - Call backend API to stop session
   - Display summary alert with final stats

**Summary Alert:**

```
✅ Tracking Stopped

Route saved successfully!

Distance: 2.35 km
Duration: 14 minutes
Points recorded: 42
```

---

## Backend Verification

### Check Session in MongoDB

```bash
# Connect to MongoDB
docker exec -it mongodb mongosh -u admin -p admin123 --authenticationDatabase admin

# Switch to database
use pusti_ht_dev

# Find the session
db.tracking_sessions.find({}).sort({start_time: -1}).limit(1).pretty()

# Check location points
db.location_points.find({session_id: "YOUR_SESSION_ID"}).count()
db.location_points.find({session_id: "YOUR_SESSION_ID"}).limit(5).pretty()
```

### Expected Session Document

```json
{
  "_id": ObjectId("..."),
  "session_id": "TRK-20260206-ABC123",
  "user_id": ObjectId("..."),
  "employee_id": ObjectId("..."),
  "status": "completed",
  "start_time": ISODate("2026-02-06T10:30:00Z"),
  "end_time": ISODate("2026-02-06T10:45:00Z"),
  "total_distance_km": 2.35,
  "total_duration_seconds": 900,
  "device_info": {
    "model": "Medium_Phone(AVD)",
    "os_version": "9",
    "app_version": "0.0.1"
  },
  "fraud_score": 20,  // Mock GPS detected
  "fraud_flags": ["mock_gps_detected"]
}
```

### Expected Location Point

```json
{
  "_id": ObjectId("..."),
  "session_id": "TRK-20260206-ABC123",
  "latitude": 23.8103,
  "longitude": 90.4125,
  "location": {
    "type": "Point",
    "coordinates": [90.4125, 23.8103]
  },
  "timestamp": ISODate("2026-02-06T10:30:05Z"),
  "accuracy": 10,
  "speed": 5,
  "heading": 90,
  "altitude": 10,
  "is_mock": true,
  "provider": "mock"
}
```

---

## Testing Scenarios

### Scenario 1: Mock GPS - Quick Test Route

**Route**: QUICK_TEST (4 points, 20 seconds)

1. Change route in HomeScreen.tsx:
   ```typescript
   const MOCK_ROUTE = "QUICK_TEST";
   ```
2. Rebuild app: `npx react-native run-android`
3. Start tracking
4. Wait ~20 seconds
5. Stop tracking
6. Verify 4 location points in MongoDB

### Scenario 2: Mock GPS - Dhaka Commute

**Route**: DHAKA_COMMUTE (9 points, 45 seconds)

- Tests longer route
- Multiple direction changes
- Distance calculation accuracy

### Scenario 3: Real GPS (Requires Physical Device)

1. Set `USE_MOCK_GPS = false`
2. Install app on physical Android device:
   ```bash
   npx react-native run-android --device
   ```
3. Grant location permissions
4. Walk around with device
5. Track real movement

### Scenario 4: Batch Upload Threshold

1. Use DHAKA_COMMUTE route
2. Watch console logs
3. After 20 points, should see:
   ```
   📤 Uploading 20 location points...
   ✅ Upload successful: {points_recorded: 20}
   ```

### Scenario 5: Time-Based Upload

1. Use GULSHAN_LOOP route (7 points)
2. Wait 2 minutes
3. Even with < 20 points, upload should trigger
4. Console log:
   ```
   📤 Uploading 7 location points...
   ```

---

## Debugging Tips

### Mobile App Logs

```bash
# Android Logcat
npx react-native log-android

# Or use VS Code terminal with Metro bundler running
# Look for console.log statements
```

### Backend API Logs

```bash
# If using nodemon
npm run backend:dev

# Check for:
✅ POST /api/v1/tracking/sessions/start
✅ POST /api/v1/tracking/sessions/:id/locations/batch
✅ PUT /api/v1/tracking/sessions/:id/stop
```

### Common Issues

#### "Session start failed"

- **Cause**: Backend not running or MongoDB connection failed
- **Fix**:
  ```bash
  docker-compose up -d mongodb
  npm run backend:dev
  ```

#### "Invalid access token"

- **Cause**: JWT expired or AsyncStorage cleared
- **Fix**: Re-login to mobile app

#### "Could not get current location"

- **Cause**: GPS permissions denied or emulator has no GPS
- **Fix**: Use `USE_MOCK_GPS = true` on emulator

#### Map not displaying

- **Cause**: WebView failed to load OpenStreetMap tiles
- **Fix**: Check internet connection in emulator

---

## Performance Metrics

### Mobile App

- **Memory Usage**: Monitor with Android Studio Profiler
- **Battery Impact**: Check with Battery Historian
- **Network Traffic**: ~5 KB per batch upload (20 points)

### Backend API

- **Session Start**: <100ms
- **Batch Upload (20 points)**: <200ms
- **Session Stop**: <150ms

### Database

- **Insert 20 Points**: <50ms (indexed bulk insert)
- **Query Session Points**: <100ms
- **Geospatial Query**: <200ms

---

## Next: End-to-End Integration Test

Once basic testing passes, run full integration test:

1. ✅ Start tracking on mobile
2. ✅ Verify session created in MongoDB
3. ✅ Upload multiple batches (wait 2 min each)
4. ✅ Verify location points inserted
5. ✅ Stop tracking
6. ✅ Verify session updated with totals
7. ✅ Check fraud detection flags (mock GPS = +20 score)
8. ✅ Verify geospatial indexes work
9. ✅ Test aggregation queries (distance, duration)

---

## Mock Routes Reference

### QUICK_TEST (Testing Only)

- **Duration**: ~20 seconds
- **Points**: 4
- **Distance**: ~1 km
- **Use**: Quick integration test

### GULSHAN_LOOP (Development)

- **Duration**: ~35 seconds
- **Points**: 7
- **Distance**: ~2 km
- **Use**: Standard development testing

### DHAKA_COMMUTE (Realistic Simulation)

- **Duration**: ~45 seconds
- **Points**: 9
- **Distance**: ~5 km
- **Use**: Realistic field officer movement

---

**Ready to Test!** 🚀

Start with QUICK_TEST route, verify MongoDB records, then move to longer routes.
