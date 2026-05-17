---
mode: agent
description: Replace the Leaflet WebView map in TraceRouteScreen with a searchable, scrollable outlet list
---

# P5 — TraceRouteScreen: Replace Map with Searchable Outlet List

## Context

File: `mobile/src/screens/TraceRouteScreen.tsx` (~960 lines)

The current screen renders a Leaflet map inside a `WebView` with outlet markers. Clicking a marker opens a bottom sheet with outlet details and a "Get In" button. A separate slide-in drawer (hamburger icon) lists all outlets as a fallback. This approach fails for routes with 100+ outlets — the map is cluttered and the drawer is a secondary afterthought.

**The client wants the map removed entirely.** The outlet list becomes the primary UI.

---

## What to Keep (do not change)

1. `fetchMyRoute()` — the data-fetching logic for `GET /routes/my-route?day=TODAY` and the follow-up `GET /outlet-visits/today-summary?outlet_ids=...` are correct. Keep them exactly.
2. `handleGetIn(outlet)` — navigation to `ShopAction` screen with outlet params. Keep exactly.
3. `Outlet` and `RouteData` interfaces — keep exactly.
4. The "Add Shop" FAB that navigates to `AddOutlet`. Keep exactly.
5. `fetchMyRoute` error handling (401 → replace to Login, 403 → goBack, 404 → goBack). Keep exactly.

---

## What to Remove Completely

- `WebView` import and all usage
- `react-native-webview` import
- `webViewRef` — the `useRef` for WebView
- `handleWebViewMessage()` function
- `handleMarkerClick()` function
- `showBottomSheetModal()` and `hideBottomSheet()` — the bottom sheet was map-specific
- `toggleOutletsDrawer()` function
- `showBottomSheet` and `selectedOutlets` state
- `showOutletsDrawer` state
- `bottomSheetAnim` and `drawerAnim` — the `Animated.Value` refs
- All `Animated` usage
- The entire `{/* Map View */}` block (WebView + HTML string)
- The `{/* Bottom Sheet */}` Modal
- The `{/* Outlets Drawer */}` Modal
- The "☰ Outlets" button in the header
- The `outletCountBadge` overlay
- `SCREEN_WIDTH` / `width` / `height` from `Dimensions` (no longer needed unless used elsewhere)
- Styles: `mapContainer`, `map`, `outletCountBadge`, `bottomSheet*`, `drawer*`, `multiOutlet*`, `outletScrollList`, `outletsButton`, `outletsIcon`, `outletsText`

---

## New State to Add

```typescript
const [searchQuery, setSearchQuery] = useState('');
```

---

## New Main UI Layout

Replace the entire conditional block `{loading ? (...) : (...)}` with:

```
SafeAreaView (container)
  Header row (← back | "Trace My Route" + routeName subtitle)    ← keep existing header structure, remove ☰ Outlets button
  
  [Loading state]
    ActivityIndicator centered

  [Loaded state]
    Search bar (TextInput) — full width, below header
    FlatList of filtered+sorted outlets
    Add Shop FAB (keep existing, position: absolute bottom-right)
```

### Search Bar

```typescript
<View style={styles.searchContainer}>
  <TextInput
    style={styles.searchInput}
    placeholder="Search outlets..."
    placeholderTextColor="#999"
    value={searchQuery}
    onChangeText={setSearchQuery}
    clearButtonMode="while-editing"
    returnKeyType="search"
  />
  {searchQuery.length > 0 && (
    <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.searchClear}>
      <Text style={styles.searchClearText}>✕</Text>
    </TouchableOpacity>
  )}
</View>
```

### Outlet Filtering + Sorting

```typescript
const filteredOutlets = useMemo(() => {
  const q = searchQuery.trim().toLowerCase();
  const source = [...outlets].sort((a, b) =>
    a.outlet_name.localeCompare(b.outlet_name)
  );
  if (!q) return source;
  return source.filter(
    o =>
      o.outlet_name.toLowerCase().includes(q) ||
      (o.outlet_name_bangla || '').toLowerCase().includes(q) ||
      o.outlet_id.toLowerCase().includes(q)
  );
}, [outlets, searchQuery]);
```

Add `useMemo` to the import if not already there.

### Outlet List Item

Each row in the FlatList:

```
┌─────────────────────────────────────────────────┐
│  [Status dot]  Outlet Name (English)         ›  │
│               Outlet Name (Bangla, if exists)   │
│               ID: OUT-00123                     │
│               [Visit chip]                      │
└─────────────────────────────────────────────────┘
```

**Status dot:** 10×10 circle
- `is_visited_today && is_checked_out` → `#4CAF50` green
- `is_visited_today && !is_checked_out` → `#FF9800` orange
- otherwise → `#E0E0E0` grey

**Visit chip** (only if `is_visited_today`):
- Checked out: `⏱ X min` in green
- In progress: `🟢 In Progress` in orange

**On press:** navigate to `'OutletDetail'` screen passing the outlet object:
```typescript
navigation.navigate('OutletDetail', {
  outlet,
  distributorId,
});
```

### Results count sub-header

Below search bar, above list:
```typescript
<Text style={styles.resultsCount}>
  {filteredOutlets.length} of {outlets.length} outlets
</Text>
```

### Empty state

When `filteredOutlets.length === 0` and `searchQuery` is non-empty:
```typescript
<View style={styles.emptyState}>
  <Text style={styles.emptyStateText}>No outlets match "{searchQuery}"</Text>
</View>
```

---

## New Styles to Add

```typescript
searchContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#fff',
  borderBottomWidth: 1,
  borderBottomColor: '#eee',
  paddingHorizontal: 16,
  paddingVertical: 10,
},
searchInput: {
  flex: 1,
  height: 40,
  backgroundColor: '#f5f5f5',
  borderRadius: 20,
  paddingHorizontal: 16,
  fontSize: 15,
  color: '#333',
},
searchClear: {
  padding: 8,
  marginLeft: 4,
},
searchClearText: {
  fontSize: 16,
  color: '#999',
},
resultsCount: {
  fontSize: 12,
  color: '#888',
  paddingHorizontal: 16,
  paddingVertical: 8,
  backgroundColor: '#f9f9f9',
},
outletRow: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 16,
  paddingVertical: 14,
  backgroundColor: '#fff',
},
statusDot: {
  width: 10,
  height: 10,
  borderRadius: 5,
  marginRight: 12,
  marginTop: 3,
  flexShrink: 0,
},
outletRowText: {
  flex: 1,
},
outletRowName: {
  fontSize: 16,
  fontWeight: '600',
  color: '#222',
},
outletRowNameBangla: {
  fontSize: 14,
  color: '#666',
  marginTop: 2,
},
outletRowId: {
  fontSize: 12,
  color: '#aaa',
  marginTop: 2,
},
visitChip: {
  marginTop: 4,
  alignSelf: 'flex-start',
  paddingHorizontal: 8,
  paddingVertical: 2,
  borderRadius: 10,
},
visitChipText: {
  fontSize: 11,
  fontWeight: '600',
},
chevron: {
  fontSize: 18,
  color: '#ccc',
  marginLeft: 8,
},
emptyState: {
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
  paddingTop: 80,
},
emptyStateText: {
  fontSize: 15,
  color: '#999',
},
```

---

## Navigation Registration

In whichever file registers the navigation stack (likely `App.tsx` or a navigator file), ensure `OutletDetail` is registered:

```typescript
<Stack.Screen name="OutletDetail" component={OutletDetailScreen} />
```

The `OutletDetailScreen` is created in **P6**.

---

## Verification Checklist

- [ ] `WebView` import removed, no TS error about missing import
- [ ] All `Animated` refs removed, no runtime warning
- [ ] `useMemo` imported from React
- [ ] Search filters by English name, Bangla name, and outlet_id
- [ ] Visit status chips render correctly for all 3 states
- [ ] "Add Shop" FAB still navigates to `AddOutlet`
- [ ] Pressing an outlet row navigates to `OutletDetail` with `{ outlet, distributorId }`
- [ ] `filteredOutlets` count updates as user types
- [ ] No references to `webViewRef`, `bottomSheetAnim`, `drawerAnim` remain
