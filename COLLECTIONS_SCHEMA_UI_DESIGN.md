# Collections Module - Schema & UI Design

## API Endpoint

`POST /ordermanagement/demandorders/collections`

---

## MongoDB Schema

```javascript
const collectionSchema = new mongoose.Schema(
  {
    // Transaction ID (Auto-generated, unique)
    transaction_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
      // Format: COL-YYYYMMDD-XXXXX
    },

    // Distributor Reference
    distributor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Distributor",
      required: true,
      index: true,
    },

    // Demand Order Reference (Optional)
    do_no: {
      type: String,
      index: true,
      default: null,
      // Can link to existing demand order
    },

    // Payment Method (Radio Selection)
    payment_method: {
      type: String,
      enum: ["Bank", "Cash"],
      required: true,
    },

    // === BANK PAYMENT FIELDS ===
    // (Only populated when payment_method = "Bank")

    company_bank: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BdBank",
      // Required if payment_method = "Bank"
    },

    company_bank_account_no: {
      type: String,
      trim: true,
      // Required if payment_method = "Bank"
    },

    depositor_bank: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BdBank",
      // Required if payment_method = "Bank"
    },

    depositor_branch: {
      type: String,
      trim: true,
      // Required if payment_method = "Bank"
    },

    // === CASH PAYMENT FIELDS ===
    // (Only populated when payment_method = "Cash")

    cash_method: {
      type: String,
      enum: [
        "Petty Cash",
        "Provision for Commission",
        "Provision for Incentive",
        "Provision for Damage",
      ],
      // Required if payment_method = "Cash"
    },

    // === COMMON FIELDS ===
    // (Required for both Bank and Cash)

    depositor_mobile: {
      type: String,
      required: true,
      trim: true,
    },

    deposit_amount: {
      type: mongoose.Schema.Types.Decimal128,
      required: true,
      // Stored with 2 decimal precision
    },

    deposit_date: {
      type: Date,
      required: true,
      index: true,
    },

    note: {
      type: String,
      default: null,
      trim: true,
    },

    // Image Upload
    image: {
      file_name: String,
      file_path: String,
      file_size: Number, // in bytes
      mime_type: String,
      uploaded_at: Date,
    },

    // Audit Fields
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    collection: "collections",
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

// Indexes
collectionSchema.index({ transaction_id: 1 }, { unique: true });
collectionSchema.index({ distributor_id: 1, created_at: -1 });
collectionSchema.index({ do_no: 1 });
collectionSchema.index({ payment_method: 1, deposit_date: -1 });

// Virtual for formatted deposit_amount
collectionSchema.virtual("deposit_amount_formatted").get(function () {
  if (this.deposit_amount) {
    return parseFloat(this.deposit_amount.toString()).toFixed(2);
  }
  return "0.00";
});

// Pre-save: Generate transaction_id
collectionSchema.pre("save", async function (next) {
  if (!this.transaction_id) {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");

    // Find last transaction for today
    const lastCollection = await this.constructor
      .findOne({ transaction_id: new RegExp(`^COL-${dateStr}`) })
      .sort({ transaction_id: -1 })
      .select("transaction_id")
      .lean();

    let sequence = 1;
    if (lastCollection && lastCollection.transaction_id) {
      const lastSeq = parseInt(lastCollection.transaction_id.split("-")[2]);
      if (!isNaN(lastSeq)) {
        sequence = lastSeq + 1;
      }
    }

    this.transaction_id = `COL-${dateStr}-${sequence.toString().padStart(5, "0")}`;
  }
  next();
});

// Pre-save: Validate conditional fields
collectionSchema.pre("save", function (next) {
  if (this.payment_method === "Bank") {
    // Validate Bank fields
    if (!this.company_bank) {
      return next(new Error("Company bank is required for bank payment"));
    }
    if (!this.company_bank_account_no) {
      return next(new Error("Company bank account number is required for bank payment"));
    }
    if (!this.depositor_bank) {
      return next(new Error("Depositor bank is required for bank payment"));
    }
    if (!this.depositor_branch) {
      return next(new Error("Depositor branch is required for bank payment"));
    }
    // Clear cash fields
    this.cash_method = undefined;
  } else if (this.payment_method === "Cash") {
    // Validate Cash fields
    if (!this.cash_method) {
      return next(new Error("Cash method is required for cash payment"));
    }
    // Clear bank fields
    this.company_bank = undefined;
    this.company_bank_account_no = undefined;
    this.depositor_bank = undefined;
    this.depositor_branch = undefined;
  }
  next();
});

// Validate image size (8MB = 8 * 1024 * 1024 bytes)
collectionSchema.path("image.file_size").validate(function (value) {
  if (value && value > 8 * 1024 * 1024) {
    return false;
  }
  return true;
}, "Image size must not exceed 8MB");

const Collection = mongoose.model("Collection", collectionSchema);

module.exports = Collection;
```

---

## UI Design Suggestion

### Layout: Single Form with Conditional Fields

```
┌─────────────────────────────────────────────────────────────┐
│  Add New Collection                                    [X]  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Payment Method *                                            │
│  ◉ Bank    ○ Cash                                           │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  BANK PAYMENT DETAILS                                 │  │
│  │                                                        │  │
│  │  Company Bank *                    [Select Bank ▼]   │  │
│  │  Company Bank Account No *         [____________]    │  │
│  │  Depositor Bank *                  [Select Bank ▼]   │  │
│  │  Depositor Branch *                [____________]    │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  OR (if Cash selected)                                       │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  CASH PAYMENT DETAILS                                 │  │
│  │                                                        │  │
│  │  Cash Method *                     [Select Method ▼] │  │
│  │    • Petty Cash                                       │  │
│  │    • Provision for Commission                         │  │
│  │    • Provision for Incentive                          │  │
│  │    • Provision for Damage                             │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  COMMON DETAILS                                       │  │
│  │                                                        │  │
│  │  Depositor Mobile *                [____________]    │  │
│  │  Deposit Amount (BDT) *            [________.00]     │  │
│  │  Deposit Date *                    [📅 DD/MM/YYYY]  │  │
│  │  Demand Order No (Optional)        [Search DO... ▼]  │  │
│  │                                                        │  │
│  │  Note (Optional)                                      │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │                                                 │  │  │
│  │  │  (Multiline text area)                         │  │  │
│  │  │                                                 │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  │                                                        │  │
│  │  Upload Receipt/Slip                                  │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │  📎 Drop file here or click to upload          │  │  │
│  │  │     Max size: 8MB (JPG, PNG, PDF)              │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  │  [preview-image-if-uploaded.png]                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│                                                              │
│            [Cancel]              [Submit Collection]        │
└─────────────────────────────────────────────────────────────┘
```

### UI Behavior

1. **Payment Method Radio**

   - Default: Bank selected
   - When "Bank" selected: Show bank fields, hide cash method
   - When "Cash" selected: Show cash method, hide bank fields
   - Smooth transition/animation between modes

2. **Bank Dropdowns**

   - API: `GET /api/master/bd-banks/active`
   - Searchable dropdown (Autocomplete)
   - Show bank name in dropdown
   - Store bank ObjectId in form

3. **Company Bank Account No**

   - Input type: text
   - Pattern validation: numbers only
   - Max length: 20 digits

4. **Depositor Branch**

   - Free text input
   - Max length: 100 characters

5. **Cash Method Dropdown**

   - Single select dropdown
   - 4 predefined options (as per enum)

6. **Depositor Mobile**

   - Input type: tel
   - Pattern: digits only (allow +, -, spaces for formatting)
   - Validation: 11 digits for Bangladesh
   - Format: +880-XXXXXXXXXX or 01XXXXXXXXX

7. **Deposit Amount**

   - Input type: number
   - Step: 0.01 (for 2 decimal places)
   - Min: 0.01
   - Max: 999999999.99
   - Format display: BDT 12,345.67
   - Validation: Required, must be > 0

8. **Deposit Date**

   - Date picker component
   - Max date: Today
   - Default: Today
   - Display format: DD/MM/YYYY
   - Store as: ISODate

9. **Demand Order No**

   - Searchable autocomplete
   - API: Search distributor's own demand orders
   - Display: Order number + total amount
   - Optional field (can be null)
   - Filter: Show only orders with outstanding balance

10. **Note**

    - Textarea (multiline)
    - Max length: 500 characters
    - Character counter
    - Optional field

11. **Image Upload**
    - File input (drag & drop or click)
    - Accepted types: .jpg, .jpeg, .png, .pdf
    - Max size: 8MB
    - Show preview for images
    - Show filename for PDF
    - Client-side validation before upload
    - Display upload progress
    - Allow removal before submit

---

## Form Validation Rules

### Bank Payment

- ✅ Company Bank: Required
- ✅ Company Bank Account No: Required, numeric, 10-20 digits
- ✅ Depositor Bank: Required
- ✅ Depositor Branch: Required, max 100 chars

### Cash Payment

- ✅ Cash Method: Required, one of 4 enum values

### Common (Both)

- ✅ Depositor Mobile: Required, numeric, 11 digits
- ✅ Deposit Amount: Required, > 0, 2 decimal places
- ✅ Deposit Date: Required, <= today
- ⭕ DO Number: Optional
- ⭕ Note: Optional, max 500 chars
- ⭕ Image: Optional, max 8MB, allowed types only

---

## API Response Format

### Success Response (201 Created)

```json
{
  "success": true,
  "message": "Collection created successfully",
  "data": {
    "transaction_id": "COL-20250108-00001",
    "payment_method": "Bank",
    "deposit_amount": "5000.00",
    "deposit_date": "2025-01-08T00:00:00.000Z",
    "created_at": "2025-01-08T10:30:45.123Z",
    ...
  }
}
```

### Error Response (400 Bad Request)

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "company_bank": "Company bank is required for bank payment",
    "deposit_amount": "Deposit amount must be greater than 0"
  }
}
```

---

## List View Design

### Collection History Table

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Collections History                                      [+ Add Collection] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Filters:  [Payment Method ▼]  [Date Range: ___ to ___]  [Search DO]  🔍  │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ Transaction ID    │ Date       │ Method │ Amount     │ DO No   │ ...  │ │
│  ├───────────────────────────────────────────────────────────────────────┤ │
│  │ COL-20250108-00003│ 08/01/2025│ Bank   │ 12,500.00 │ DO-001  │ 👁️   │ │
│  │ COL-20250108-00002│ 08/01/2025│ Cash   │  5,000.00 │ -       │ 👁️   │ │
│  │ COL-20250107-00015│ 07/01/2025│ Bank   │ 25,000.00 │ DO-002  │ 👁️   │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  Showing 1-10 of 45          [◀️ Previous]  Page 1 of 5  [Next ▶️]         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Details View (Modal)

```
┌─────────────────────────────────────────────────────────────┐
│  Collection Details - COL-20250108-00003              [X]   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Transaction ID:     COL-20250108-00003                     │
│  Payment Method:     Bank                                    │
│  Deposit Amount:     BDT 12,500.00                          │
│  Deposit Date:       08 Jan 2025                            │
│  DO Number:          DO-20250105-00001                      │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  BANK DETAILS                                         │  │
│  │  Company Bank:         Dutch Bangla Bank Ltd.        │  │
│  │  Account No:           1234567890123                 │  │
│  │  Depositor Bank:       Islami Bank Bangladesh Ltd.   │  │
│  │  Depositor Branch:     Motijheel                     │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  Depositor Mobile:   +880-1712345678                        │
│                                                              │
│  Note:                                                       │
│  Payment for order DO-20250105-00001                        │
│                                                              │
│  Receipt/Slip:                                               │
│  [📷 receipt-image-thumbnail.jpg]                           │
│                                                              │
│  Created by:         distbanana                             │
│  Created at:         08 Jan 2025, 10:30 AM                  │
│                                                              │
│                                        [Close]              │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Structure (Frontend)

```
src/app/ordermanagement/demandorders/collections/
├── page.tsx                    (List view - collections history)
├── components/
│   ├── CollectionForm.tsx      (Add/Edit form with conditional fields)
│   ├── CollectionList.tsx      (Table with filters)
│   ├── CollectionDetails.tsx   (Modal/drawer for details)
│   ├── PaymentMethodToggle.tsx (Bank/Cash radio buttons)
│   ├── BankFields.tsx          (Bank-specific fields)
│   ├── CashFields.tsx          (Cash-specific fields)
│   ├── CommonFields.tsx        (Shared fields)
│   └── ImageUpload.tsx         (File upload component)
└── types.ts                    (TypeScript interfaces)
```

---

## Security Considerations

1. **File Upload**

   - Validate file type on server-side (not just client)
   - Scan for malicious content
   - Generate unique filename (UUID + timestamp)
   - Store in secure location outside web root
   - Serve through authenticated route only

2. **Transaction ID**

   - Server-generated only (never accept from client)
   - Unique index enforced at DB level
   - Sequential within day for auditing

3. **Amount Validation**

   - Server-side validation for positive amount
   - Decimal128 for precise currency handling
   - No rounding errors

4. **Distributor Isolation**
   - User can only create collections for their own distributor
   - Can only link to their own demand orders
   - Cannot see other distributors' collections

---

## Future Enhancements (Out of Scope for Now)

- [ ] Approval workflow (pending → approved → cleared)
- [ ] Collection status tracking
- [ ] Auto-link to demand order balance
- [ ] Receipt PDF generation
- [ ] SMS/Email notifications
- [ ] Bank reconciliation
- [ ] Multi-collection for single demand order
- [ ] Refund/reversal support
- [ ] Analytics dashboard

---

## Summary

**Schema Highlights:**

- Conditional validation based on payment_method
- Auto-generated unique transaction_id
- Proper decimal handling for amounts
- Image upload with size restriction
- Indexed for efficient queries

**UI Highlights:**

- Clean, single-form design
- Conditional field display (Bank vs Cash)
- Searchable bank dropdowns
- Date picker with validation
- Drag-drop image upload with preview
- Responsive and mobile-friendly
- Clear validation messages
- Smooth user experience

This design ensures data integrity, provides excellent UX, and maintains security standards.
