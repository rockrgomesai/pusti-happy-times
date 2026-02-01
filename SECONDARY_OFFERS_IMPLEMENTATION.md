# Secondary Offers Module - Implementation Complete

## Overview

Full implementation of Secondary Offers module with mobile-first design and role-based permissions.

## Files Created

### Backend

1. **Model**: `backend/src/models/SecondaryOffer.js`
   - Complete schema with territory, distributor, route, and outlet targeting
   - Pre-save hooks for outlet resolution
   - Static methods for outlet resolution and eligibility checks
   - 15 offer types support (same as primary offers)

2. **Routes**: `backend/src/routes/product/secondaryOffers.js`
   - Full CRUD operations
   - Outlet resolution endpoint
   - Eligible routes endpoint
   - Outlet types/channels endpoints for filtering
   - Validation for all inputs

3. **Routes Registration**: `backend/src/routes/index.js`
   - Added secondary offers routes at `/product/secondaryoffers`

4. **Permissions Script**: `backend/scripts/create-secondary-offers-permissions.js`
   - Creates API permissions for all endpoints
   - Assigns permissions to roles:
     - **Full Access (CRUD)**: SuperAdmin, Sales Admin, MIS
     - **View Only**: ZSM, RSM, ASM, SO, Distributor, DSR

### Frontend

1. **Types**: `frontend/src/types/secondaryOffer.ts`
   - Complete type definitions
   - Form data interfaces
   - API response types
   - Helper constants (OFFER_TYPE_LABELS, STATUS_COLORS)

2. **API Client**: `frontend/src/lib/api/secondaryOffers.ts`
   - Full API integration
   - Outlet resolution
   - Eligible routes fetching
   - CRUD operations
   - Status toggling

3. **List Page**: `frontend/src/app/product/secondaryoffers/page.tsx`
   - Mobile-first responsive design
   - Filter by status, active, search
   - Card-based layout for mobile, table for desktop
   - Inline actions (view, edit, toggle, delete)

## Next Steps

### Create/Edit Wizard Pages

The wizard should follow this structure (5 steps):

#### Step 1: Basic Information (reuse from primary offers)

- Name, offer type, product segments
- Start/end dates, status, active toggle
- Description

#### Step 2: Territory Targeting (reuse from primary offers)

- Zones, Regions, Areas, DB Points selection
- Include/Exclude mode for each level

#### Step 3: Distributor & Route Targeting (NEW)

```typescript
// Component: Step3DistributorRoutes.tsx
- Distributor multi-select (auto-filtered by selected territories)
- Include/Exclude mode
- "Apply to all routes" checkbox
- Route multi-select (filtered by selected distributors)
- Include/Exclude mode for routes
- "Apply to all outlets" checkbox
```

#### Step 4: Outlet Targeting (NEW)

```typescript
// Component: Step4OutletTargeting.tsx
- Selection Mode radio buttons:
  1. "All Outlets" - includes all outlets from territories/distributors/routes
  2. "Specific Outlets" - manual multi-select with include/exclude
  3. "Filtered" - filter by outlet type, channel, market size

- Preview button to show resolved outlets count
- Sample outlets list (first 100)
```

#### Step 5: Offer Configuration (reuse from primary offers)

- Same as primary offers based on offer_type
- Product selection
- Discount configuration (slabs, percentages, amounts)
- BOGO configuration
- Etc.

### Component Files to Create

1. **Wizard Container**:
   - `frontend/src/app/product/secondaryoffers/create/page.tsx`
   - `frontend/src/app/product/secondaryoffers/edit/[id]/page.tsx`

2. **Wizard Steps** (in `frontend/src/components/secondaryOffers/`):
   - `Step1BasicInfo.tsx` - reuse from primary offers
   - `Step2Territories.tsx` - reuse from primary offers
   - `Step3DistributorRoutes.tsx` - NEW
   - `Step4OutletTargeting.tsx` - NEW
   - `Step5OfferConfig.tsx` - reuse from primary offers (conditionally render based on offer_type)

3. **Shared Components**:
   - `OutletPreview.tsx` - shows resolved outlets count and sample list
   - `TerritorySelector.tsx` - reusable multi-level territory selector
   - `DistributorSelector.tsx` - multi-select with auto-filtering
   - `RouteSelector.tsx` - multi-select with auto-filtering
   - `OutletFilters.tsx` - outlet type, channel, market size filters

### View Page

Create `frontend/src/app/product/secondaryoffers/view/[id]/page.tsx`:

- Display offer details in read-only mode
- Show resolved outlets count
- Display all selections (territories, distributors, routes, outlets)
- Show offer configuration
- Stats display (orders, revenue, discounts)

## Database Setup

Run the permissions script:

```bash
cd backend
node scripts/create-secondary-offers-permissions.js
```

This will:

1. Create 10 API permissions for secondary offers
2. Assign full access to SuperAdmin, Sales Admin, MIS
3. Assign view-only to ZSM, RSM, ASM, SO, Distributor, DSR

## Key Features

### Outlet Resolution Algorithm

The `resolveTargetedOutlets` method cascades through:

1. **Territories** → collects DB Points
2. **Distributors** → filters by selected distributors (include/exclude)
3. **Routes** → filters by selected routes (include/exclude)
4. **Outlets** → applies final selection:
   - **All**: includes all from above
   - **Specific**: manual include/exclude list
   - **Filtered**: filters by outlet type, channel, market size

Result is cached in `resolvedOutlets` array for performance.

### Mobile-First Design

- Stack layout on mobile (xs)
- Grid layout on desktop (md+)
- Responsive typography
- Touch-friendly buttons and cards
- Collapsible filters

### Permissions

- Role-based access control
- View-only roles can see offers but cannot create/edit/delete
- Full-access roles have complete CRUD

## Reusable from Primary Offers

Many components can be reused from `frontend/src/components/offers/wizard/`:

- Step1BasicInfo.tsx
- Step2Territories.tsx
- Step3OfferConfig.tsx (all offer type configurations)
- TerritorySelector component
- OfferConfigForms (BOGO, Bundle, Discount, etc.)

## Testing Checklist

- [ ] Create secondary offer with all outlets
- [ ] Create secondary offer with specific distributors
- [ ] Create secondary offer with specific routes
- [ ] Create secondary offer with specific outlets (include mode)
- [ ] Create secondary offer with outlet filters (type, channel)
- [ ] Edit existing secondary offer
- [ ] Toggle active status
- [ ] Delete secondary offer
- [ ] View secondary offer details
- [ ] Filter offers by status
- [ ] Search offers by name
- [ ] Test mobile responsive layout
- [ ] Verify permissions for each role
- [ ] Verify outlet resolution accuracy

## API Endpoints

| Method | Endpoint                                   | Permission                | Description     |
| ------ | ------------------------------------------ | ------------------------- | --------------- |
| POST   | `/product/secondaryoffers`                 | `secondary-offers:create` | Create offer    |
| GET    | `/product/secondaryoffers`                 | `secondary-offers:read`   | List offers     |
| GET    | `/product/secondaryoffers/:id`             | `secondary-offers:read`   | Get offer       |
| PUT    | `/product/secondaryoffers/:id`             | `secondary-offers:update` | Update offer    |
| DELETE | `/product/secondaryoffers/:id`             | `secondary-offers:delete` | Delete offer    |
| PATCH  | `/product/secondaryoffers/:id/status`      | `secondary-offers:update` | Toggle status   |
| POST   | `/product/secondaryoffers/outlets/resolve` | `secondary-offers:read`   | Resolve outlets |
| POST   | `/product/secondaryoffers/routes/eligible` | `secondary-offers:read`   | Get routes      |
| GET    | `/product/secondaryoffers/outlet-types`    | `secondary-offers:read`   | Get types       |
| GET    | `/product/secondaryoffers/outlet-channels` | `secondary-offers:read`   | Get channels    |
