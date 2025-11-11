# Collection Module - Schema Design

## Overview

The Collection module handles payment collections from distributors. It supports:

1. **Standalone payments** - Fees, charges, or payments not linked to demand orders
2. **Demand order payments** - Payments linked to specific demand orders

## Core Requirements

- Distributors have full access to this module
- Can be used independently (without demand order reference)
- Can be attached to demand orders during payment stage
- Supports various payment types and methods
- Maintains audit trail and approval workflow

---

## Proposed Schema: `Collection`

### Core Fields

```javascript
{
  // Unique Identifier
  collection_number: String,           // Auto-generated: COL-YYYYMMDD-XXXXX

  // Distributor Reference (Required)
  distributor_id: ObjectId,            // ref: 'Distributor'

  // Demand Order Link (Optional)
  demand_order_id: ObjectId,           // ref: 'DemandOrder', nullable
  demand_order_number: String,         // Cached for display

  // Collection Type
  collection_type: String,             // enum: ['order_payment', 'advance', 'fee', 'deposit', 'refund', 'other']

  // Payment Details
  payment_method: String,              // enum: ['cash', 'cheque', 'bank_transfer', 'mobile_banking', 'card', 'online']
  payment_amount: Decimal128,          // Total amount collected

  // Payment Instrument Details (conditional based on payment_method)
  payment_details: {
    // For Cheque
    cheque_number: String,
    cheque_date: Date,
    cheque_bank: String,
    cheque_branch: String,

    // For Bank Transfer
    transaction_id: String,
    transaction_date: Date,
    from_bank: String,
    from_account: String,
    to_bank: String,
    to_account: String,

    // For Mobile Banking
    mobile_provider: String,           // enum: ['bKash', 'Nagad', 'Rocket', 'Upay', 'other']
    mobile_transaction_id: String,
    mobile_number: String,

    // For Card
    card_type: String,                 // enum: ['credit', 'debit']
    card_last_4: String,
    card_transaction_id: String,

    // Common
    reference_number: String,
    notes: String,
  },

  // Status & Workflow
  status: String,                      // enum: ['draft', 'submitted', 'verified', 'cleared', 'rejected', 'cancelled']

  // Amount Allocation (if linked to demand order)
  allocation: {
    order_amount: Decimal128,          // Amount allocated to order
    advance_amount: Decimal128,        // Amount kept as advance
    discount_amount: Decimal128,       // Discount applied
    adjustment_amount: Decimal128,     // Any adjustments
  },

  // Verification (for non-cash payments)
  verification: {
    verified_by: ObjectId,             // ref: 'User'
    verified_at: Date,
    verification_notes: String,
    verification_status: String,       // enum: ['pending', 'verified', 'failed']
  },

  // Clearance (for cheques, bank transfers)
  clearance: {
    cleared_by: ObjectId,              // ref: 'User'
    cleared_at: Date,
    clearance_notes: String,
    clearance_status: String,          // enum: ['pending', 'cleared', 'bounced']
    expected_clearance_date: Date,
  },

  // Document Attachments
  attachments: [{
    file_name: String,
    file_path: String,
    file_type: String,                 // enum: ['image', 'pdf', 'document']
    uploaded_at: Date,
    uploaded_by: ObjectId,             // ref: 'User'
  }],

  // Approval Workflow
  submitted_at: Date,
  submitted_by: ObjectId,              // ref: 'User'

  approved_at: Date,
  approved_by: ObjectId,               // ref: 'User'

  rejected_at: Date,
  rejected_by: ObjectId,               // ref: 'User'
  rejection_reason: String,

  cancelled_at: Date,
  cancelled_by: ObjectId,              // ref: 'User'
  cancellation_reason: String,

  // Remarks
  notes: String,                       // General notes
  internal_notes: String,              // Staff-only notes

  // Audit
  created_by: ObjectId,                // ref: 'User'
  updated_by: ObjectId,                // ref: 'User'
  created_at: Date,
  updated_at: Date,
}
```

---

## Schema Features

### 1. Collection Types

- **order_payment**: Payment against a demand order
- **advance**: Advance payment (future orders)
- **fee**: Various fees (registration, annual, etc.)
- **deposit**: Security deposit, bank guarantee installment
- **refund**: Money returned to distributor
- **other**: Miscellaneous collections

### 2. Payment Methods

- **cash**: Immediate cash payment
- **cheque**: Requires verification and clearance
- **bank_transfer**: Requires verification
- **mobile_banking**: bKash, Nagad, Rocket, Upay
- **card**: Credit/Debit card payments
- **online**: Online payment gateway

### 3. Status Workflow

```
draft → submitted → verified → cleared → (completed)
                   ↓           ↓
                rejected    bounced
```

- **draft**: Created but not submitted
- **submitted**: Submitted for verification
- **verified**: Payment details verified by staff
- **cleared**: Payment cleared (cheques, transfers)
- **rejected**: Verification failed
- **cancelled**: Cancelled by distributor

### 4. Indexing Strategy

```javascript
// Compound indexes
{ distributor_id: 1, status: 1, created_at: -1 }
{ demand_order_id: 1 }
{ collection_number: 1 }  // unique
{ status: 1, submitted_at: -1 }
{ 'payment_details.cheque_number': 1 }  // sparse
{ 'payment_details.transaction_id': 1 }  // sparse
```

---

## Relationships

### With Demand Orders

```javascript
// One-to-Many: A demand order can have multiple payments
DemandOrder (1) ←→ (N) Collection

// Use case: Partial payments, multiple installments
```

### With Distributors

```javascript
// One-to-Many: A distributor can have multiple collections
Distributor (1) ←→ (N) Collection
```

---

## Business Rules

### 1. Amount Validation

- `payment_amount` must be > 0
- If linked to demand order:
  - `allocation.order_amount` ≤ `payment_amount`
  - `allocation.order_amount` ≤ remaining balance of demand order
  - Total allocated amounts ≤ `payment_amount`

### 2. Payment Method Validations

- **Cheque**: Must have `cheque_number`, `cheque_date`, `cheque_bank`
- **Bank Transfer**: Must have `transaction_id`, `transaction_date`
- **Mobile Banking**: Must have `mobile_provider`, `mobile_transaction_id`

### 3. Status Transitions

- **Cash payments**: draft → submitted → verified (auto-cleared)
- **Cheque/Transfer**: draft → submitted → verified → cleared
- **Rejection**: Can happen at verification or clearance stage

### 4. Collection Number Generation

- Format: `COL-YYYYMMDD-XXXXX`
- Generated on submission (status = 'submitted')
- Sequential within the day

---

## Additional Considerations

### 1. Distributor Credit Tracking

```javascript
// Track distributor's financial standing
distributor_ledger: {
  opening_balance: Decimal128,
  collections_total: Decimal128,
  orders_total: Decimal128,
  closing_balance: Decimal128,
}
```

### 2. Reconciliation Support

- Link multiple collections to single demand order
- Track partial payments
- Support payment plans/installments

### 3. Notifications

- SMS/Email on collection submission
- Alert on cheque clearance/bounce
- Reminder for pending clearances

### 4. Reports Needed

- Daily collection summary
- Pending clearances report
- Distributor-wise collection history
- Payment method-wise analysis
- Outstanding payments report

---

## API Endpoints (Proposed)

```
POST   /collections                    - Create new collection (draft)
GET    /collections                    - List collections (distributor's own)
GET    /collections/:id                - Get collection details
PUT    /collections/:id                - Update collection (draft only)
POST   /collections/:id/submit         - Submit collection for verification
POST   /collections/:id/verify         - Verify collection (staff only)
POST   /collections/:id/clear          - Mark as cleared (staff only)
POST   /collections/:id/reject         - Reject collection
POST   /collections/:id/cancel         - Cancel collection
POST   /collections/:id/attachments    - Upload attachment
GET    /collections/by-order/:orderId  - Get collections for a demand order
```

---

## UI Components Needed

### 1. Collection Form

- Payment method selector
- Conditional fields based on payment method
- File upload for attachments (cheque copy, receipt)
- Demand order search/link

### 2. Collection List

- Filter by status, payment method, date range
- Search by collection number, cheque number
- Quick actions: View, Edit (draft), Submit, Cancel

### 3. Collection Details

- Read-only view with all details
- Timeline of status changes
- Attached documents viewer
- Action buttons based on status and role

### 4. Demand Order Payment Integration

- "Add Payment" button in demand order details
- Shows existing collections
- Displays remaining balance

---

## Questions to Clarify

1. **Currency**: Single currency (BDT) or multi-currency support?
2. **Multi-payment**: Can one collection have multiple payment methods (e.g., part cash, part cheque)?
3. **Approval levels**: Single approval or multi-level (verify → approve → clear)?
4. **Credit limit**: Should collections automatically adjust distributor's credit limit?
5. **Reconciliation**: Auto-reconcile with demand orders or manual matching?
6. **Receipt generation**: Auto-generate receipt PDF on collection submission?
7. **Reverse entry**: Support for collection reversal/adjustment?
8. **Bank integration**: Future integration with bank APIs for auto-verification?

---

## Next Steps

1. **Review & Approve Schema**: Get feedback on field structure
2. **Finalize Field List**: Add/remove fields based on business requirements
3. **Define Validation Rules**: Complete validation logic
4. **Create Mongoose Model**: Implement the schema in code
5. **Build API Routes**: Implement CRUD and workflow endpoints
6. **Design UI Components**: Create forms and list views
7. **Permission Setup**: Configure role-based access
8. **Testing**: Unit tests and integration tests
