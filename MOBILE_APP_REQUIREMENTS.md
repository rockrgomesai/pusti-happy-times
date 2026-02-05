# Mobile App - Requirements & Use Cases

**Last Updated:** February 5, 2026  
**Status:** In Development - Foundation Complete

---

## � **QUICK START GUIDE - READ THIS FIRST**

### **Every Session Startup - 3 Simple Steps:**

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

### **Important Notes:**

- Backend must be running on port 8080
- If Metro bundler asks about port 8081, choose "Yes" to use alternate port
- First build takes 2-3 minutes
- Subsequent builds are faster (use cached Gradle tasks)
- **HTTP cleartext traffic is enabled** in AndroidManifest.xml for development
- After making code changes, rebuild with: `npx react-native run-android`

### **Common Issues & Fixes:**

**Problem:** Login fails with network error

- **Fix:** Ensure `android:usesCleartextTraffic="true"` in AndroidManifest.xml
- Rebuild the app after any AndroidManifest changes

**Problem:** Cannot connect to backend

- **Fix:** Verify backend is running on port 8080: `netstat -ano | Select-String ":8080"`
- Use `10.0.2.2:8080` for Android emulator (not `localhost`)

**Problem:** App doesn't update after code changes

- **Fix:** Clean build required:
  ```powershell
  cd C:\tkg\pusti-ht-mern\mobile\android
  .\gradlew.bat clean assembleDebug
  cd ..
  npx react-native run-android
  ```

**Problem:** App shows old cached code

- **Fix:** Complete reset:
  ```powershell
  cd C:\tkg\pusti-ht-mern\mobile
  Remove-Item -Recurse -Force android\app\build
  npx react-native start --reset-cache
  # In new terminal:
  npx react-native run-android
  ```

---

## �📱 **App Overview**

**Platform:** React Native 0.83.1 (iOS + Android)  
**Architecture:** Offline-first with background sync  
**Backend API:** http://10.0.2.2:8080/api/v1 (Android emulator)

---

## ✅ **Completed Features**

### **1. Authentication Module**

- ✅ Common login screen for all user roles
- ✅ Username/password authentication
- ✅ Token management (access + refresh tokens)
- ✅ AsyncStorage for persistence
- ✅ Auto-navigation based on auth state
- ✅ Embedded company logo (local asset)

**Files:**

- `mobile/src/screens/LoginScreen.tsx`
- `mobile/src/services/authService.ts`
- `mobile/src/components/PustiLogo.tsx`
- `mobile/src/assets/images/logo.png`

---

## 🎯 **Planned Features by Role**

### **Understanding:**

- **Screen 1:** Login (common for all) ✅
- **Screen 2:** Home screen with role-based features
- Features will be added based on user's role after login

### **User Roles:**

1. **SO** (Sales Officer) - Field staff
2. **DSR** (Distributor Sales Representative)
3. **ASM** (Area Sales Manager)
4. **RSM** (Regional Sales Manager)
5. **ZSM** (Zonal Sales Manager)
6. **Distributor**
7. **SuperAdmin**
8. **Sales Admin**
9. **MIS**

---

## 📋 **Feature Requirements Queue**

### **Feature 1: GPS Movement Tracking (SO)**

**Status:** Requirements documented, not implemented

**Use Case:**
An SO leaves home on a motorbike for their designated Route (a logical collection of Outlets). The SO can press "TRACK ON" button at any point. The app will:

1. Ensure location is enabled (force SO to turn it on if disabled)
2. Track movement every 1 minute
3. Save to database for HQ monitoring
4. Draw movement on map (like Uber real-time)
5. Work in background even when app is minimized

**Tracking Sessions:**

- **Perfect scenario:** 1 press in morning (Track On), 1 press in evening (Track Off)
- **Break scenario:** SO can Track Off for break, then Track On again
- **Result:** Broken polylines for the day showing multiple sessions

**UI Design:**

- **Toggle button** (recommended)
  - Track Off State: Gray button "Track On"
  - Track On State: Green button "Tracking..." with pulse animation
- Shows on map with different colored polylines per session

**Data to Collect:**

- Latitude/Longitude
- Timestamp
- Session ID
- Accuracy
- Speed (optional)

**Database Schema:**

```javascript
TrackingSession:
- session_id
- user_id (SO)
- route_id
- date
- start_time
- end_time (null if active)
- status (active/paused/completed)

LocationPoint:
- point_id
- session_id (FK)
- latitude
- longitude
- timestamp
- accuracy
- speed
```

**Implementation Phases:**

1. **Phase 1:** GPS permissions + location service
2. **Phase 2:** Backend API + database
3. **Phase 3:** UI with map + toggle button
4. **Phase 4:** Background service + notifications
5. **Phase 5:** Broken polyline visualization
6. **Phase 6:** HQ monitoring dashboard (future)
7. **Phase 7:** Edge cases + error handling

**MVP Scope (First Release):**

- Toggle button UI
- Location tracking every 1 minute
- Background service with notification
- Local storage + batch upload to server
- Basic map with polyline
- Single session per day (simplified)

**Deferred to v2:**

- Multiple session colors
- Real-time HQ monitoring
- Historical playback
- Advanced analytics
- Route deviation alerts

---

## 🗺️ **Feature Roadmap**

### **Immediate Next Steps:**

1. Implement GPS tracking for SO role

### **Future Features (from requirements):**

Based on Secondary Sales Mobile App requirements:

**For SO (Sales Officer):**

- [ ] GPS Movement Tracking ⬅️ **NEXT**
- [ ] Outlet Visit & Coverage
  - [ ] GPS-based proximity detection
  - [ ] Shop open/closed status
  - [ ] Brand coverage tracking
- [ ] Order Placement
  - [ ] Manual order entry
  - [ ] System-based order creation
  - [ ] Offline order capability
- [ ] Order Amendment
- [ ] Outlet Summary
- [ ] Attendance Marking
- [ ] Journey Plan (PJP)
- [ ] Dashboard & KPIs

**For DSR (Distributor Sales Representative):**

- [ ] Product Delivery Recording
- [ ] IMS Entry
- [ ] Product Returns

**For ASM/RSM/ZSM (Managers):**

- [ ] Team monitoring
- [ ] Approval workflows
- [ ] Reports & analytics

**For Distributor:**

- [ ] Stock visibility
- [ ] Order tracking
- [ ] Collection records

**Common Features:**

- [ ] Audit & Survey forms
- [ ] User feedback submission
- [ ] Notifications
- [ ] Report viewing

---

## 🏗️ **Technical Architecture**

### **Current Stack:**

- **Frontend:** React Native 0.83.1, TypeScript
- **Navigation:** React Navigation v7
- **State:** AsyncStorage
- **HTTP Client:** Axios
- **Map:** TBD (React Native Maps recommended)

### **Required Dependencies (to install):**

```json
{
  "react-native-maps": "For GPS visualization",
  "react-native-geolocation-service": "For GPS tracking",
  "react-native-sqlite-storage": "For offline storage",
  "@react-native-community/netinfo": "For connectivity detection",
  "react-native-background-fetch": "For background sync",
  "react-native-background-timer": "For background location"
}
```

### **Offline-First Strategy:**

1. SQLite local database
2. Queue system for pending uploads
3. Background sync service
4. Conflict resolution
5. Data cleanup post-sync

---

## 📝 **Session Notes**

### **Session 1 - February 5, 2026**

**Completed:**

1. Mobile app successfully launched on Android emulator
2. Login screen implemented with embedded logo
3. Basic navigation structure created
4. Authentication flow working
5. **Fixed backend connection issues:**
   - Updated API port from 5000 to 8080
   - Fixed response parsing to match backend structure: `{success, data: {user, tokens}}`

**Discussed:**

1. GPS tracking use case for SO role
2. Role-based feature implementation strategy
3. Broken polyline concept for tracking sessions
4. Toggle button vs separate buttons (decision: toggle)

**Decisions Made:**

1. Use toggle button for Track On/Off
2. Collect location every 1 minute
3. Support multiple sessions per day (broken polylines)
4. Implement offline-first architecture
5. MVP scope defined for GPS tracking

**Next Session Actions:**

1. Start implementing GPS tracking for SO
2. Install required dependencies
3. Create role-based home screen

---

## 🔄 **How to Use This Document**

**At Session Start:**

1. Read this entire document to get updated
2. Check "Completed Features" section
3. Review "Feature Requirements Queue"
4. Continue from "Next Session Actions"

**During Session:**

1. Update status of features
2. Add new requirements to queue
3. Document decisions made
4. Note any blockers or questions

**At Session End:**

1. Update "Last Updated" date
2. List completed items
3. Add "Next Session Actions"
4. Save file

---

## ❓ **Open Questions**

1. Which map provider? (Google Maps vs OpenStreetMap vs Mapbox)
2. Location tracking interval: Is 1 minute good? (battery vs accuracy)
3. Auto-stop tracking after how many hours of inactivity?
4. Maximum GPS points to store locally before forcing sync?
5. Should we allow SO to see their historical tracking data?

---

## 📚 **Reference Documents**

- `SECONDARY_SRS_STRUCTURED.md` - Complete requirements
- `QUOTATION_SPECIFICATION.md` - Module specifications
- `MOBILE_FIRST_SCHEDULING_IMPLEMENTATION.md` - UI patterns
- `mobile/README.md` - Mobile app setup guide

---

**END OF REQUIREMENTS DOCUMENT**
