# Collections Approval Workflow - Quick Reference

## For Developers

### Backend Implementation Summary

#### 1. Approval Routes

```javascript
// Forward collection to next approver
POST /ordermanagement/collections/:id/forward
Body: { comments: "Optional forward comments" }
Permission: collection:forward
Response: Updated collection with new status

// Return collection to Sales Admin for rework (Order Mgmt or Finance)
POST /ordermanagement/collections/:id/return
Body: { reason: "Return reason (required)" }
Permission: collection:return
Response: Collection returned to Sales Admin

// Cancel collection
POST /ordermanagement/collections/:id/cancel
Body: { reason: "Cancellation reason (required)" }
Permission: collection:cancel
Response: Cancelled collection

// Approve collection (Finance only)
POST /ordermanagement/collections/:id/approve
Body: { comments: "Optional approval comments" }
Permission: collection:approve
Response: Approved collection + CustomerLedger entry

// Edit collection details
PUT /ordermanagement/collections/:id/edit
Body: { payment_method, deposit_amount, etc. }
Permission: collection:edit
Response: Updated collection
```

#### 2. Notification Functions

```javascript
const {
  notifyDistributor,
  notifyNextHandler,
  notifyDistributorOfEdit,
} = require("./src/utils/collectionNotifications");

// Notify distributor
await notifyDistributor(collection, "forwarded", "ASM (john)", "Comments");
await notifyDistributor(collection, "returned", "Finance (jane)", "Please update bank details");
await notifyDistributor(collection, "cancelled", "Finance (jane)", "Invalid bank");
await notifyDistributor(collection, "approved", "Finance (jane)", "Approved");

// Notify next handler
await notifyNextHandler(collection, "RSM", "ASM (john)", "Comments");

// Notify distributor of edit
await notifyDistributorOfEdit(collection, "Order Management (mike)", "Updated DO");
```

#### 3. Status Flow

```javascript
const statusFlow = {
  pending: "forwarded_to_regional_manager",
  forwarded_to_area_manager: "forwarded_to_regional_manager",
  forwarded_to_regional_manager: "forwarded_to_zonal_manager_and_sales_admin",
  forwarded_to_zonal_manager_and_sales_admin: "forwarded_to_order_management",
  forwarded_to_order_management: "forwarded_to_finance", // or "returned_to_sales_admin"
  returned_to_sales_admin: "forwarded_to_order_management", // Re-forward after rework
  forwarded_to_finance: "approved", // or "cancelled" or "returned_to_sales_admin"
};
```

#### 4. Role Permissions

```javascript
const rolePermissions = {
  ASM: ["collection:forward", "collection:cancel", "collection:edit", "collection:view"],
  RSM: ["collection:forward", "collection:cancel", "collection:edit", "collection:view"],
  ZSM: ["collection:view"], // View only
  "Sales Admin": ["collection:forward", "collection:cancel", "collection:edit", "collection:view"],
  "Order Management": [
    "collection:forward",
    "collection:return",
    "collection:cancel",
    "collection:edit",
    "collection:view",
  ],
  Finance: [
    "collection:approve",
    "collection:return",
    "collection:cancel",
    "collection:edit",
    "collection:view",
  ],
};
```

### Frontend Implementation Guide

#### 1. Add to CollectionDetails.tsx

```typescript
interface CollectionDetailsProps {
  collection: Collection;
  userRole: string;
  onForward: (comments: string) => Promise<void>;
  onCancel: (reason: string) => Promise<void>;
  onApprove: (comments: string) => Promise<void>;
  onEdit: (data: Partial<Collection>) => Promise<void>;
}

function CollectionDetails({ collection, userRole, ...handlers }: CollectionDetailsProps) {
  // Show action buttons based on role and status
  const canForward =
    ["ASM", "RSM", "Sales Admin", "Order Management"].includes(userRole) &&
    !["approved", "cancelled"].includes(collection.approval_status);

  const canReturn =
    ["Order Management", "Finance"].includes(userRole) &&
    ((userRole === "Order Management" &&
      collection.approval_status === "forwarded_to_order_management") ||
      (userRole === "Finance" && collection.approval_status === "forwarded_to_finance"));

  const canApprove =
    userRole === "Finance" && collection.approval_status === "forwarded_to_finance";

  const canCancel = !["approved", "cancelled"].includes(collection.approval_status);

  const canEdit =
    ["ASM", "RSM", "Sales Admin", "Order Management", "Finance"].includes(userRole) &&
    !["approved", "cancelled"].includes(collection.approval_status);

  return (
    <>
      {/* Status Badge */}
      <Chip
        label={getStatusLabel(collection.approval_status)}
        color={getStatusColor(collection.approval_status)}
      />

      {/* Action Buttons */}
      <Stack direction="row" spacing={2}>
        {canForward && (
          <Button variant="contained" onClick={() => handleForward()}>
            Forward to {getNextRole(collection.approval_status)}
          </Button>
        )}
        {canReturn && (
          <Button variant="outlined" color="warning" onClick={() => handleReturn()}>
            Return to Sales Admin
          </Button>
        )}
        {canApprove && (
          <Button variant="contained" color="success" onClick={() => handleApprove()}>
            Approve Payment
          </Button>
        )}
        {canCancel && (
          <Button variant="outlined" color="error" onClick={() => handleCancel()}>
            Cancel
          </Button>
        )}
        {canEdit && (
          <Button variant="outlined" onClick={() => handleEdit()}>
            Edit Details
          </Button>
        )}
      </Stack>

      {/* Approval History Timeline */}
      <Timeline>
        {collection.approval_chain.map((action, index) => (
          <TimelineItem key={index}>
            <TimelineSeparator>
              <TimelineDot color={getActionColor(action.action)} />
              {index < collection.approval_chain.length - 1 && <TimelineConnector />}
            </TimelineSeparator>
            <TimelineContent>
              <Typography variant="h6">{action.action}</Typography>
              <Typography color="text.secondary">
                {action.from_role} → {action.to_role}
              </Typography>
              <Typography variant="body2">{action.performed_by_name}</Typography>
              <Typography variant="caption">{action.comments}</Typography>
              <Typography variant="caption" color="text.secondary">
                {formatDateTime(action.timestamp)}
              </Typography>
            </TimelineContent>
          </TimelineItem>
        ))}
      </Timeline>
    </>
  );
}

// Helper functions
function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: "Pending Review",
    forwarded_to_area_manager: "With Area Sales Manager",
    forwarded_to_regional_manager: "With Regional Sales Manager",
    forwarded_to_zonal_manager_and_sales_admin: "With Zonal Manager & Sales Admin",
    returned_to_sales_admin: "Returned to Sales Admin for Rework",
    forwarded_to_order_management: "With Order Management",
    forwarded_to_finance: "With Finance",
    approved: "Approved",
    cancelled: "Cancelled",
  };
  return labels[status] || status;
}

function getStatusColor(status: string): "default" | "primary" | "success" | "error" {
  if (status === "approved") return "success";
  if (status === "cancelled") return "error";
  if (status === "pending") return "default";
  return "primary";
}

function getNextRole(currentStatus: string): string {
  const nextRoles: Record<string, string> = {
    pending: "RSM",
    forwarded_to_area_manager: "RSM",
    forwarded_to_regional_manager: "Sales Admin",
    forwarded_to_zonal_manager_and_sales_admin: "Order Management",
    forwarded_to_order_management: "Finance",
  };
  return nextRoles[currentStatus] || "Next Approver";
}
```

#### 2. Add to API client

```typescript
// frontend/src/lib/collectionApi.ts
export async function forwardCollection(id: string, comments: string = "") {
  return apiClient.post(`/ordermanagement/collections/${id}/forward`, { comments });
}

export async function returnCollection(id: string, reason: string) {
  return apiClient.post(`/ordermanagement/collections/${id}/return`, { reason });
}

export async function cancelCollection(id: string, reason: string) {
  return apiClient.post(`/ordermanagement/collections/${id}/cancel`, { reason });
}

export async function approveCollection(id: string, comments: string = "") {
  return apiClient.post(`/ordermanagement/collections/${id}/approve`, { comments });
}

export async function editCollection(id: string, data: FormData) {
  return apiClient.put(`/ordermanagement/collections/${id}/edit`, data);
}
```

#### 3. Add to Collections List (page.tsx)

```typescript
// Filter collections by current handler role
const myCollections = collections.filter(
  (c) =>
    c.current_handler_role === user.role_id.role &&
    !["approved", "cancelled"].includes(c.approval_status)
);

// Add status badge to table rows
<TableCell>
  <Chip
    label={getStatusLabel(collection.approval_status)}
    size="small"
    color={getStatusColor(collection.approval_status)}
  />
</TableCell>;
```

## For Testers

### Test Scenarios

#### Scenario 1: Complete Approval Flow (Happy Path)

1. **Distributor**: Submit collection with valid details
2. **ASM**: Forward to RSM with comments
3. **RSM**: Forward to Sales Admin
4. **Sales Admin**: Forward to Order Management
5. **Order Management**: Forward to Finance
6. **Finance**: Approve payment
7. **Verify**:
   - Distributor receives 6 notifications (1 per forward + 1 approval)
   - CustomerLedger has credit entry
   - Collection status is "approved"

#### Scenario 1B: Approval Flow with Return/Rework

1. **Distributor**: Submit collection
2. **ASM → RSM → Sales Admin → Order Management**: All forward
3. **Order Management**: Return to Sales Admin (reason: "Missing DO number")
4. **Sales Admin**: Edit collection, add DO number, re-forward to Order Management
5. **Order Management**: Forward to Finance
6. **Finance**: Return to Sales Admin (reason: "Bank account mismatch")
7. **Sales Admin**: Edit collection, fix bank details, re-forward to Order Management
8. **Order Management**: Forward to Finance
9. **Finance**: Approve payment
10. **Verify**:
    - Distributor receives notifications for: forwards, 2 returns, 2 edits, final approval
    - Approval chain shows complete history including returns
    - CustomerLedger created on final approval

#### Scenario 2: Cancellation at Each Stage

1. **At ASM**: Cancel with reason "Invalid bank details"
2. **At RSM**: Cancel with reason "Duplicate payment"
3. **At Finance**: Cancel with reason "Fraudulent transaction"
4. **Verify**:
   - Distributor receives cancellation notification with reason
   - Collection status is "cancelled"
   - No CustomerLedger entry created

#### Scenario 3: Edit Collection

1. **Order Management**: Edit DO number
2. **Finance**: Edit deposit amount
3. **Verify**:
   - Distributor receives edit notifications
   - Changes reflected in collection
   - Edit recorded in approval_chain

#### Scenario 4: Role-Based Access

1. **ZSM**: Try to forward/cancel/edit → Should fail (view only)
2. **ASM**: Try to approve → Should fail (only Finance can approve)
3. **Distributor**: Try to forward own collection → Should fail (no permission)

### Test Data

```javascript
// Test collection
{
  "distributor_id": "[distributor_id]",
  "payment_method": "bank",
  "company_bank": "[bank_id]",
  "company_bank_account_no": "1234567890",
  "depositor_bank": "Test Bank",
  "depositor_branch": "Test Branch",
  "deposit_amount": 50000.00,
  "deposit_date": "2025-01-15",
  "note": "Test payment for approval workflow",
  "do_no": "DO-2025-001"
}
```

## For Users

### Distributor Guide

1. **Submit Payment**: Fill form and upload receipt image
2. **Track Progress**: View payment in "My Payments" list
3. **Receive Notifications**: Get notified at each approval stage
4. **View Details**: Click payment to see approval history

### Approver Guide (ASM/RSM/Sales Admin/Order Management)

1. **View Queue**: See payments waiting for your action in "My Queue"
2. **Review Details**: Click payment to view all information
3. **Take Action**:
   - **Forward**: Send to next approver (add optional comments)
   - **Cancel**: Reject payment (must provide reason)
   - **Edit**: Update details if needed (adds note to approval history)

### Finance Guide

1. **View Queue**: See payments forwarded to Finance
2. **Review Details**: Verify all information is correct
3. **Take Action**:
   - **Approve**: Create credit entry in distributor's ledger
   - **Cancel**: Reject payment (must provide reason)
   - **Edit**: Update details if needed

### ZSM Guide

1. **View Only**: Can see all payments in territory
2. **No Actions**: Cannot forward, cancel, or edit (view permissions only)
3. **Monitor Progress**: Track approval status

## Troubleshooting

### Issue: Notifications not received

**Solution**:

- Check user_id in Notification collection matches your user
- Verify notification type is "collection"
- Check notification API endpoint: GET /notifications

### Issue: Cannot forward collection

**Solution**:

- Verify your role matches current_handler_role
- Check you have "collection:forward" permission
- Logout and login to refresh permissions

### Issue: Approve button not showing

**Solution**:

- Only Finance role can approve
- Collection must be in "forwarded_to_finance" status
- Check you have "collection:approve" permission

### Issue: CustomerLedger entry not created

**Solution**:

- Verify approval completed successfully
- Check collection.ledger_entry_id field
- Query CustomerLedger with voucher_type="COL"

## Database Queries

### View all notifications for a distributor

```javascript
db.notifications
  .find({
    user_id: ObjectId("distributor_user_id"),
    type: "collection",
  })
  .sort({ createdAt: -1 });
```

### View approval history for a collection

```javascript
db.collections.findOne(
  { transaction_id: "COL-20250115-00001" },
  { approval_chain: 1, approval_status: 1 }
);
```

### View ledger entries for approved collections

```javascript
db.customerledgers
  .find({
    voucher_type: "COL",
  })
  .sort({ transaction_date: -1 });
```

### Check user permissions

```javascript
db.users.aggregate([
  { $match: { username: "your_username" } },
  {
    $lookup: {
      from: "roles",
      localField: "role_id",
      foreignField: "_id",
      as: "role",
    },
  },
  { $unwind: "$role" },
  {
    $lookup: {
      from: "role_api_permissions",
      localField: "role._id",
      foreignField: "role_id",
      as: "permissions",
    },
  },
  {
    $project: {
      username: 1,
      role: "$role.role",
      permissions: "$permissions.api_permission_id",
    },
  },
]);
```

## API Testing with cURL

### Forward collection

```bash
curl -X POST http://localhost:5000/ordermanagement/collections/[id]/forward \
  -H "Authorization: Bearer [token]" \
  -H "Content-Type: application/json" \
  -d '{"comments": "Forwarding to RSM"}'
```

### Return collection to Sales Admin

```bash
curl -X POST http://localhost:5000/ordermanagement/collections/[id]/return \
  -H "Authorization: Bearer [token]" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Please update bank account details"}'
```

### Cancel collection

```bash
curl -X POST http://localhost:5000/ordermanagement/collections/[id]/cancel \
  -H "Authorization: Bearer [token]" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Invalid bank details"}'
```

### Approve collection

```bash
curl -X POST http://localhost:5000/ordermanagement/collections/[id]/approve \
  -H "Authorization: Bearer [token]" \
  -H "Content-Type: application/json" \
  -d '{"comments": "Approved"}'
```

### Get notifications

```bash
curl http://localhost:5000/notifications \
  -H "Authorization: Bearer [token]"
```
