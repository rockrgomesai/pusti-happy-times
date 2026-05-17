---
mode: agent
description: Create OutletDetailScreen — side-by-side DB location vs live GPS comparison with distance and Get In button
---

# P6 — OutletDetailScreen: Location Comparison Panel

## Context

This is a **new screen** created as a result of the TraceRouteScreen redesign (P5). When an SO taps an outlet in the new searchable list, they are taken here.

**Purpose:** Show the outlet's stored GPS coordinates (from the database) alongside the SO's current live GPS fix. Display the calculated distance between the two points. Let the SO tap "Get In" to proceed to `ShopAction`.

---

## Create File

**Path:** `mobile/src/screens/OutletDetailScreen.tsx`

---

## Navigation Props

Received via `route.params`:
```typescript
interface OutletDetailParams {
  outlet: {
    _id: string;
    outlet_id: string;
    outlet_name: string;
    outlet_name_bangla?: string;
    address?: string;
    lati: number;   // DB latitude
    longi: number;  // DB longitude
    is_visited_today?: boolean;
    is_checked_out?: boolean;
    visit_duration?: number;
  };
  distributorId: string;
}
```

---

## GPS Permission + Live Location

Use `react-native-geolocation-service` (already installed — used in `ShopActionScreen.tsx`).

```typescript
import Geolocation from 'react-native-geolocation-service';
import { PermissionsAndroid, Platform } from 'react-native';
```

On mount:
1. Request `ACCESS_FINE_LOCATION` permission (Android) — same pattern as `ShopActionScreen.tsx`
2. Call `Geolocation.getCurrentPosition(...)` with `{ enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }`
3. Store result in `currentLocation` state: `{ latitude: number; longitude: number; accuracy: number } | null`
4. If permission denied → set `locationError = 'Location permission denied'`
5. If geolocation fails → set `locationError = 'Unable to get current location'`

State:
```typescript
const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);
const [locationLoading, setLocationLoading] = useState(true);
const [locationError, setLocationError] = useState<string | null>(null);
```

---

## Haversine Distance Calculation

Add a pure function (no imports needed):

```typescript
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // meters
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
```

Format distance:
```typescript
function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(2)} km`;
}
```

---

## Screen Layout

```
┌─────────────────────────────────────────────────┐
│ ← Back        Outlet Details                    │  header, teal bg
├─────────────────────────────────────────────────┤
│                                                 │
│  Noor General Store                             │  outlet_name, 20sp bold
│  নূর জেনারেল স্টোর                              │  outlet_name_bangla, 16sp grey
│  ID: OUT-00123                                  │  outlet_id, 12sp muted
│  123 Mirpur Road, Dhaka                         │  address (if exists)
│                                                 │
│  [Visit chip — if visited today]                │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  Location Comparison                            │  section heading
│                                                 │
│  ┌──────────────────┬──────────────────┐        │
│  │  📍 In Database  │  📡 Your GPS     │        │
│  │                  │                  │        │
│  │  23.8103° N      │  23.8108° N      │        │
│  │  90.4125° E      │  90.4130° E      │        │
│  └──────────────────┴──────────────────┘        │
│                                                 │
│  Distance: ~62 m                                │  prominent, colored by proximity
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  ╔═══════════════════════════════════════════╗  │
│  ║           Get In →                       ║  │  big green button
│  ╚═══════════════════════════════════════════╝  │
│                                                 │
│  Refresh Location                               │  secondary text button below
└─────────────────────────────────────────────────┘
```

---

## Location Panel Detail

### GPS Loading State
While `locationLoading === true` for the "Your GPS" column:
```
📡 Your GPS
Getting location...
[ActivityIndicator size="small"]
```

### GPS Error State
If `locationError` is set:
```
📡 Your GPS
⚠ Could not get location
[small retry icon / "Try Again" link]
```

### Both locations known
Show the two-column panel. Distance line underneath.

**Distance color coding:**
- `< 20 m` → `#4CAF50` green — "✅ ~Xm"  
- `20–100 m` → `#FF9800` orange — "⚠ ~Xm"
- `> 100 m` → `#F44336` red — "❌ ~Xm"  

Proximity hint text below distance:
- `< 20 m` → "You are at this outlet"
- `20–100 m` → "You are nearby"
- `> 100 m` → "You may be far from this outlet"

### DB location unknown (lati === 0 && longi === 0)
Show a warning instead of coordinates:
```
📍 In Database
⚠ No GPS on record
```
Distance line hidden.

---

## Coordinate Display Format

Lat/Lng should show 6 decimal places with direction suffix:
```typescript
function formatCoord(value: number, isLat: boolean): string {
  const abs = Math.abs(value);
  const dir = isLat ? (value >= 0 ? 'N' : 'S') : (value >= 0 ? 'E' : 'W');
  return `${abs.toFixed(6)}° ${dir}`;
}
```

Example output: `23.810300° N` / `90.412500° E`

---

## "Get In" Button Behaviour

Same as existing `handleGetIn` in TraceRouteScreen:
```typescript
const handleGetIn = () => {
  if (!distributorId) {
    Alert.alert('Error', 'Distributor information not loaded. Please try again.');
    return;
  }
  navigation.navigate('ShopAction', {
    outletId: outlet._id,
    outletName: outlet.outlet_name,
    outletAddress: outlet.address,
    outletLocation: {
      latitude: outlet.lati,
      longitude: outlet.longi,
    },
    distributorId,
  });
};
```

Do **not** add any proximity gate here — the proximity check already happens inside `ShopActionScreen`. This screen is informational only.

---

## "Refresh Location" Button

Re-runs the Geolocation call:
```typescript
const refreshLocation = () => {
  setLocationLoading(true);
  setLocationError(null);
  setCurrentLocation(null);
  // re-run fetchCurrentLocation()
};
```

Extract the geolocation call into a `fetchCurrentLocation()` function so both `useEffect` and the refresh button can call it.

---

## Visit Status Section

If `outlet.is_visited_today`:

```typescript
// Checked out
if (outlet.is_checked_out) {
  // Green chip: "⏱ Xmin visited today"
}
// In progress
else {
  // Orange chip: "🟢 Visit in progress"
}
```

---

## Styles (key ones)

```typescript
container: { flex: 1, backgroundColor: '#f5f5f5' },
header: {
  flexDirection: 'row', alignItems: 'center',
  backgroundColor: '#006D77', paddingHorizontal: 15, paddingVertical: 12,
},
headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', flex: 1, textAlign: 'center' },
backButton: { padding: 8 },
backIcon: { fontSize: 24, color: '#fff' },

infoCard: {
  backgroundColor: '#fff', margin: 16, borderRadius: 12,
  padding: 16, elevation: 2,
},
outletName: { fontSize: 20, fontWeight: 'bold', color: '#1a1a1a' },
outletNameBangla: { fontSize: 15, color: '#666', marginTop: 4 },
outletIdText: { fontSize: 12, color: '#aaa', marginTop: 4 },
outletAddress: { fontSize: 13, color: '#777', marginTop: 6 },

sectionHeading: {
  fontSize: 13, fontWeight: '700', color: '#888',
  textTransform: 'uppercase', letterSpacing: 0.8,
  marginHorizontal: 16, marginTop: 16, marginBottom: 8,
},

locationCard: {
  backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 12,
  overflow: 'hidden', elevation: 2,
},
locationRow: { flexDirection: 'row' },
locationCol: {
  flex: 1, padding: 16,
  borderRightWidth: 1, borderRightColor: '#f0f0f0', // right column omits this
},
locationColHeader: {
  flexDirection: 'row', alignItems: 'center', marginBottom: 10,
},
locationColTitle: { fontSize: 12, fontWeight: '700', color: '#555', marginLeft: 6 },
coordText: { fontSize: 14, color: '#222', fontWeight: '500', marginBottom: 4 },

distanceRow: {
  flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
  paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#f0f0f0',
},
distanceValue: { fontSize: 22, fontWeight: 'bold', marginRight: 8 },
distanceHint: { fontSize: 13, color: '#888' },

getInButton: {
  backgroundColor: '#4CAF50', marginHorizontal: 16, marginTop: 24,
  paddingVertical: 16, borderRadius: 14, alignItems: 'center', elevation: 3,
},
getInButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
refreshButton: { alignItems: 'center', marginTop: 12, paddingVertical: 8 },
refreshButtonText: { color: '#006D77', fontSize: 14 },
```

---

## Verification Checklist

- [ ] Screen renders with outlet name/bangla/id/address correctly
- [ ] Geolocation permission requested on Android on mount
- [ ] Loading spinner shown while GPS fix is pending
- [ ] Error state shown when GPS unavailable, with "Try Again" that re-fetches
- [ ] DB `lati === 0 && longi === 0` → "No GPS on record" warning, distance hidden
- [ ] Distance color coded green/orange/red correctly
- [ ] Proximity hint text updates with distance
- [ ] Coordinate format: `23.810300° N` style
- [ ] "Get In" navigates to ShopAction with correct params
- [ ] "Refresh Location" re-fetches GPS fix and updates all calculated values
- [ ] Visit chip shows correctly for all 3 visit states
- [ ] No TS errors in `OutletDetailScreen.tsx`
- [ ] Screen registered in the navigation stack
