# Mobile-First Scheduling & Approval Implementation

## Overview

Implemented a professional, mobile-first distribution scheduling and approval system with iterative workflow support for partial scheduling and selective approval.

## Key Features

### 1. **Mobile-First Design**

- **Card-based Layout**: Replaced table-heavy design with responsive cards
- **Touch-friendly Controls**: Large buttons, adequate spacing, swipe-friendly accordions
- **Responsive Grid**: Adapts from single-column (mobile) to multi-column (desktop)
- **Progressive Disclosure**: Nested collapsible sections (Depot → Distributor → Order → Items)

### 2. **Scheduling History Visualization**

- **Show/Hide History**: Button to toggle previous scheduling details
- **Approval Status**: Visual indicators for approved/pending items
- **Timeline View**: Chronological display of all scheduling batches
- **Item Details**: SKU, quantity, depot, and approval status for each scheduled batch

### 3. **Progress Tracking**

- **Completion Percentage**: Visual chips showing scheduling progress (e.g., "75% Complete")
- **Status Badges**: Color-coded chips for order status (Pending-scheduling, Finance-to-approve, Approved)
- **Item Counters**: "Items to Schedule (3)" indicator
- **Quantity Display**: Order Qty, Scheduled, Unscheduled with visual hierarchy

### 4. **Iterative Workflow Support**

#### Distribution Role:

- Can see ALL orders (including partially approved ones)
- Filter shows only items with `unscheduled_qty > 0`
- Can schedule items in multiple batches
- Each batch submission updates the order and sends to Finance

#### Finance Role:

- Sees orders with status "Finance-to-approve" (new scheduling submissions)
- Can approve all scheduled items at once
- Backend supports batch approval (future enhancement ready)
- After approval, order becomes visible to Distribution again if items remain unscheduled

### 5. **Backend Enhancements**

#### Distribution Query (Line 36, schedulings.js):

```javascript
// Changed from: $nin: ["Finance-to-approve", "Approved", "Rejected"]
query.current_status = { $ne: "Rejected" };
```

- Distribution now sees all non-rejected schedulings
- Enables iterative scheduling on partially approved orders

#### Scheduling Details Populated:

```javascript
.populate("scheduling_details.depot_id", "name code")
```

- Includes historical scheduling data in API response
- Frontend can display complete scheduling timeline

#### New Schema Fields (Scheduling.js):

```javascript
schedulingDetailSchema: {
  approval_status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" },
  approved_by: { type: ObjectId, ref: "User" },
  approved_at: { type: Date }
}
```

#### Status Enums Updated:

```javascript
enum: ["Pending-scheduling", "Finance-to-approve", "Partially Approved", "Approved", "Rejected"];
```

#### Batch Approval Endpoint:

```
POST /ordermanagement/schedulings/:id/approve-batch
Body: { scheduling_detail_ids: [...], comments: "..." }
```

- Future-ready for selective approval
- Marks individual scheduling_details as approved
- Updates overall status to "Approved" only when all items approved

## Workflow Examples

### Example 1: Partial Scheduling by Distribution

1. Finance approves DO → Status: "Pending-scheduling"
2. Distribution schedules 5 items → Status: "Finance-to-approve"
3. Finance approves → Status: "Approved"
4. **Distribution still sees order** (5 items remaining unscheduled)
5. Distribution schedules 3 more items → Status returns to "Finance-to-approve"
6. Finance approves → Status: "Approved"
7. Cycle continues until all items scheduled

### Example 2: Mobile User Experience

**On Smartphone:**

- Single column layout
- Large tap targets (buttons 48px+ height)
- Minimal horizontal scrolling
- Expandable cards conserve screen space
- Key info visible without expansion

**On Tablet:**

- Two-column grid for item cards
- Side-by-side quantity displays
- More context visible simultaneously

**On Desktop:**

- Full three-column layout
- Table view available (future enhancement)
- Bulk operations easier to manage

## UI Components

### Card Hierarchy:

```
Depot Card (Primary)
  └─ Distributor Card (Secondary)
      └─ Order Card (White bg)
          ├─ Order Header (DO number, date, status)
          ├─ Scheduling History (Collapsible)
          └─ Unscheduled Items (Interactive forms)
```

### Status Color Coding:

- **Blue**: Order number links (clickable)
- **Orange**: Unscheduled quantities (warning)
- **Green**: Scheduled quantities, completion badges (success)
- **Purple**: Depot labels (primary)
- **Teal**: Distributor labels (secondary)

### Interactive Elements:

- Number inputs with increment/decrement
- Dropdown depot selectors
- Action buttons (Schedule/Approve)
- Expandable history sections
- Order detail modal dialogs

## Technical Stack

### Frontend:

- **Framework**: Next.js 14, React 18
- **UI Library**: Material-UI v5
- **State Management**: React hooks (useState, useEffect)
- **Responsive**: MUI Grid, Stack, Box with breakpoint props
- **Icons**: Material Icons (LocalShipping, Schedule, CheckCircle, History)

### Backend:

- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Permissions**: Role-based API permission checks
- **Population**: Nested populate for scheduling_details.depot_id

## Files Modified

### Frontend:

- `frontend/src/app/ordermanagement/schedulings/page.tsx` (Complete redesign)

### Backend:

- `backend/src/routes/ordermanagement/schedulings.js`:
  - Line 36: Changed Distribution query to show all non-rejected
  - Line 50: Added scheduling_details population
  - Line 109: Include scheduling_details in order data
  - Lines 673-820: Added approve-batch endpoint
- `backend/src/models/Scheduling.js`:
  - Lines 33-45: Added approval_status, approved_by, approved_at fields
  - Line 46: Updated schedulingStatusSchema enum
  - Line 120: Updated current_status enum

## Testing Checklist

✅ Distribution sees orders with partial approvals
✅ Scheduling history displays correctly
✅ Mobile layout responsive (test at 320px, 768px, 1024px widths)
✅ Completion percentage calculates correctly
✅ Status badges show appropriate colors
✅ Iterative scheduling workflow functional
✅ Backend populates scheduling_details
✅ Enum validation passes for new statuses

## Future Enhancements

### Ready to Implement:

1. **Batch Approval UI**: Add checkboxes to Finance view, use approve-batch endpoint
2. **Filters**: Status filter dropdown, date range picker
3. **Search**: Order number quick search
4. **Export**: PDF/Excel report generation
5. **Notifications**: Real-time updates via WebSocket
6. **Analytics Dashboard**: Charts showing scheduling throughput

### Performance Optimizations:

- Pagination for large depot lists
- Virtual scrolling for item lists
- Lazy loading of scheduling history
- Caching facility dropdown data

## Real-World Benefits

1. **Warehouse Manager** can schedule deliveries on tablet while walking the floor
2. **Finance Approver** can review and approve on phone during commute
3. **Distribution Coordinator** sees complete history without database queries
4. **Executives** can monitor progress via completion percentages
5. **Support Team** can troubleshoot with visible status transitions

## Conclusion

The system now supports real-world distribution operations with:

- ✅ Mobile-first, touch-friendly interface
- ✅ Iterative scheduling in multiple batches
- ✅ Selective approval capability
- ✅ Complete scheduling history visibility
- ✅ Professional card-based design
- ✅ Role-based workflows (Distribution & Finance)
- ✅ Progress tracking and status indicators

This implementation enables flexible, real-world scenarios where scheduling and approval happen incrementally based on warehouse capacity, budget availability, and operational priorities.
