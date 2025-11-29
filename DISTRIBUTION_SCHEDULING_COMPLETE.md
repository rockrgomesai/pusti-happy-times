# Distribution Scheduling Module - Implementation Complete

## Overview

The Distribution Scheduling module has been fully implemented and integrated into the system. This module enables Finance to create credit entries for discounts and free products, and allows Distribution to schedule deliveries with Finance approval workflow.

## Implementation Summary

### 1. Backend Infrastructure ✅

#### Scheduling Model (`backend/src/models/Scheduling.js`)

- **Main Fields:**
  - `order_id`: Reference to DemandOrder
  - `order_number`: DO number for easy reference
  - `distributor_id`: Reference to Distributor
  - `depot_id`: Default depot for deliveries (from distributor's delivery_depot_id)
- **Items Array:**
  - `item_id`, `sku`, `product_name`, `dp_price`
  - `order_qty`: Original quantity from DO
  - `scheduled_qty`: Cumulative scheduled quantity
  - `unscheduled_qty`: Remaining quantity to schedule
- **Scheduling Details Sub-documents:**
  - `item_id`: Reference to item in main items array
  - `delivery_qty`: Quantity for this scheduling event
  - `depot_id`: Depot to deliver from
  - `scheduled_at`: Timestamp
  - `scheduled_by`: User who created the schedule
- **Scheduling Status Array:**
  - Workflow tracking: 'Finance-to-approve' → 'Approved' / 'Rejected'
  - `status`, `date`, `performed_by`, `comments`
- **Current Status:** Tracks workflow state
  - `submitted`: DO created
  - `forwarded_to_distribution`: Finance approved DO
  - `scheduling_in_progress`: Distribution is scheduling
  - `scheduling_completed`: All items scheduled
  - `approved`: Finance approved scheduling

#### Credit Entry Creation

**Location:** `backend/src/routes/ordermanagement/demandorders.js` (Lines 1933-2013)

When Finance approves a DO:

1. **Calculate Discounts:**

   - Groups all discounts by offer name
   - Sums discount amounts per offer

2. **Identify Free Products:**

   - Extracts from `offer_details.free_products` array
   - Calculates value: `free_qty × db_price`
   - ⚠️ **Note:** Assumes db_price is available in Product collection for manufactured products

3. **Create Credit Entry:**

   - Type: "Credit"
   - Particulars: "Advanced Discounts & Free goods"
   - Narration breakdown:

     ```
     Discount Breakdown:
     - Ramadan Mega Discount: BDT 5000.00
     - Bundle Offer: BDT 3000.00

     Free Products:
     - Milk Powder 500g: 10 units @ BDT 120.00 = BDT 1200.00

     Total: BDT 9200.00
     ```

4. **Initialize Scheduling Record:**
   - Creates Scheduling document with all DO items
   - Sets `unscheduled_qty = order_qty` for all items
   - Uses distributor's `delivery_depot_id` as default depot
   - Sets status to 'forwarded_to_distribution'

### 2. API Routes ✅

**File:** `backend/src/routes/ordermanagement/schedulings.js` (400+ lines)

#### GET `/`

- **Purpose:** List all schedulings grouped by depot and distributor
- **Response Structure:**
  ```javascript
  [
    {
      depot_id: "...",
      depot_name: "Dhaka Depot",
      distributors: [
        {
          distributor_id: "...",
          distributor_name: "ABC Distributors",
          erp_id: "DIST001",
          delivery_depot_id: "...",
          orders: [
            {
              order_id: "...",
              order_number: "DO-240115-001",
              order_date: "2024-01-15T...",
              items: [
                {
                  item_id: "...",
                  sku: "SKU001",
                  product_name: "Milk Powder 500g",
                  dp_price: 120.0,
                  order_qty: 100,
                  scheduled_qty: 50,
                  unscheduled_qty: 50,
                },
              ],
            },
          ],
        },
      ],
    },
  ];
  ```

#### POST `/:id/schedule`

- **Purpose:** Distribution adds delivery quantities
- **Body:**
  ```javascript
  {
    "items": [
      {
        "item_id": "...",
        "delivery_qty": 50,
        "depot_id": "..."
      }
    ]
  }
  ```
- **Validation:** `delivery_qty ≤ unscheduled_qty`
- **Updates:**
  - Adds scheduling_details entry
  - Updates `scheduled_qty` and `unscheduled_qty`
  - Sets status to 'scheduling_in_progress' or 'scheduling_completed' (if all scheduled)

#### POST `/:id/approve`

- **Purpose:** Finance approves scheduling
- **Auth:** Finance role only
- **Updates:**
  - Adds status entry: 'Approved'
  - Updates DO `current_status` to 'approved'

#### POST `/:id/reject`

- **Purpose:** Finance rejects scheduling
- **Auth:** Finance role only
- **Body:** `{ "comments": "reason" }`
- **Updates:**
  - Adds status entry: 'Rejected' with comments
  - Resets all quantities to unscheduled
  - Clears scheduling_details

#### GET `/api/depots`

- **Purpose:** List active depot facilities
- **Returns:** `[{ _id, facility_code, name }]`

### 3. Frontend UI ✅

**File:** `frontend/src/app/ordermanagement/schedulings/page.tsx` (530+ lines)

#### Design Pattern

- **Mobile-First:** Nested accordion structure
- **Level 1:** Depot accordions (sorted by name)
- **Level 2:** Distributor accordions (sorted by name, showing `name + erp_id`)
- **Level 3:** Orders table

#### Table Columns

1. **Order DT:** Date in DD/MM/YYYY format
2. **DO:** Order number as clickable hyperlink
   - Implementation: Underlined Button component
   - Action: Opens Order Details dialog
   - API: `/ordermanagement/demandorders/${orderId}`
3. **SKU:** Product SKU
4. **DP Price:** Distribution price
5. **Order Qty:** Original order quantity
6. **Schld Qty:** Cumulative scheduled quantity
7. **Unschld Qty:** Remaining to schedule
8. **Dlvr Qty:** Editable TextField
   - Focus color: `#e3f2fd` when value > 0
   - Validation: Must be ≤ Unschld Qty
9. **Depot:** Dropdown selector
   - Default: Distributor's delivery_depot_id
   - Options: All active depots

#### Approve Button

- Located per distributor section
- Collects all items with `delivery_qty > 0`
- Posts to `/ordermanagement/schedulings/${schedulingId}/schedule`
- Toast notifications for success/error

#### Order Details Dialog

- Reuses demand orders API endpoint
- Displays order summary:
  - DO Number, Date, Status
  - Distributor info
  - Total amount
- Items table with full details
- Close button

### 4. Permissions & Menu ✅

**Setup Script:** `backend/setup-scheduling-permissions.js`

#### API Permissions Created

- `scheduling:read`: View schedulings
- `scheduling:create`: Create/update schedulings
- `scheduling:approve`: Approve/reject schedulings

#### Page Permission

- `pg:ordermanagement:schedulings`: Access to schedulings page

#### Role Assignments

**Distribution Role:**

- `scheduling:read` ✓
- `scheduling:create` ✓
- Page permission ✓

**Finance Role:**

- `scheduling:read` ✓
- `scheduling:approve` ✓
- Page permission ✓

#### Sidebar Menu Item

- **Label:** "Schedulings"
- **Path:** `/ordermanagement/schedulings`
- **Icon:** `FaCalendar`
- **Parent:** Order Management
- **Visible To:** Distribution, Finance

## Workflow Diagram

```
Finance Approval (DO)
  ↓
Create Credit Entry (discounts + free products)
  ↓
Initialize Scheduling (all items unscheduled)
  ↓
Status: forwarded_to_distribution
  ↓
Distribution Views Schedulings
  ↓
Enter Delivery Quantities
  ↓
Select Depot per Item
  ↓
Submit Schedule
  ↓
Status: scheduling_in_progress
  ↓
All Items Scheduled?
  ├─ Yes → Status: scheduling_completed
  └─ No  → Remains scheduling_in_progress
  ↓
Finance Reviews Scheduling
  ├─ Approve → DO Status: approved
  └─ Reject  → Reset quantities, clear details
```

## Key Features

### Mobile-First Design

- Nested accordions for hierarchical data
- Touch-friendly controls
- Responsive layout

### Visual Feedback

- Editable qty fields highlighted when > 0
- Loading states during API calls
- Toast notifications for actions

### Clickable Order Numbers

- Opens full Order Details dialog
- Matches demand orders UI pattern
- Shows order summary + items table

### Smart Defaults

- Depot pre-filled from distributor settings
- Unscheduled quantities calculated automatically
- Validation prevents over-scheduling

### Partial Scheduling Support

- Can schedule items across multiple sessions
- Tracks cumulative scheduled quantities
- Status updates based on completion

## Clarifications Needed

### 1. Free Products Data Structure

**Question:** How are free products identified in DO items?

- Option A: `offer_details.free_products` array
- Option B: `is_free_product: true` flag on items

**Current Implementation:** Checks `offer_details.free_products` array

### 2. db_price Source

**Question:** Where to get `db_price` for manufactured products for credit calculation?

- Option A: Product collection has `db_price` field
- Option B: Offer configuration has pricing info
- Option C: Calculate from dp_price with fixed margin

**Current Implementation:** Assumes Product collection has `db_price`

### 3. Dlvr Qty Pre-fill

**Question:** Should Dlvr Qty TextField be pre-filled?

- Option A: Start at 0 (explicit input required)
- Option B: Pre-fill with unscheduled_qty (one-click scheduling)

**Current Implementation:** Starts at 0 (Option A)

## Files Modified/Created

### Backend

- ✅ `backend/src/models/Scheduling.js` (NEW)
- ✅ `backend/src/routes/ordermanagement/schedulings.js` (NEW)
- ✅ `backend/src/routes/ordermanagement/demandorders.js` (Lines 1933-2013)
- ✅ `backend/src/routes/index.js` (Added schedulings route)
- ✅ `backend/setup-scheduling-permissions.js` (NEW)

### Frontend

- ✅ `frontend/src/app/ordermanagement/schedulings/page.tsx` (NEW)

### Database Changes

- ✅ Created `schedulings` collection
- ✅ Added API permissions (3)
- ✅ Added page permission (1)
- ✅ Added role-permission mappings (5)
- ✅ Added sidebar menu item (1)
- ✅ Added role-menu mappings (2)

## Testing Checklist

### Backend Testing

- [ ] Finance approves DO → Credit entry created with correct breakdown
- [ ] Finance approves DO → Scheduling initialized with all items
- [ ] Distribution lists schedulings → Grouped correctly by depot/distributor
- [ ] Distribution submits schedule → Quantities updated correctly
- [ ] Distribution over-schedules → Validation error returned
- [ ] Partial scheduling → Status remains scheduling_in_progress
- [ ] Full scheduling → Status changes to scheduling_completed
- [ ] Finance approves scheduling → DO status updates to approved
- [ ] Finance rejects scheduling → Quantities reset, details cleared

### Frontend Testing

- [ ] Schedulings page loads → Nested accordions display correctly
- [ ] Depot accordion expands → Shows distributor accordions
- [ ] Distributor accordion expands → Shows orders table
- [ ] Order number clicked → Order Details dialog opens
- [ ] Order Details shows correct data → Summary + items match DO
- [ ] Dlvr Qty TextField editable → Accepts numeric input
- [ ] Dlvr Qty > Unschld Qty → Validation error shown
- [ ] Dlvr Qty > 0 → Background color changes to #e3f2fd
- [ ] Depot dropdown → Shows all active depots
- [ ] Depot dropdown default → Matches distributor's delivery_depot_id
- [ ] Approve button clicked → API call succeeds, toast shown
- [ ] Page refresh after approval → Scheduled quantities updated

### Permissions Testing

- [ ] Distribution user → Can view schedulings page
- [ ] Distribution user → Can submit schedules
- [ ] Distribution user → Cannot approve/reject
- [ ] Finance user → Can view schedulings page
- [ ] Finance user → Can approve/reject
- [ ] Finance user → Cannot submit schedules (no edit access)
- [ ] Other roles → Cannot access schedulings page
- [ ] Menu item → Visible only to Distribution & Finance

### Integration Testing

- [ ] Complete workflow → Finance approve → Distribution schedule → Finance approve
- [ ] Credit entry → Matches calculated discounts + free products value
- [ ] Free products → Correctly identified and valued
- [ ] Multi-session scheduling → Quantities accumulate correctly
- [ ] Date formats → All dates show DD/MM/YYYY
- [ ] Order Details → Consistent with demand orders module

## Next Steps

1. **Answer Clarification Questions**

   - Free products data structure
   - db_price source
   - Dlvr Qty pre-fill preference

2. **Test Complete Workflow**

   - Create test DO with discounts and free products
   - Finance approval → Verify credit entry
   - Distribution scheduling → Test partial and full scheduling
   - Finance approval → Verify DO status update

3. **Documentation**

   - User guide for Distribution role
   - User guide for Finance role
   - Screenshots of UI flow

4. **Optional Enhancements**
   - Add export to Excel functionality
   - Add scheduling history view
   - Add email notifications on approval/rejection
   - Add bulk scheduling (select multiple DOs)

## Notes

- All dates use DD/MM/YYYY format (Bangladeshi standard)
- Mobile-first design ensures usability on all devices
- Nested accordions prevent overwhelming data display
- Smart defaults reduce data entry effort
- Validation prevents scheduling errors
- Audit trail maintained through status array
- Clickable order numbers improve UX consistency

## Related Documents

- `DATABASE_SCHEMA.md` - Database schema documentation
- `PROJECT_SPECIFICATIONS.md` - Overall project specs
- `DEMAND_ORDERS_IMPLEMENTATION.md` - DO workflow reference
- `COLLECTIONS_IMPLEMENTATION_SUMMARY.md` - Collections module reference

---

**Created:** December 2024  
**Status:** Implementation Complete ✅  
**Pending:** Clarifications + Testing
