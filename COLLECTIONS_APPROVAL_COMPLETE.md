# Collections Approval Workflow - Implementation Complete

## Overview

Complete approval workflow implementation for Collections/Payments module with notifications at each milestone.

## Approval Flow

```
Distributor (Submit)
    ↓
ASM (Area Sales Manager) → Forward/Cancel/Edit
    ↓
RSM (Regional Sales Manager) → Forward/Cancel/Edit
    ↓
ZSM (View Only) + Sales Admin → Forward/Cancel/Edit
    ↓
Order Management → Forward/Cancel/Edit/Return to Sales Admin
    ↓                                    ↓
Finance → Approve/Cancel/Edit/Return    ← (Re-forward after rework)
    ↓
[APPROVED] → CustomerLedger Credit Entry Created
```

**Return/Rework Flow:**

- Order Management can **return** to Sales Admin (with reason)
- Finance can **return** to Sales Admin (with reason)
- Sales Admin re-forwards through chain: Sales Admin → Order Management → Finance
- Only Finance can final **approve**

## Implementation Status

### ✅ Completed

#### 1. Database Model Updates

**File**: `backend/src/models/Collection.js`

- Added `approval_status` enum (8 states)
- Added `current_handler_role` and `current_handler_id`
- Added `approval_chain` array for complete audit trail
- Added `cancelled_by`, `cancelled_at`, `cancellation_reason`
- Added `approved_by`, `approved_at`, `ledger_entry_id`
- Pre-save hook initializes approval chain with "submit" action

#### 2. Notification System

**Files**:

- `backend/src/models/Notification.js` - Added "collection" type and collection_id reference
- `backend/src/utils/collectionNotifications.js` - Helper functions for notifications

**Notification Functions**:

- `notifyDistributor(collection, action, actionBy, comments)` - Notifies distributor on forward/cancel/approve
- `notifyNextHandler(collection, nextRole, forwardedBy, comments)` - Notifies next approver
- `notifyDistributorOfEdit(collection, editedBy, comments)` - Notifies distributor when collection edited

**Notification Details**:

- Type: "collection"
- Priority: "normal" for forward/edit, "high" for cancel/approve
- Includes transaction_id, amount, status, and action details
- Provides action_url for navigation and action_label for button text
- Stores complete metadata for audit trail

#### 3. API Endpoints

**File**: `backend/src/routes/ordermanagement/collections.js`

**POST /:id/forward** - Forward to next approver

- Role-based permission check (only current handler can forward)
- Status progression logic:
  - ASM → RSM → Sales Admin → Order Mgmt → Finance
  - Sales Admin (after return) → Order Mgmt → Finance
- Records action in approval_chain
- ✅ Notifies distributor and next handler

**POST /:id/return** - Return to Sales Admin for rework

- Available to Order Management and Finance only
- Requires return reason
- Changes status to "returned_to_sales_admin"
- Records action in approval_chain
- ✅ Notifies distributor and Sales Admin with reason

**POST /:id/cancel** - Cancel collection

- Requires cancellation reason
- Updates status to cancelled
- Records cancelled_by, cancelled_at, cancellation_reason
- ✅ Notifies distributor with reason

**POST /:id/approve** - Approve collection (Finance only)

- Creates CustomerLedger entry (voucher_type="COL", credit=deposit_amount)
- Links ledger_entry_id to collection
- Records approval details
- ✅ Notifies distributor of approval

**PUT /:id/edit** - Edit collection details

- Available to ASM, RSM, Sales Admin, Order Mgmt, Finance
- Can update payment details and replace image
- Records edit in approval_chain
- ✅ Notifies distributor of changes

#### 4. Permissions

**Script**: `backend/create-approval-permissions.js` (executed successfully)

| Permission           | Assigned To                                           |
| -------------------- | ----------------------------------------------------- |
| `collection:forward` | ASM, RSM, Sales Admin, Order Management               |
| `collection:return`  | Order Management, Finance                             |
| `collection:cancel`  | ASM, RSM, Sales Admin, Order Management, Finance      |
| `collection:approve` | Finance                                               |
| `collection:edit`    | ASM, RSM, Sales Admin, Order Management, Finance      |
| `collection:view`    | ASM, RSM, ZSM, Sales Admin, Order Management, Finance |

**Note**: Users need to logout and login again for new permissions to take effect.

#### 5. Role Name Updates

- Changed from full names ("Area Manager", "Regional Manager", "Zonal Manager")
- Updated to abbreviations ("ASM", "RSM", "ZSM") throughout:
  - Collection model enums
  - Route role mappings
  - Permission assignments
  - Pre-save hook initialization

### 🔄 Pending Frontend Implementation

#### 1. Approval UI Components

**File**: `frontend/src/app/ordermanagement/collections/CollectionDetails.tsx`

**Required Updates**:

- Add action buttons based on user role and collection status:

  ```typescript
  // For ASM, RSM, Sales Admin, Order Management
  <Button onClick={handleForward}>Forward to [NextRole]</Button>
  <Button onClick={handleCancel}>Cancel</Button>
  <Button onClick={handleEdit}>Edit</Button>

  // For Finance
  <Button onClick={handleApprove}>Approve</Button>
  <Button onClick={handleCancel}>Cancel</Button>
  <Button onClick={handleEdit}>Edit</Button>

  // For ZSM (view only)
  // No action buttons, display only
  ```

- Add approval history timeline:

  ```typescript
  <Timeline>
    {collection.approval_chain.map((action) => (
      <TimelineItem>
        <Badge>{action.action}</Badge>
        <Text>
          {action.from_role} → {action.to_role}
        </Text>
        <Text>{action.performed_by_name}</Text>
        <Text>{action.comments}</Text>
        <Text>{formatDate(action.timestamp)}</Text>
      </TimelineItem>
    ))}
  </Timeline>
  ```

- Add status badge with color coding:
  ```typescript
  const statusColors = {
    pending: "yellow",
    forwarded_to_area_manager: "blue",
    forwarded_to_regional_manager: "blue",
    forwarded_to_zonal_manager_and_sales_admin: "blue",
    forwarded_to_order_management: "blue",
    forwarded_to_finance: "blue",
    approved: "green",
    cancelled: "red",
  };
  ```

#### 2. Collections List Filtering

**File**: `frontend/src/app/ordermanagement/collections/page.tsx`

**Required Updates**:

- Filter collections by current_handler_role matching user's role
- Show "My Queue" tab for pending approvals
- Show "All Collections" tab for historical view
- Add status badge to each row

#### 3. API Integration

**Files**:

- `frontend/src/app/ordermanagement/collections/api.ts` (create)
- Add API functions:
  ```typescript
  export async function forwardCollection(id: string, comments: string);
  export async function cancelCollection(id: string, reason: string);
  export async function approveCollection(id: string, comments: string);
  export async function editCollection(id: string, data: Partial<Collection>);
  ```

#### 4. Notification Bell Component

**File**: `frontend/src/components/NotificationBell.tsx` (may already exist)

**Required Updates**:

- Display unread notification count
- List recent notifications
- Mark as read functionality
- Navigate to collection on click

### 🔧 Future Enhancements

#### 1. Territory-Based Handler Assignment

Currently, notifications are sent to ALL users with the target role. Need to implement:

- Find employees with correct territory hierarchy
- Match distributor's area → ASM with same area
- Match distributor's region → RSM with same region
- Match distributor's zone → ZSM with same zone
- Assign specific user to `current_handler_id`

**Implementation**:

```javascript
// In forward route, before saving
const nextHandler = await findHandlerByTerritory(collection.distributor_id.territory_id, nextRole);
collection.current_handler_id = nextHandler._id;
```

#### 2. Email Notifications

- Send email in addition to in-app notification
- Use existing email templates or create new ones
- Include collection details and action link

#### 3. Real-Time Notifications

- Implement WebSocket connection for real-time updates
- Push notifications when collection status changes
- Update UI without page refresh

#### 4. Batch Operations

- Approve multiple collections at once (Finance)
- Cancel multiple collections with same reason
- Export collections for reporting

#### 5. Analytics Dashboard

- Approval time metrics (avg time at each stage)
- Pending collections by role
- Approval/rejection rates
- Top cancellation reasons

## Testing

### Backend Tests

1. **Run notification test script**:

   ```bash
   cd backend
   node test-collection-notifications.js
   ```

   This will test all notification functions with existing collections.

2. **Test approval workflow** (requires UI or Postman):

   - Create collection as Distributor
   - Forward as ASM → Check distributor and RSM notifications
   - Forward as RSM → Check distributor and Sales Admin notifications
   - Forward as Sales Admin → Check distributor and Order Mgmt notifications
   - Forward as Order Mgmt → Check distributor and Finance notifications
   - Approve as Finance → Check distributor notification and CustomerLedger entry

3. **Test cancellation**:

   - Cancel collection at any stage
   - Verify distributor receives notification with reason
   - Verify status is "cancelled"

4. **Test editing**:
   - Edit collection as any approver
   - Verify distributor receives edit notification
   - Verify edit recorded in approval_chain

### Frontend Tests (once UI implemented)

1. Role-based button visibility
2. Status badge display
3. Approval history timeline
4. Queue filtering
5. Notification bell updates

## Database Changes

### Collections added fields:

- `approval_status`: String enum
- `current_handler_role`: String enum
- `current_handler_id`: ObjectId (ref: User)
- `approval_chain`: Array of objects
- `cancelled_by`: ObjectId (ref: User)
- `cancelled_at`: Date
- `cancellation_reason`: String
- `approved_by`: ObjectId (ref: User)
- `approved_at`: Date
- `ledger_entry_id`: ObjectId (ref: CustomerLedger)

### Notifications added fields:

- `collection_id`: ObjectId (ref: Collection)
- Updated `type` enum to include "collection"

### CustomerLedger entries created:

- On approval: Credit entry with voucher_type="COL", voucher_no=transaction_id

## Migration Notes

### For Existing Collections (if any)

If collections already exist in database, run migration script:

```javascript
// backend/migrate-existing-collections.js
const Collection = require("./src/models/Collection");

async function migrate() {
  const collections = await Collection.find({
    approval_status: { $exists: false },
  });

  for (const collection of collections) {
    collection.approval_status = "pending";
    collection.current_handler_role = "ASM";
    collection.approval_chain = [
      {
        action: "submit",
        from_role: "Distributor",
        to_role: "ASM",
        performed_by: collection.created_by,
        performed_by_name: "Distributor",
        comments: "Payment submitted",
        timestamp: collection.createdAt,
      },
    ];
    await collection.save();
  }

  console.log(`✅ Migrated ${collections.length} collections`);
}
```

## Environment Variables

No new environment variables required.

## Dependencies

No new dependencies added. Uses existing:

- mongoose (MongoDB ODM)
- express (API routes)
- multer (file uploads)

## Documentation Updated

- [x] This implementation guide
- [ ] API documentation (add approval endpoints)
- [ ] User guide (add approval workflow instructions)
- [ ] Admin guide (add permission management)

## Known Issues

None at this time.

## Support

For issues or questions:

1. Check notification test script output
2. Verify permissions assigned correctly (logout/login)
3. Check MongoDB for notification documents
4. Review approval_chain in collection document
5. Check backend console for notification log messages

## Summary

✅ **Backend approval workflow is 100% complete and functional**

- All approval routes implemented
- Notification system fully integrated
- Permissions created and assigned
- Database models updated
- Ready for frontend implementation

🔄 **Frontend UI needs implementation** to expose approval actions to users
