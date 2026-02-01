# Secondary Offers Module - Architecture & Implementation

## Module Overview

Secondary Offers target **specific outlets** through a cascading selection hierarchy:

- **Primary Offers** → Target distributors (distributor receives offer for all their outlets)
- **Secondary Offers** → Target individual outlets (specific outlets receive the offer)

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                   SECONDARY OFFER CREATION                       │
└─────────────────────────────────────────────────────────────────┘

STEP 1: Basic Information
├── Name, Offer Type, Product Segments
├── Start/End Dates, Status, Active Toggle
├── **Stock Application: Applies to Distributor Stock** (NEW)
│   └── When enabled: Offer applies when SO sells from distributor stock to outlets
└── Description

STEP 2: Territory Targeting (Geographic Filter)
├── Zones → Regions → Areas → DB Points
├── Include/Exclude mode per level
└── Optional: Leave empty = All territories

STEP 3: Distributor & Route Targeting (Channel Filter) **NEW**
├── Distributors (filtered by selected territories)
│   ├── Include/Exclude mode
│   └── "Apply to all routes" checkbox
└── Routes (filtered by selected distributors)
    ├── Include/Exclude mode
    └── "Apply to all outlets" checkbox

STEP 4: Outlet Targeting (Final Selection) **NEW**
├── Selection Mode:
│   ├── ALL: Include all outlets from above filters
│   ├── SPECIFIC: Manual multi-select (include/exclude)
│   └── FILTERED: Filter by outlet type, channel, market size
├── Preview Button → Shows resolved outlet count
└── Sample List (first 100 outlets)

STEP 5: Offer Configuration (Reused from Primary)
├── Product Selection
├── Offer Type Config (15 types):
│   ├── FLAT_DISCOUNT_PCT/AMT
│   ├── DISCOUNT_SLAB_PCT/AMT
│   ├── BOGO / BOGO_DIFFERENT_SKU
│   ├── BUNDLE_OFFER
│   ├── FREE_PRODUCT
│   └── ... (10 more types)
└── Additional Rules (min order, limits, etc.)

┌─────────────────────────────────────────────────────────────────┐
│                   OUTLET RESOLUTION FLOW                        │
└─────────────────────────────────────────────────────────────────┘

Input: Offer Scope
    ↓
Territory Filter
    ├── Collect all DB Point IDs from territories
    └── Filter outlets by DB Points
        ↓
Distributor Filter
    ├── Include/Exclude selected distributors
    └── Filter outlets by distributor_id
        ↓
Route Filter
    ├── Include/Exclude selected routes
    └── Filter outlets by route_id
        ↓
Outlet Selection
    ├── ALL: Keep all from above
    ├── SPECIFIC: Apply include/exclude list
    └── FILTERED: Apply outlet type, channel, market size
        ↓
Output: Array of Outlet IDs
    ├── Cached in offer.resolvedOutlets
    └── Used for offer eligibility checks
```

## Data Flow

### Create Offer Flow

```
User → Wizard → Frontend Validation → API POST /product/secondaryoffers
                                          ↓
                               Backend Validation
                                          ↓
                          Validate Territories Exist
                                          ↓
                         Validate Distributors Exist
                                          ↓
                            Validate Routes Exist
                                          ↓
                            Validate Outlets Exist
                                          ↓
                              Save to MongoDB
                                          ↓
                          Pre-save Hook: Resolve Outlets
                                          ↓
                          Cache in resolvedOutlets[]
                                          ↓
                          Return Created Offer → Frontend
```

### Outlet Resolution Algorithm

```javascript
function resolveTargetedOutlets(offerScope) {
  let outletQuery = { active: true };

  // 1. Territory Filter
  if (offerScope.territories has selections) {
    dbPointIds = collectDbPointsFromTerritories(territories);
    outletQuery["route_id.distributor_id.db_point_id"] = { $in: dbPointIds };
  }

  // 2. Distributor Filter
  if (offerScope.targeting.distributors.ids.length > 0) {
    mode = offerScope.targeting.distributors.mode; // "include" or "exclude"
    outletQuery["route_id.distributor_id"] = { [mode === "include" ? "$in" : "$nin"]: distributorIds };
  }

  // 3. Route Filter
  if (offerScope.targeting.routes.ids.length > 0) {
    mode = offerScope.targeting.routes.mode;
    outletQuery["route_id"] = { [mode === "include" ? "$in" : "$nin"]: routeIds };
  }

  // 4. Get Base Outlets
  outlets = Outlet.find(outletQuery);

  // 5. Apply Outlet-Level Selection
  if (selectionMode === "specific") {
    if (mode === "include") {
      outlets = outlets.filter(id in specificIds);
    } else {
      outlets = outlets.filter(id not in specificIds);
    }
  } else if (selectionMode === "filtered") {
    if (filters.outletTypes) outlets = outlets.filter(type in outletTypes);
    if (filters.channels) outlets = outlets.filter(channel in channels);
    if (filters.minMarketSize) outlets = outlets.filter(size >= minSize);
    if (filters.maxMarketSize) outlets = outlets.filter(size <= maxSize);
  }

  return outlets.map(o => o._id);
}
```

## Database Schema

### SecondaryOffer Collection

```javascript
{
  _id: ObjectId,
  name: String,
  offer_type: String, // FLAT_DISCOUNT_PCT, BOGO, etc.
  product_segments: ["BIS", "BEV"],
  start_date: Date,
  end_date: Date,
  status: String, // Draft, Active, Paused, Expired, Completed
  active: Boolean,

  // Stock Application (applies to distributor stock)
  appliesToDistributorStock: Boolean, // Default: true
  // When true, offer is available when SO sells from distributor stock to outlets
  // System checks distributor stock availability before applying offer

  // Territory Targeting (same as Primary Offers)
  territories: {
    zones: { ids: [ObjectId], mode: "include/exclude" },
    regions: { ids: [ObjectId], mode: "include/exclude" },
    areas: { ids: [ObjectId], mode: "include/exclude" },
    db_points: { ids: [ObjectId], mode: "include/exclude" }
  },

  // NEW: Distributor & Route Targeting
  targeting: {
    distributors: {
      ids: [ObjectId],
      mode: "include/exclude",
      applyToAllRoutes: Boolean
    },
    routes: {
      ids: [ObjectId],
      mode: "include/exclude",
      applyToAllOutlets: Boolean
    }
  },

  // NEW: Outlet Targeting
  outlets: {
    selectionMode: "all/specific/filtered",
    ids: [ObjectId], // for "specific" mode
    mode: "include/exclude",
    filters: {
      outletTypes: [ObjectId],
      channels: [ObjectId],
      minMarketSize: Number,
      maxMarketSize: Number
    }
  },

  // Offer Configuration (same as Primary Offers)
  config: {
    selectedProducts: [ObjectId],
    applyToAllProducts: Boolean,
    discountPercentage: Number,
    discountAmount: Number,
    // ... (offer type specific fields)
  },

  // Cached Outlets (Performance Optimization)
  resolvedOutlets: [ObjectId], // Pre-calculated list of eligible outlets

  // Stats & Metadata
  stats: {
    totalOrders: Number,
    totalRevenue: Number,
    totalDiscount: Number,
    uniqueOutlets: Number,
    uniqueDistributors: Number
  },

  created_by: ObjectId,
  updated_by: ObjectId,
  approved_by: ObjectId,
  approved_at: Date,
  description: String,
  internal_notes: String,

  createdAt: Date,
  updatedAt: Date
}
```

## API Endpoints

### CRUD Operations

| Method | Endpoint                              | Permission                | Description      |
| ------ | ------------------------------------- | ------------------------- | ---------------- |
| POST   | `/product/secondaryoffers`            | `secondary-offers:create` | Create new offer |
| GET    | `/product/secondaryoffers`            | `secondary-offers:read`   | List all offers  |
| GET    | `/product/secondaryoffers/:id`        | `secondary-offers:read`   | Get single offer |
| PUT    | `/product/secondaryoffers/:id`        | `secondary-offers:update` | Update offer     |
| DELETE | `/product/secondaryoffers/:id`        | `secondary-offers:delete` | Delete offer     |
| PATCH  | `/product/secondaryoffers/:id/status` | `secondary-offers:update` | Toggle active    |

### Helper Endpoints

| Method | Endpoint                                   | Permission              | Description                 |
| ------ | ------------------------------------------ | ----------------------- | --------------------------- |
| POST   | `/product/secondaryoffers/outlets/resolve` | `secondary-offers:read` | Resolve outlets preview     |
| POST   | `/product/secondaryoffers/routes/eligible` | `secondary-offers:read` | Get routes for distributors |
| GET    | `/product/secondaryoffers/outlet-types`    | `secondary-offers:read` | Get outlet types            |
| GET    | `/product/secondaryoffers/outlet-channels` | `secondary-offers:read` | Get outlet channels         |

## Frontend Structure

```
frontend/src/
├── app/product/secondaryoffers/
│   ├── page.tsx                  ✅ List page (complete)
│   ├── create/
│   │   └── page.tsx              ✅ Create wizard (complete)
│   ├── edit/[id]/
│   │   └── page.tsx              ❌ Edit wizard (pending)
│   └── view/[id]/
│       └── page.tsx              ❌ View page (pending)
│
├── components/secondaryOffers/
│   ├── wizard/
│   │   ├── Step1BasicInfo.tsx   ✅ Complete
│   │   ├── Step2Territories.tsx ✅ Complete
│   │   ├── Step3DistributorRoutes.tsx ⚠️ Placeholder
│   │   ├── Step4OutletTargeting.tsx   ⚠️ Placeholder
│   │   └── Step5OfferConfig.tsx       ⚠️ Placeholder
│   │
│   └── shared/
│       ├── OutletPreview.tsx     ❌ Pending
│       ├── DistributorSelector.tsx ❌ Pending
│       ├── RouteSelector.tsx     ❌ Pending
│       └── OutletFilters.tsx     ❌ Pending
│
├── types/
│   └── secondaryOffer.ts         ✅ Complete
│
└── lib/api/
    └── secondaryOffers.ts        ✅ Complete
```

## Implementation Roadmap

### Phase 1: Core Functionality (Complete - 70%)

- [x] Backend model with outlet resolution
- [x] All API endpoints
- [x] Frontend types and API client
- [x] List page with mobile-first design
- [x] Create wizard structure
- [x] Step 1: Basic Info
- [x] Step 2: Territories

### Phase 2: Targeting Wizards (In Progress - 20%)

- [ ] Step 3: Distributor & Routes
  - Distributor multi-select with auto-filtering
  - Route multi-select based on distributors
  - Include/Exclude modes
  - "Apply to all" checkboxes
- [ ] Step 4: Outlet Targeting
  - Selection mode radio (all/specific/filtered)
  - Outlet multi-select
  - Outlet filters (type, channel, market size)
  - Preview button with outlet count
  - Sample outlet list
- [ ] Step 5: Offer Configuration
  - Reuse from primary offers
  - Conditional rendering per offer type
  - Product selection
  - Discount/BOGO/Bundle configs

### Phase 3: Complete CRUD (Pending - 10%)

- [ ] Edit page
  - Load existing offer
  - Pre-populate wizard
  - Update API call
- [ ] View page
  - Read-only display
  - Show all selections
  - Display stats
  - Outlet list

### Phase 4: Enhanced UX (Future)

- [ ] Outlet preview dialog
- [ ] Export to Excel
- [ ] Bulk operations
- [ ] Offer templates
- [ ] Advanced analytics

## Mobile-First Design Principles

### Breakpoints

```jsx
xs: 0px     // Mobile
sm: 600px   // Tablet
md: 900px   // Desktop
lg: 1200px  // Large Desktop
xl: 1536px  // Extra Large
```

### Layout Patterns

```jsx
// Stack on mobile, row on desktop
<Stack direction={{ xs: "column", sm: "row" }}>

// Full width on mobile, auto on desktop
sx={{ minWidth: { xs: "100%", sm: "auto" } }}

// Responsive Grid
<Grid container spacing={2}>
  <Grid item xs={12} sm={6} md={4}>
    ...
  </Grid>
</Grid>

// Responsive Typography
<Typography sx={{ fontSize: { xs: "1rem", sm: "1.25rem" } }}>
```

### DO NOT USE

- ❌ Grid2 component (not available in this project)
- ❌ Fixed pixel widths
- ❌ Desktop-first approach
- ❌ Horizontal scrolling

### ALWAYS USE

- ✅ Legacy Grid with container/item/xs/sm/md
- ✅ Stack with direction={{ xs, sm, md }}
- ✅ sx={{ prop: { xs, sm, md } }}
- ✅ Mobile-first breakpoints

## Permission Matrix

| Role        | Create | Read | Update | Delete | Notes                    |
| ----------- | ------ | ---- | ------ | ------ | ------------------------ |
| SuperAdmin  | ✅     | ✅   | ✅     | ✅     | Full access              |
| Sales Admin | ✅     | ✅   | ✅     | ✅     | Manages offers           |
| MIS         | ✅     | ✅   | ✅     | ✅     | Reporting & analysis     |
| ZSM         | ❌     | ✅   | ❌     | ❌     | View only (zone level)   |
| RSM         | ❌     | ✅   | ❌     | ❌     | View only (region level) |
| ASM         | ❌     | ✅   | ❌     | ❌     | View only (area level)   |
| SO          | ❌     | ✅   | ❌     | ❌     | View only (field)        |
| Distributor | ❌     | ✅   | ❌     | ❌     | View own offers          |
| DSR         | ❌     | ✅   | ❌     | ❌     | View for routes          |

## Key Differences: Primary vs Secondary Offers

| Feature               | Primary Offers                           | Secondary Offers                               |
| --------------------- | ---------------------------------------- | ---------------------------------------------- |
| **Stock Application** | Applies to distributor stock             | Applies to distributor stock (same as primary) |
| **Use Case**          | Broad channel offers                     | Targeted outlet promotions                     |
| **Example**           | "All distributors in Zone 1 get 10% off" | "These 50 specific outlets get BOGO"           |
| **SO Sales**          | Checks depot/distributor stock           | Checks depot/distributor stock (same logic)    |

## Stock Application Flow

### When SO Sells to Outlet (Both Primary & Secondary)

```
1. SO selects products to sell to outlet from distributor stock
2. System checks:
   ├── Is outlet eligible for any active offers?
   │   ├── Primary Offers: Check if outlet's distributor has the offer
   │   └── Secondary Offers: Check if outlet is in resolvedOutlets[]
   ├── Does distributor have stock available?
   │   └── Query DistributorStock collection for distributor_id + sku
   └── Is appliesToDistributorStock = true?
3. If all checks pass:
   ├── Apply offer discount/BOGO/bundle pricing
   ├── Reduce distributor stock (FIFO method)
   └── Create outlet order with offer applied
```

| **Targeting** | Territories + Distributors | Territories + Distributors + Routes + Outlets |
| **Wizard Steps** | 3 steps | 5 steps |
| **Resolution** | Distributor IDs | Outlet IDs (cached) |
| **Use Case** | Broad channel offers | Targeted outlet promotions |
| **Example** | "All distributors in Zone 1 get 10% off" | "These 50 specific outlets get BOGO" |

## Performance Considerations

### Outlet Resolution Caching

- Outlets resolved during save (pre-save hook)
- Cached in `resolvedOutlets` array
- Prevents expensive queries on every eligibility check
- Recalculated when offer updated

### Database Indexes

```javascript
// SecondaryOffer indexes
{ offer_type: 1, status: 1, active: 1 }
{ start_date: 1, end_date: 1 }
{ resolvedOutlets: 1 }
{ createdAt: -1 }
```

### API Optimization

- No pagination limits (client has 1M+ outlets)
- Populate only necessary fields
- Limit preview outlets to 100
- Async outlet resolution

## Testing Strategy

### Unit Tests

- Outlet resolution algorithm
- Include/Exclude logic
- Territory cascading
- Validation rules

### Integration Tests

- End-to-end offer creation
- Outlet eligibility checks
- Permission enforcement
- API endpoint responses

### Manual Testing

- All 15 offer types
- All selection modes
- Mobile responsiveness
- Role-based access

---

**Status**: 70% Complete
**Next Priority**: Complete Steps 3, 4, 5 of wizard
**Estimated Completion**: 10-15 hours
