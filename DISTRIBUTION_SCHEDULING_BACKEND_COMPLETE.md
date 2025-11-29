# Distribution Scheduling Implementation - Backend Complete

## Summary

Implemented the Distribution Scheduling module as per requirements with Finance approval for discounts/free products credit entry.

## Changes Made

### 1. Database Model

**File**: `backend/src/models/Scheduling.js`

- **Main Collection**: `schedulings` - One document per DO
- **Structure**:
  ```javascript
  {
    order_id, order_number, distributor_id, depot_id,
    items: [{
      item_id, sku, product_name, dp_price,
      order_qty, scheduled_qty, unscheduled_qty
    }],
    scheduling_details: [{ // Sub-document for each scheduling session
      item_id, sku, delivery_qty, depot_id,
      scheduled_at, scheduled_by
    }],
    scheduling_status: [{
      status: 'Finance-to-approve' | 'Approved' | 'Rejected',
      date, performed_by, comments
    }],
    current_status: 'Finance-to-approve' | 'Approved' | 'Rejected'
  }
  ```

### 2. Finance Approval Enhancement

**File**: `backend/src/routes/ordermanagement/demandorders.js`
**Route**: `POST /:id/approve`

When Finance clicks "Approve DO":

#### A. Creates Credit Entry in CustomerLedger

- **Particulars**: Multi-line breakdown:
  - "Advanced Discounts & Free goods"
  - Discounts: [Offer1]: 600, [Offer2]: 200, ...
  - Free Product: SKU qty: X @ price
- **Credit Amount**: Sum of all discounts + Sum of (free product qty × db_price)
- **Voucher Type**: "Discounts & Free items"
- **Voucher No**: DO order_number

#### B. Initializes Scheduling Record

- Creates `schedulings` document with all DO items
- Sets `unscheduled_qty = order_qty`
- Uses distributor's `delivery_depot_id` as default depot
- Status: "Finance-to-approve"

#### C. Updates DO Status

- Changes status to `forwarded_to_distribution`
- Sets `current_approver_role` to "Distribution"
- Adds approval history entry

### 3. Scheduling API Routes

**File**: `backend/src/routes/ordermanagement/schedulings.js`

#### GET /ordermanagement/schedulings

- Returns schedulings grouped by depot → distributor → orders
- Filters by status (query param)
- Sorted: Depot → Distributor → Order Date (desc)

#### GET /ordermanagement/schedulings/:id

- Get specific scheduling with full details
- Populated references (distributor, depot, order, users)

#### POST /ordermanagement/schedulings/:id/schedule

- Distribution adds delivery quantities
- **Body**: `{ deliveries: [{ item_id, delivery_qty, depot_id }] }`
- **Validations**:
  - delivery_qty ≤ unscheduled_qty
  - All required fields present
- **Updates**:
  - Adds to `scheduling_details`
  - Updates `scheduled_qty`, `unscheduled_qty` per item
  - Sets status to "Finance-to-approve"
- **DO Status Updates**:
  - If all scheduled → `scheduling_completed`
  - If partial → `scheduling_in_progress` + history event

#### POST /ordermanagement/schedulings/:id/approve

- Finance approves scheduling (Finance role only)
- Adds status entry with "Approved"
- Updates DO to `approved` status if fully scheduled

#### POST /ordermanagement/schedulings/:id/reject

- Finance rejects scheduling (Finance role only)
- Requires rejection comments
- Marks scheduling_details as "Rejected"
- Keeps items for re-scheduling

#### GET /ordermanagement/schedulings/api/depots

- Lists all active depots for depot selection dropdown

### 4. Route Registration

**File**: `backend/src/routes/index.js`

- Added schedulings routes at `/api/ordermanagement/schedulings`

## DO Status Flow

```
submitted
  ↓ (Approvals: ASM → RSM → Sales Admin → Order Mgmt → Finance)
forwarded_to_distribution
  ↓ (Distribution starts scheduling)
scheduling_in_progress (if partial)
  ↓ (All items scheduled)
scheduling_completed
  ↓ (Finance approves scheduling)
approved
```

## Key Features Implemented

✅ Credit entry for discounts & free products when Finance approves
✅ Automatic scheduling initialization with DO items
✅ One scheduling document per DO
✅ Sub-document array for scheduling_details
✅ Multiple depot support per scheduling session
✅ Partial scheduling with history tracking
✅ Finance approval/rejection of schedulings
✅ Validation: delivery_qty ≤ unscheduled_qty
✅ Default depot from distributor's delivery_depot_id

## Next Steps

1. **Frontend UI**: Create mobile-first scheduling interface with:

   - Nested accordions (Depot → Distributor → Orders)
   - Editable Dlvr Qty and Depot dropdown
   - Approve button for Distribution to submit
   - Finance approval/rejection UI

2. **Permissions**: Add scheduling permissions to Distribution role:

   - scheduling:read
   - scheduling:create
   - scheduling:approve (Finance only)

3. **Menu Item**: Add "Schedulings" to sidebar for Distribution role

## Questions for Review

1. **Free Products Structure**: Currently looking for `offer_details.free_products` array. Please confirm if free products are stored this way or if they're separate items with `is_free_product` flag?

2. **db_price Source**: Where should db_price come from for manufactured free products? From product collection or offer config?

3. **Initial Dlvr Qty**: Should UI pre-fill with unscheduled_qty or leave at 0?

Please review and confirm before I proceed with frontend implementation.
