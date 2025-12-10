# Requisition Scheduling Module - Implementation Complete

## Overview

A comprehensive module for Distribution role to schedule requisitions by selecting source depots and delivery quantities, with real-time stock validation and mobile-first UI.

## Implementation Summary

### ✅ Backend Implementation

#### 1. Database Models

**RequisitionScheduling Model** (`backend/src/models/RequisitionScheduling.js`)

- Tracks scheduling transactions
- Fields:
  - `requisition_id`: Reference to InventoryRequisition
  - `requisition_no`: Indexed requisition number
  - `scheduling_details[]`: Array of scheduled items
    - `requisition_detail_id`: Item reference
    - `sku`, `erp_id`, `product_id`: Product identification
    - `order_qty`, `delivery_qty`: Quantities
    - `source_depot_id`, `target_depot_id`: Depot routing
    - `scheduled_at`, `scheduled_by`, `scheduled_by_name`: Audit trail
  - `status`: enum [pending, in-progress, completed]
- Indexes: requisition_id+status, source_depot_id, target_depot_id, created_at

**InventoryRequisition Model Updates** (`backend/src/models/InventoryRequisition.js`)

- Enhanced with scheduling tracking:
  - Detail items: `scheduled_qty`, `unscheduled_qty`
  - Main requisition: `scheduling_status`, `scheduled_by`, `scheduled_at`
- Pre-save hook: Automatically initializes `unscheduled_qty = qty` for new requisitions

#### 2. API Routes (`backend/src/routes/inventory/requisition-schedulings.js`)

**GET /** - List pending requisitions

- Filters: status=submitted, scheduling_status in [not-scheduled, partially-scheduled]
- Groups by source depot (products.depot_ids[0] or facility_ids[0])
- For each product, queries InventoryBalance to get stock quantities for all source depots
- Returns: Array of depot groups with requisitions and stock info

**POST /schedule** - Submit scheduling

- Validates delivery quantities against unscheduled_qty
- Checks stock availability from InventoryBalance
- Uses MongoDB transaction for atomicity
- Updates:
  - InventoryRequisition: scheduled_qty, unscheduled_qty, scheduling_status
  - Creates/updates RequisitionScheduling document
- Returns: Success message with scheduling records

**GET /depots** - Depot dropdown

- Returns: All active Facility documents where type='Depot'

**GET /scheduled-list** - History view

- Filters: date range, source depot, target depot, status
- Populates requisition, depot, and user references
- Returns: Scheduling transactions with full details

#### 3. Route Registration

- Registered in `backend/src/routes/index.js`
- Path: `/api/inventory/requisition-schedulings`

### ✅ Frontend Implementation

#### 1. Schedule Requisitions Page (`frontend/src/app/inventory/schedule-requisitions/page.tsx`)

**Design Pattern:**

- Mobile-first with Material-UI Grid2
- Accordion grouping by source depot
- Card-based requisition display

**Features:**

- Pre-filled delivery quantities (unscheduled_qty)
- Pre-selected source depot (first depot_ids)
- Stock quantity chips for all available depots
- Depot dropdown with stock quantities
- Client-side validation:
  - delivery_qty <= unscheduled_qty
  - delivery_qty <= available stock
  - delivery_qty > 0
- Real-time validation feedback
- Loading states with CircularProgress
- Success/error Snackbar notifications

**UI Components:**

- Accordion per depot group
- Cards for each requisition
- Chips showing: Order Qty, Scheduled Qty, Unscheduled Qty, Stock Quantities
- TextField for delivery quantity (numeric keyboard)
- Select dropdown for source depot
- Schedule button per group

#### 2. Scheduled List Page (`frontend/src/app/inventory/requisition-scheduled-list/page.tsx`)

**Design Pattern:**

- Mobile-responsive card list
- Collapsible filters
- Expandable item details

**Features:**

- Filters: Date range, Source depot, Target depot, Status
- Apply/Reset filter buttons
- Refresh button
- Accordion for item details
- Status chips with color coding
- Formatted date/time display
- Populated user, depot, and product info

**UI Components:**

- Filter card (collapsible)
- Result cards with accordion details
- Grid2 responsive layout
- Chip for status display
- Typography for data display

### ✅ Permissions & Menu Setup

**Setup Script** (`backend/setup-requisition-scheduling.js`)

- Creates API permissions:
  - `requisition-scheduling:read`
  - `requisition-scheduling:write`
  - `requisition-scheduling:view-history`
- Creates menu items:
  - "Schedule Requisitions" (order 410) → `/inventory/schedule-requisitions`
  - "Requisition Scheduled List" (order 411) → `/inventory/requisition-scheduled-list`
- Assigns to Distribution role only
- Result: ✅ Successfully executed

## Key Features

### 1. Multi-Depot Product Support

- Products can have multiple source depots (depot_ids[])
- UI displays stock quantities for all depots
- User can select which depot to fulfill from

### 2. Partial Scheduling

- Track scheduled vs unscheduled quantities per item
- Support scheduling in multiple batches
- Overall status: not-scheduled → partially-scheduled → fully-scheduled

### 3. Stock Validation

- Server-side: Queries InventoryBalance before saving
- Client-side: Shows warnings if delivery_qty > stock
- Real-time stock display for informed decisions

### 4. Mobile-First Design

- Responsive Grid2 breakpoints (xs, sm, md)
- Touch-friendly dropdowns and inputs
- Numeric keyboard for quantity inputs
- Card-based layout for mobile
- Accordion for content organization

### 5. Audit Trail

- scheduled_by, scheduled_at on requisitions
- scheduled_by, scheduled_by_name in scheduling_details
- Complete transaction history
- Filter and search capabilities

## Testing Requirements

### 1. Multi-Depot Products (Todo #15)

- Create products with multiple depot_ids
- Verify dropdown shows all depots
- Verify stock quantities displayed correctly
- Test scheduling from different source depots

### 2. End-to-End Workflow (Todo #16)

1. Distribution user logs in
2. Navigates to Schedule Requisitions
3. Sees pending requisitions grouped by depot
4. Selects delivery quantities and source depot
5. Submits scheduling
6. Sees success message
7. Views Requisition Scheduled List
8. Verifies requisition status updated

### 3. Edge Cases

- Insufficient stock scenarios
- Partial scheduling over multiple sessions
- Products with no depot assignment
- Empty requisition list

## Architecture Decisions

1. **Separate Scheduling Collection**: Maintains clear transaction history separate from requisitions
2. **Denormalized Stock Display**: Queries InventoryBalance in real-time for accuracy
3. **MongoDB Transactions**: Ensures data consistency when updating multiple documents
4. **Pre-save Hook**: Automatic initialization of unscheduled quantities
5. **Role-Based Access**: Distribution role only, enforced at API and UI levels

## Database Collections

- `inventory_manufactured_requisitions`: Main requisition documents
- `requisition_schedulings`: Scheduling transaction records
- `inventory_balances`: Stock quantities by facility+product
- `facilities`: Depot information
- `products`: Product with depot_ids array
- `api_permissions`: New permissions for module
- `roles_api_permissions`: Permission assignments
- `sidebar_menu_items`: New menu items
- `roles_sidebar_menu_items`: Menu assignments

## API Endpoints

```
GET    /api/inventory/requisition-schedulings              - List pending requisitions
POST   /api/inventory/requisition-schedulings/schedule     - Submit scheduling
GET    /api/inventory/requisition-schedulings/depots       - Get depot dropdown
GET    /api/inventory/requisition-schedulings/scheduled-list - History view
```

## File Structure

```
backend/
├── src/
│   ├── models/
│   │   ├── RequisitionScheduling.js (NEW)
│   │   └── InventoryRequisition.js (UPDATED)
│   └── routes/
│       └── inventory/
│           └── requisition-schedulings.js (NEW)
└── setup-requisition-scheduling.js (NEW)

frontend/
└── src/
    └── app/
        └── inventory/
            ├── schedule-requisitions/
            │   └── page.tsx (NEW)
            └── requisition-scheduled-list/
                └── page.tsx (NEW)
```

## Deployment Checklist

- [x] Backend models created
- [x] Backend API routes created and registered
- [x] Frontend pages created
- [x] Permissions created and assigned
- [x] Menu items created and assigned
- [ ] Test data created
- [ ] End-to-end testing performed
- [ ] User acceptance testing
- [ ] Production deployment

## Notes

- **Users must log out and log in** to see new menu items and permissions
- Module follows existing design patterns from DO Scheduling
- Consistent with mobile-first approach used throughout the app
- Stock validation prevents over-scheduling
- Transaction-based updates ensure data integrity

## Next Steps

1. Create test products with multiple depot_ids
2. Create sample requisitions for testing
3. Perform end-to-end workflow testing
4. Verify stock validation works correctly
5. Test mobile responsiveness on devices
6. User acceptance testing with Distribution role
7. Production deployment

---

**Implementation Date**: 2025-01-20
**Implemented By**: AI Assistant
**Status**: ✅ Complete (pending testing)
**Estimated Dev Time**: ~4 hours
**Actual Dev Time**: ~2 hours
