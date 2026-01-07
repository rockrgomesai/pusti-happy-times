# Pusti Happy Times - Modules Overview

**Generated:** January 5, 2026  
**Application:** MERN Stack ERP System

## Application Summary

**Pusti Happy Times** is a comprehensive Sales Management ERP system for TK Group, Bangladesh. It manages trading operations for FMCG products (chips, dry cakes, edible oil) through a distributor network.

**Stack:**
- Backend: Node.js + Express.js + MongoDB + Redis
- Frontend: Next.js 14 + TypeScript + Material-UI
- Mobile: (Structure exists, not yet implemented)

---

## Core Modules

### 1. Authentication & Authorization
**Purpose:** User authentication, role-based access control, permission management

**Key Features:**
- JWT-based authentication with refresh tokens
- Role-based access control (RBAC)
- API permission system
- Page permission system
- Sidebar menu permissions
- User types: Employee vs Distributor
- Token versioning for logout-all-devices

**Models:**
- `User` - User accounts
- `Role` - User roles
- `ApiPermission` - API endpoint permissions
- `PagePermission` - Frontend page permissions
- `SidebarMenuItem` - Dynamic menu structure

**Routes:**
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/refresh`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/change-password`

---

### 2. Master Data Management
**Purpose:** Manage foundational business data

**Sub-Modules:**

#### A. Product Management
- **Products:** SKU management with brands, categories
- **Brands:** Product brands (active/inactive)
- **Categories:** Product categories

**Models:** `Product`, `Brand`, `Category`

#### B. Territory Management
- **Hierarchical Structure:** Zone → Region → Area → DB Point (Distributor)
- **Tree-based Navigation:** React Arborist for UI
- **Territory Assignment:** Assign territories to sales officers

**Models:** `Territory`

#### C. Human Resources
- **Employees:** Employee master data
- **Designations:** Job roles/positions
- **Facility Assignment:** Link employees to facilities
- **Territory Assignment:** Link employees to territories

**Models:** `Employee`, `Designation`

#### D. Facility Management
- **Facilities:** Factories, Depots, Stores
- **Types:** Factory, Depot (unified schema)
- **Product Segments:** Segment-based access control

**Models:** `Facility`

#### E. Transport Management
- **Vehicles:** Transport fleet management
- **Assignments:** Link to deliveries

**Models:** `Transport`

#### F. Financial Master Data
- **Banks:** Bank master data
- **BD Banks:** Bangladesh bank directory

**Models:** `Bank`, `BdBank`

---

### 3. Distributor Management
**Purpose:** Manage distributor accounts and relationships

**Key Features:**
- Distributor master data
- Territory assignment (DB Point level)
- Product segment assignment
- SKU exclusions
- Distributor portal access
- Credit limit management

**Models:** `Distributor`, `DistributorStock`

**Routes:**
- `/api/v1/distributors/*` - Admin management
- `/api/v1/distributor/*` - Distributor portal

---

### 4. Offer Management
**Purpose:** Promotional offers and discount schemes

**Offer Types:**
- BOGO (Buy One Get One)
- BUNDLE_OFFER (Multi-SKU bundles)
- FLAT_DISCOUNT_PCT/AMT
- DISCOUNT_SLAB_PCT/AMT (Tiered discounts)
- VOLUME_DISCOUNT
- FREE_PRODUCT (Threshold-based gifts)

**Key Features:**
- Offer creation and configuration
- Distributor eligibility management
- Offer send/receive workflow
- Activation/deactivation
- Expiry management

**Models:** `Offer`, `OfferSend`, `OfferReceive`

**Routes:**
- `/api/v1/product/offers/*` - Offer CRUD
- `/api/v1/offers/send-items/*` - Send offers to distributors
- `/api/v1/offers/receive-items/*` - Distributor receive offers

---

### 5. Order Management (Primary Sales)
**Purpose:** Manage orders from distributors to company

**Sub-Modules:**

#### A. Demand Orders (DO)
- **Workflow:** Distributor creates → Submit → Approval chain → Scheduling
- **Approval Chain:** ASM → RSM → Approve/Reject
- **Offer Integration:** Link offers to order items
- **Bundle Tracking:** Track bundles for offer-based orders

**Models:** `DemandOrder`

**Routes:**
- `/api/v1/ordermanagement/demandorders/*`
- `/api/v1/ordermanagement/approveorders/*` (ASM approval)
- `/api/v1/ordermanagement/rsmapproveorders/*` (RSM approval)

#### B. Scheduling
- **Progressive Scheduling:** Split deliveries across multiple schedules
- **Bundle-Based:** For BOGO, BUNDLE offers
- **Quantity-Based:** For discount offers
- **Multi-Iteration:** Track scheduled/unscheduled quantities
- **Facility Assignment:** Assign depot for delivery

**Models:** `Scheduling` (embedded in DemandOrder)

**Routes:**
- `/api/v1/ordermanagement/schedulings/*`
- `/api/v1/ordermanagement/approvedschedulings/*`
- `/api/v1/ordermanagement/scheduledlist/*`

#### C. Collections (Payments)
- **Payment Collection:** Record payments from distributors
- **Payment Methods:** Cash, Bank Transfer, Cheque
- **Approval Workflow:** Submit → Approve → Lock
- **Return Workflow:** Return to distributor if needed
- **Ledger Integration:** Update customer ledger

**Models:** `Collection`

**Routes:**
- `/api/v1/ordermanagement/collections/*`

---

### 6. Distribution Management
**Purpose:** Depot-level distribution scheduling and execution

**Key Features:**
- View approved demand orders
- Progressive scheduling with bundle support
- Multi-iteration delivery scheduling
- Offer integrity validation
- Mobile-first responsive design
- Schedule history tracking

**Routes:**
- `/api/v1/distribution/*` - Distribution scheduling
- `/api/v1/(protected)/distribution/*` - Frontend pages

**Frontend Pages:**
- Pending Orders View
- Schedule Creation Dialog
- Schedule History

---

### 7. Inventory Management
**Purpose:** Track inventory across facilities (factories, depots)

**Sub-Modules:**

#### A. Production to Store
- **Workflow:** Factory → Factory Store (Depot)
- **Shipments:** Track production shipments
- **Receipts:** Depot receives and updates inventory

**Models:** `ProductionSendToStore`, `FactoryStoreInventory`, `FactoryStoreInventoryTransaction`

**Routes:**
- `/api/v1/production/send-to-store/*` - Production shipments
- `/api/v1/inventory/factory-to-store/*` - Depot receipts

#### B. Requisition System
- **Workflow:** Depot → Create Requisition → Approval → Scheduling → Fulfillment
- **Approval Chain:** Production Manager approves
- **Scheduling:** Inventory Manager schedules
- **Fulfillment:** Load Sheet → Chalan → Invoice

**Models:** `InventoryRequisition`, `RequisitionScheduling`, `RequisitionLoadSheet`, `RequisitionChalan`, `RequisitionInvoice`

**Routes:**
- `/api/v1/inventory/requisitions/*`
- `/api/v1/inventory/requisition-schedulings/*`
- `/api/v1/inventory/approved-req-schedules/*`
- `/api/v1/inventory/req-load-sheets/*`
- `/api/v1/inventory/req-chalans/*`

#### C. Depot Transfer
- **Workflow:** Depot A → Depot B
- **Transfer Request:** Create transfer with items
- **Send Process:** Load Sheet → Dispatch
- **Receive Process:** Depot B receives and updates inventory

**Models:** `DepotTransfer`, `LoadSheet`, `DeliveryChalan`

**Routes:**
- `/api/v1/inventory/depot-transfers/*`
- `/api/v1/inventory/depot-deliveries/*`

#### D. Local Stock
- **Current Inventory:** Real-time stock levels
- **Batch Tracking:** Track by batch number
- **Location Tracking:** Rack/bin location
- **Expiry Tracking:** Expiry date alerts
- **Transaction History:** Complete audit trail

**Models:** `FactoryStoreInventory`, `FactoryStoreInventoryTransaction`

**Routes:**
- `/api/v1/inventory/local-stock/*`

---

### 8. Finance Management
**Purpose:** Financial operations and reporting

**Sub-Modules:**

#### A. Customer Ledger
- **Account Management:** Track distributor accounts
- **Transaction Recording:** Orders, payments, returns
- **Balance Tracking:** Running balance per distributor
- **Credit Limit:** Monitor credit limits

**Models:** `CustomerLedger`

**Routes:**
- `/api/v1/finance/customerledger/*`

---

### 9. Dashboard & Analytics
**Purpose:** Role-based dashboards and KPIs

**Key Features:**
- Role-based widget system
- Real-time statistics
- Performance metrics
- Territory-based filtering
- Mobile-responsive cards

**Routes:**
- `/api/v1/dashboard/*`

**Frontend:**
- `/dashboard` - Dynamic role-based dashboard

---

### 10. Notification System
**Purpose:** Real-time notifications and alerts

**Key Features:**
- Socket.IO integration
- Real-time push notifications
- Notification bell UI
- Read/unread tracking
- Action-based routing

**Models:** `Notification`

**Routes:**
- `/api/v1/notifications/*`

**Context:** `SocketContext`, `NotificationContext`

---

## Supporting Systems

### Role-Based Access Control (RBAC)
- **Roles:** System Admin, Inventory Manager, Finance Manager, ASM, RSM, Distributor, etc.
- **Permissions:** API permissions, Page permissions, Menu items
- **Context Validation:** Territory, Facility, Product Segment filtering

### Audit Trail
All models include:
- `created_at`, `created_by`
- `updated_at`, `updated_by`

### Mobile-First Design
- Progressive Web App capabilities
- Touch-optimized controls
- Responsive layouts (320px+)
- Collapsible components
- Floating action buttons

---

## Module Dependencies

```
Authentication
    ↓
Master Data (Products, Territories, Facilities, Employees, Distributors)
    ↓
Offers
    ↓
Order Management (Demand Orders → Scheduling → Collections)
    ↓
Distribution (Depot Scheduling)
    ↓
Inventory (Production → Requisitions → Transfers)
    ↓
Finance (Customer Ledger)
    ↓
Dashboard & Analytics
```

---

## Integration Points

### Backend ↔ Frontend
- REST API (JSON)
- JWT authentication headers
- Socket.IO for real-time updates

### Database
- MongoDB (primary data store)
- Redis (caching, session management)

### File Structure
```
backend/src/
  ├── models/         # Mongoose schemas
  ├── routes/         # Express routes
  ├── controllers/    # Business logic
  ├── middleware/     # Auth, validation
  ├── services/       # Reusable services
  └── utils/          # Helper functions

frontend/src/
  ├── app/            # Next.js pages (App Router)
  ├── components/     # Reusable UI components
  ├── contexts/       # React contexts
  ├── lib/            # API client, utilities
  ├── services/       # API service layers
  └── types/          # TypeScript types
```

---

## Next Steps for Understanding

1. **Read BACKEND_CONTEXT.md** - Detailed backend architecture
2. **Read FRONTEND_CONTEXT.md** - Frontend structure and components
3. **Read DATABASE_CONTEXT.md** - Complete schema documentation
4. **Explore specific module docs** - Check individual implementation guides

---

**Questions?** Ask about specific modules, workflows, or features for detailed explanations.
