# Offer Products Module - Implementation Complete

## Overview

Complete implementation of Offer Products module for sending PROCURED products from Sales Admin to multiple depots and receiving at Inventory depots.

## Implementation Summary

### Backend (✅ Complete)

#### Models Created

1. **OfferSend** (`backend/src/models/OfferSend.js`)

   - Reference number: `OFFSEND-YYYYMMDD-XXX`
   - Multi-depot support with `depot_ids` array
   - Per-depot status tracking in `depot_status` array
   - PROCURED product validation in pre-save hook
   - Status: `pending`, `partially_received`, `fully_received`, `cancelled`

2. **OfferReceive** (`backend/src/models/OfferReceive.js`)
   - Reference number: `OFFRECV-YYYYMMDD-XXX`
   - Variance tracking per product
   - `updateDepotStock()` method for UPSERT logic
   - Automatic variance calculation
   - Quality check status: `passed`, `failed`, `partial`

#### Models Updated

3. **DepotStock** - Added `collection: "depot_stocks"`
4. **DepotTransactionIn** - Added:
   - `collection: "depot_transactions_in"`
   - Transaction type: `from_offer_send`
   - Reference type: `OfferReceive`
5. **DepotTransactionOut** - Added `collection: "depot_transactions_out"`

#### Routes Created

6. **Send Items Routes** (`backend/src/routes/offers/sendItems.js`)

   - `GET /api/offers/send-items` - List with pagination, filters
   - `GET /api/offers/send-items/:id` - Single send details
   - `POST /api/offers/send-items` - Create new send
   - `PUT /api/offers/send-items/:id/cancel` - Cancel send
   - `DELETE /api/offers/send-items/:id` - Soft delete

7. **Receive Items Routes** (`backend/src/routes/offers/receiveItems.js`)
   - `GET /api/offers/receive-items/pending` - Pending for user's depot
   - `GET /api/offers/receive-items/history` - Receive history
   - `POST /api/offers/receive-items/:id` - Receive items
   - `GET /api/offers/receive-items/details/:receiveId` - Receive details

#### Setup Scripts

8. **rename-depot-collections.js** - Migration script for collection rename
9. **setup-offer-products-module.js** - Creates permissions and menu items

### Frontend (✅ Complete)

#### Pages Created

10. **Send Items** (`frontend/src/app/offers/senditems/page.tsx` - 867 lines)

    - Role: Sales Admin only
    - Multi-depot Autocomplete with checkboxes
    - Category/subcategory accordion (5 per page)
    - PROCURED products only (qty_pcs input)
    - Auto-weight calculation: qty_pcs × wt_pcs ÷ 1000
    - Preview dialog with full product list
    - Mobile-first responsive design

11. **Send Items List** (`frontend/src/app/offers/senditemslist/page.tsx` - 637 lines)

    - Role: Sales Admin only
    - Table with multi-depot display (Chip list)
    - Search by reference/batch/SKU
    - Status chips with color coding
    - Detail dialog with depot list
    - CSV/PDF export functionality

12. **Receive Items** (`frontend/src/app/offers/receiveitems/page.tsx` - 712 lines)

    - Role: Inventory only (auto-recognizes facility_id)
    - Pending sends for user's depot
    - Editable received quantities
    - Automatic variance calculation
    - Variance reason required if variance ≠ 0
    - Quality check status selector
    - Confirm receipt with stock update

13. **Receive Items List** (`frontend/src/app/offers/receiveitemslist/page.tsx` - 645 lines)
    - Role: Inventory only
    - Receive history for user's depot
    - Variance display with color chips
    - Quality status display
    - Detail dialog with full variance breakdown
    - CSV/PDF export functionality

## Key Features

### Multi-Depot Support

- Sales Admin can send to multiple depots in one operation
- Each depot tracks its own receive status
- Overall status: pending → partially_received → fully_received

### PROCURED Products Only

- Validation ensures only PROCURED products can be sent
- Quantities in PCS (not CTN like MANUFACTURED products)
- No ERP ID or ctn_pcs fields
- Weight calculation: qty_pcs × wt_pcs ÷ 1000 MT

### Stock Management

- **UPSERT Logic**: If depot+product exists, add quantity; otherwise create new
- **Transaction Recording**: Creates depot_transactions_in records with type "from_offer_send"
- **Atomic Operations**: Uses MongoDB sessions for transaction safety

### Variance Tracking

- Tracks sent vs received quantities per product
- Automatic variance calculation: received - sent
- Variance reason required if variance ≠ 0
- Color-coded variance chips (green=0, blue=positive, yellow=negative)

### Mobile-First Design

- Responsive typography and spacing
- Full-screen dialogs on mobile (<900px)
- Flexible layouts with Grid system
- Touch-friendly button sizes

## Database Collections

### New Collections

- `offer_sends` - Offer send records
- `offer_receives` - Offer receive records

### Updated Collections

- `depot_stocks` - Stock levels per depot+product
- `depot_transactions_in` - Incoming transactions
- `depot_transactions_out` - Outgoing transactions

## Testing Workflow

### 1. Setup (First Time)

```powershell
# Run migration script (if needed)
node rename-depot-collections.js

# Run setup script to create permissions and menus
node setup-offer-products-module.js
```

### 2. Sales Admin Flow

1. Login as Sales Admin user
2. Navigate to **Offer Products → Send Items**
3. Select multiple depots (at least 2)
4. Select PROCURED products
5. Enter qty_pcs, batch, production/expiry dates
6. Preview and submit
7. Verify in **Send Items List** page

### 3. Inventory Flow (Depot 1)

1. Login as Inventory user for Depot 1
2. Navigate to **Offer Products → Receive Items**
3. Find pending send (should only show sends for this depot)
4. Click "Receive" button
5. Verify received quantities (edit if needed)
6. Enter variance reasons if quantities differ
7. Select quality check status
8. Confirm receipt
9. Verify in **Receive Items List** page

### 4. Inventory Flow (Depot 2)

1. Login as Inventory user for Depot 2
2. Navigate to **Offer Products → Receive Items**
3. Find same pending send
4. Receive items with different quantities
5. Verify in **Receive Items List** page

### 5. Verification Checks

- [ ] Check offer_send status changes: pending → partially_received → fully_received
- [ ] Check depot_stocks collection for UPSERT behavior
- [ ] Verify quantities added correctly for both depots
- [ ] Check depot_transactions_in records created with type "from_offer_send"
- [ ] Verify variance calculations are correct
- [ ] Test CSV/PDF export on all list pages
- [ ] Test mobile responsiveness (resize browser < 900px)

## API Permissions

### Sales Admin

- `offers:send:list` - View send list
- `offers:send:view` - View send details
- `offers:send:create` - Create new send
- `offers:send:cancel` - Cancel send
- `offers:send:delete` - Delete send

### Inventory

- `offers:receive:pending` - View pending receives
- `offers:receive:list` - View receive history
- `offers:receive:create` - Receive items
- `offers:receive:view` - View receive details

## Menu Structure

```
Offer Products (parent)
├── Send Items (Sales Admin)
├── Send Items List (Sales Admin)
├── Receive Items (Inventory)
└── Receive Items List (Inventory)
```

## Technical Notes

### Collection Naming

- Explicit `collection` property in all depot models
- Uses singular names: depot_stocks, depot_transactions_in, depot_transactions_out
- Avoids Mongoose auto-pluralization issues

### Stock Storage

- PROCURED products store qty_pcs in the qty_ctn field
- Field name is just a label; treated as generic "unit"
- No schema changes needed

### Reference Numbers

- Format: `OFFSEND-YYYYMMDD-XXX` (Send)
- Format: `OFFRECV-YYYYMMDD-XXX` (Receive)
- Auto-generated with daily counter reset

### Transaction Safety

- MongoDB sessions for atomic stock updates
- Rollback on error during receive operation
- Stock and transaction creation happens in single transaction

## Files Modified/Created

### Backend Files (11)

- ✅ `backend/src/models/DepotStock.js` (modified)
- ✅ `backend/src/models/DepotTransactionIn.js` (modified)
- ✅ `backend/src/models/DepotTransactionOut.js` (modified)
- ✅ `backend/src/models/OfferSend.js` (new - 350+ lines)
- ✅ `backend/src/models/OfferReceive.js` (new - 330+ lines)
- ✅ `backend/src/routes/offers/sendItems.js` (new - 420+ lines)
- ✅ `backend/src/routes/offers/receiveItems.js` (new - 380+ lines)
- ✅ `backend/src/routes/index.js` (modified)
- ✅ `rename-depot-collections.js` (new - root level)
- ✅ `setup-offer-products-module.js` (new - root level)

### Frontend Files (4)

- ✅ `frontend/src/app/offers/senditems/page.tsx` (new - 867 lines)
- ✅ `frontend/src/app/offers/senditemslist/page.tsx` (new - 637 lines)
- ✅ `frontend/src/app/offers/receiveitems/page.tsx` (new - 712 lines)
- ✅ `frontend/src/app/offers/receiveitemslist/page.tsx` (new - 645 lines)

### Documentation

- ✅ `OFFER_PRODUCTS_COMPLETE.md` (this file)

## Total Lines of Code

- **Backend**: ~1,480 lines (new code)
- **Frontend**: ~2,861 lines (new code)
- **Total**: ~4,341 lines

## Status

✅ **Implementation Complete** - Ready for testing

All backend models, routes, and frontend pages have been created following the existing Production Send to Store design pattern, adapted for offer products with multi-depot support and PROCURED product handling.
