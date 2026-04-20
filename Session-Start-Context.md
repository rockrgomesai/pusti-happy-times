# Session Start Context — Pusti Happy Times ERP

**Purpose:** Single consolidated context document to feed at the start of every new AI coding session.
**Last Updated:** April 19, 2026
**Workspace Root:** `/home/rock/apps/tkg/pusti-happy-times`

---

## 1. Project Overview

**Pusti Happy Times** is a comprehensive Sales Management ERP for TK Group (Bangladesh), managing FMCG distribution (chips, dry cakes, edible oil) across a factory → depot → distributor → retail-outlet chain.

Three client surfaces:

- **Web (Next.js)** — Admin/Management portal for HQ, Finance, Distribution, Distributors.
- **Mobile (React Native)** — Field Force app for SO/DSR (attendance, tracking, outlet visits, secondary orders).
- **Backend (Node/Express)** — REST API for web + mobile, MongoDB persistence, Redis sessions, Socket.IO for realtime.

Two sales scopes with **strict unit rules**:

| Scope | Flow | Unit | Example |
|---|---|---|---|
| **Primary Sales** | Factory/Depot → Distributor | **CTN** (cartons) | Distributor buys 10 CTN |
| **Secondary Sales** | Distributor → Retail Outlet (via mobile) | **PCS** (pieces) | SO sells 50 PCS |

Conversion factor: `product.unit_per_case` (e.g. `10 CTN × 24 = 240 PCS`).
Mobile app **never displays CTN** — always PCS.

---

## 2. Technology Stack

### Backend
- Node.js 22 + Express.js 4.18
- MongoDB 7.0 + Mongoose 7.5
- Redis 4.6 (sessions, caching, activity tracking)
- JWT auth (jsonwebtoken 9.0) + bcryptjs
- Socket.IO 4.8 (realtime notifications)
- Security: helmet, cors, express-rate-limit, express-mongo-sanitize, hpp, express-validator
- Utility: morgan, compression, multer, jspdf

### Frontend (Web)
- Next.js 14 (App Router) + TypeScript 5 + React 18.3
- Material-UI (MUI) v7 — **no Tailwind**
- React Hook Form 7.62 + Zod 4.1 (`@hookform/resolvers`)
- Axios 1.11, Socket.IO Client 4.8
- `@mui/x-data-grid`, `@mui/x-date-pickers`, `date-fns` 4.1
- `react-arborist` (territory tree), `react-hot-toast`, `jspdf`, `js-cookie`

### Mobile
- React Native 0.83.1 (Android primary; iOS planned)
- TypeScript, React Navigation, AsyncStorage
- `react-native-geolocation-service`, `react-native-background-actions`
- `@react-native-community/netinfo`
- Axios with auto-refresh interceptors

### Infrastructure
- Docker + Docker Compose (`docker-compose.yml`, `docker-compose.dev.yml`)
- Mongo Express admin UI (port 8081)
- On-premise deployment — **no public registration**, admin-provisioned users only

---

## 3. Repository Layout

```
pusti-happy-times/
├── backend/                 # Node/Express API
│   ├── server.js
│   └── src/
│       ├── config/          # database.js, redis.js
│       ├── middleware/      # auth.js, errorHandler.js
│       ├── models/          # ~52 Mongoose schemas
│       ├── routes/          # auth, users, ordermanagement/, inventory/, distribution/, mobile/, tracking, outlets, routes, attendance, ...
│       ├── controllers/
│       ├── services/        # trackingValidationService.js, etc.
│       ├── seeds/           # seed scripts
│       ├── setup/           # bootstrap scripts
│       └── migrations/
├── frontend/                # Next.js 14 web portal
│   └── src/
│       ├── app/             # App Router pages (login, dashboard, admin, master, hr, inventory, ordermanagement, finance, production, offers, routesoutlets, ...)
│       ├── components/      # common/, layout/, dashboards/, offers/, products/
│       ├── contexts/        # AuthContext, SocketContext, NotificationContext
│       ├── lib/             # api.ts (axios + tokenManager), permissions.ts
│       ├── services/        # API modules
│       ├── theme/           # ThemeProvider
│       ├── middleware.ts    # protected-route redirects
│       └── types/
├── mobile/                  # React Native app
│   └── src/
│       ├── screens/         # LoginScreen, HomeScreen, TraceRouteScreen, ShopActionScreen, NoSalesReasonScreen, AuditInventoryScreen, SalesModuleScreen, DamageClaimScreen, ...
│       ├── services/        # authService, locationService, trackingAPI, syncService, salesAPI, damageClaimAPI
│       ├── components/
│       └── assets/
├── docker-compose.yml / .dev.yml
├── db/                      # init scripts, dumps
├── docs/
└── *.md                     # implementation notes (AUTH-SPEC, DATABASE_CONTEXT, BACKEND_CONTEXT, FRONTEND_CONTEXT, MODULES_OVERVIEW, PRIMARY/SECONDARY/MOBILE_APPS_SESSION_START, etc.)
```

---

## 4. Core Modules

1. **Authentication & RBAC** — JWT access + refresh, `tokenVersion` invalidation, account lockout (3 fails / 5 min), role → API permission + page permission + sidebar menu permission.
2. **Master Data** — Products, Brands, Categories, Territories (Zone→Region→Area→DB Point), Facilities (factory/depot), Transports, Banks, BD Banks, Designations, Employees, Distributors.
3. **Distributor Management** — Credit limits, product segments, SKU exclusions, distributor portal.
4. **Offers** — BOGO, BUNDLE_OFFER, FLAT_DISCOUNT_PCT/AMT, DISCOUNT_SLAB_PCT/AMT, VOLUME_DISCOUNT, FREE_PRODUCT. Send/Receive workflow.
5. **Primary Sales (Order Mgmt)** — Demand Orders → ASM/RSM approval → Sales Admin → Order Mgmt → Finance approval (creates credit entries) → Distribution scheduling → Delivery Chalans → Distributor receiving (FIFO batches) → Collections → Customer Ledger.
6. **Distribution** — Depot-level progressive scheduling with bundle integrity.
7. **Inventory** — Production→Store shipments, FactoryStoreInventory (batch/expiry), Requisitions workflow (load sheets, chalans, invoices), Depot transfers, Local stock.
8. **Finance** — Customer Ledger (auto-posted debit from DOs, credit from collections + discounts + free goods).
9. **Secondary Sales (Mobile)** — Outlets, Routes (day-wise), DSRs/SOs, Outlet Visits (GPS-validated), Secondary Orders (PCS, FIFO stock reduction), Secondary Deliveries, Attendance, GPS Tracking.
10. **GPS Tracking & Fraud Detection** — 1-min interval, batch upload, offline queue, mock GPS detection, speed/teleport/territory/pattern scoring; auto-flag at score ≥ 50.
11. **Dashboards & Analytics** — Role-based widgets, KPIs (PC%, LPC, CCP, coverage, drop size, achievement%).
12. **Notifications** — Socket.IO realtime + persistent `notifications` collection.

---

## 5. Database (MongoDB — `pusti_happy_times`)

**~48–52 collections.** Naming: plural snake_case; refs `{entity}_id`.

### Standard audit fields (every collection)
```js
created_at: Date, created_by: ObjectId → User,
updated_at: Date, updated_by: ObjectId → User
```

### Key collections

**Auth:** `users`, `roles`, `api_permissions`, `page_permissions`, `sidebar_menu_items`, `role_api_permissions`, `role_page_permissions`, `role_sidebar_menu_items`.

**Master:** `products`, `brands`, `categories`, `territories`, `facilities`, `transports`, `banks`, `bd_banks`, `designations`, `employees`, `employee_territories`, `distributors`.

**Offers:** `offers`, `offer_sends`, `offer_receives`.

**Primary Sales:** `demand_orders` (scheduling embedded), `delivery_chalans`, `collections`, `customer_ledger`, `distributor_stocks` (FIFO batches).

**Inventory:** `production_send_to_stores`, `factory_store_inventories`, `factory_store_inventory_transactions`, `inventory_requisitions`, `requisition_schedulings`, `requisition_load_sheets`, `requisition_chalans`, `requisition_invoices`, `depot_transfers`, `load_sheets`.

**Secondary Sales / Mobile:** `outlets` (2dsphere), `routes`, `dsrs`, `secondaryorders`, `secondarydeliveries`, `outlet_visits`, `outlet_audits`, `damage_claims`, `attendance`, `tracking_sessions`, `tracking_locations` (2dsphere).

**Other:** `notifications`.

### Critical schema notes
- `users`: `user_type` enum `[employee, distributor]`; exactly one of `employee_id` / `distributor_id` required. `password` is `select: false`. `tokenVersion` for logout-all.
- `employees`: `employee_type` enum `[system_admin, field, facility, hq]`. `facility_id` for facility staff, `factory_store_id` for production, `employee_territories` junction for field.
- `territories`: hierarchical via `parent_id`; `level` enum `[zone, region, area, db_point]`.
- `facilities`: unified schema replacing old `factories`/`depots` — `facility_type: 'factory'|'depot'`.
- `demand_orders.items[]`: includes `order_qty`, `scheduled_qty`, `unscheduled_qty`, `order_bundles`, per-item `schedules[]` history, offer `bundle_definition`, `is_offer_broken` flag.
- `distributor_stocks.batches[]`: FIFO with `batch_id`, `received_date`, `unit_price`, `received_qty`, `consumed_qty`, `balance_qty`.
- All money: `Decimal128`.
- Geospatial: `2dsphere` index on `outlets.location`, `secondaryorders.gps_location`, `tracking_locations.location`. Coordinates stored as `[longitude, latitude]`.

Detailed schemas: see `DATABASE_CONTEXT.md` and `DATABASE_SCHEMA.md`.

---

## 6. Authentication & Authorization

### Token architecture
- **Access token** — 15 min, signed with `JWT_SECRET`.
- **Refresh token** — 7 days, signed with `JWT_REFRESH_SECRET`, `tokenVersion` embedded.
- Web: stored in cookies (`token`, `refreshToken`) via `js-cookie`.
- Mobile: `AsyncStorage` keys `@access_token`, `@refresh_token`, `@user`.
- Redis tracks user activity / sessions.

### Middleware chain
```
authenticate → requireRole(roles?) → requireApiPermission(permission)
```

### `req.user` after `authenticate`
Full Mongoose User doc (with populated `role_id`, `employee_id`, `distributor_id`).

### `req.userContext` (flattened for authorization)
```js
{
  user_id, user_type, employee_type, employee_id, distributor_id,
  territory_assignments: { zone_ids, region_ids, area_ids, db_point_ids, all_territory_ids },
  facility_id, factory_store_id, db_point_id, product_segment
}
```

### ⚠ CRITICAL gotcha
When an entity is assigned to an **Employee record** (routes, outlets, attendance), query using `req.user.employee_id` — **NOT** `req.user._id`. This was the root cause of multiple production bugs.

### Endpoints
- `POST /api/v1/auth/login` → `{ accessToken, refreshToken, user }`
- `POST /api/v1/auth/refresh-token` → new access token
- `POST /api/v1/auth/logout` (auth required)
- `GET  /api/v1/auth/me`
- `POST /api/v1/auth/change-password`

**Public exceptions:** login, refresh-token, logout. All other endpoints require `authenticate + requireApiPermission`.

### Security rules
- Password hashing: bcryptjs.
- Account lockout: 3 failed logins → 5-minute lock (`lockUntil`).
- 401 → web forces redirect to `/login` (via axios interceptor + `middleware.ts`).
- 403 → "Insufficient Permission" UI.

See `AUTH-SPEC.md` for the reusable generic auth specification.

---

## 7. Permission Model

Three layers, role-scoped:

1. **API permissions** — `{resource}_{action}`, e.g. `products_create`, `demandorders_approve`. Junction: `role_api_permissions`.
2. **Page permissions** — e.g. `pgOrders`, `pgCollections`. Junction: `role_page_permissions`.
3. **Sidebar menu items** — Hierarchical (`parent_id`, `m_order`, `href` nullable for parents). Junction: `role_sidebar_menu_items`.

Permission naming format: `{resource}_{action}`. Every mutation endpoint must be guarded by `requireApiPermission`.

Common roles: System Admin, Sales Admin, ASM, RSM, ZSM, Order Management, Finance, Distribution, Accounts, Inventory Manager (Factory/Depot), Production Manager, Distributor, SO/DSR (field employee).

---

## 8. Critical Business Rules

1. **Unit discipline** — Primary uses CTN only; Secondary/mobile uses PCS only; conversion via `product.unit_per_case`.
2. **FIFO stock** — Distributor stock consumed oldest-batch-first; COGS = `consumed_pcs × (batch.unit_price_per_ctn / unit_per_case)`.
3. **Employee-linked queries** — Always use `req.user.employee_id` for field-assigned entities.
4. **All money in Decimal128** — never `Number`.
5. **All dates ISO in DB**, `dd/MM/yy` Bangladesh format in UI.
6. **Audit fields required** on every collection (`created_by`, `updated_by`, `created_at`, `updated_at`).
7. **Offer integrity** — BOGO/BUNDLE schedules track `order_bundles`/`scheduled_bundles`; breaking offers sets `is_offer_broken` with `break_info`.
8. **Credit entry auto-creation** — On Finance approval of DO: `credit = Σ discount_amount + Σ (free_qty × db_price)`, posted to customer ledger.
9. **GPS validation** — SO must be within 10 m of outlet (Haversine) to open shop actions; fraud scoring on every tracking session.
10. **No public registration** — Admin creates users only.

---

## 9. Key Workflows (state machines)

### Primary Demand Order
```
draft → submitted → asm_approved → rsm_approved → sales_admin_approved
  → forwarded_to_order_mgmt → forwarded_to_finance → finance_approved
  → forwarded_to_distribution → scheduling_in_progress → scheduling_completed
  → finance_approved_scheduling  (→ rejected at any approval step)
```

### Scheduling (per iteration)
```
pending_scheduling → scheduling_submitted → approved | rejected
```

### Delivery Chalan
```
generated → in_transit → received  (stock FIFO batches created on receive)
```

### Collections
```
draft → submitted → approved → posted  (or → returned)
```

### Secondary Order (mobile)
```
cart (local) → atomic transaction (validate + FIFO reduce + create order + visit update)
  → order_placed | INSUFFICIENT_STOCK error
```

### GPS Tracking Session
```
idle → starting → active → (paused) → stopping → completed  (auto-flagged if fraud_score ≥ 50)
```

---

## 10. Backend Run/Ops

### Environment (`backend/.env`)
```
NODE_ENV=production|development
PORT=5000         # (mobile docs reference 8080 in some dev setups — verify current config)
APP_VERSION=1.0.0

MONGODB_URI=mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin
MONGODB_URI_PRODUCTION=...

REDIS_URL=redis://localhost:6379

JWT_SECRET=...
JWT_REFRESH_SECRET=...
JWT_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d

FRONTEND_URL=http://localhost:3000
FRONTEND_URL_PRODUCTION=https://api.pusti-ht.com
```

### Startup
```bash
# Backend
cd backend && node server.js                # prod
npm run backend:dev                          # nodemon

# Frontend
cd frontend && npm run dev                   # port 3000
npm run build && npm start                   # prod

# Full stack dev
npm run dev                                  # runs both concurrently

# Docker
docker compose -f docker-compose.dev.yml up -d
```

### Mobile (Android)
```bash
# 1. Backend on 8080 (emulator uses 10.0.2.2:8080)
# 2. Metro
cd mobile && npx react-native start
# 3. Emulator + install
npx react-native run-android
```

**Cleartext HTTP enabled** in dev `AndroidManifest.xml` (must be off for production).
Test login: `superadmin` / `admin123`.

---

## 11. Frontend Conventions

- **Mobile-first**, Apple-inspired, dark-mode support, MUI theme in `theme/ThemeProvider.tsx`.
- **Layout:** full-width Navbar → (collapsible Sidebar + main) → half-height Footer.
- **CRUD pages:** Card / DataGrid toggle, pagination `[10, 25, 50, 100, 500]`, modal forms with `X` close + Save, action icons permission-gated.
- **Forms:** React Hook Form + Zod. For numeric inputs from HTML, use `z.preprocess((v) => Number(v), z.number())` — plain `z.number()` fails on string input.
- **Select/dropdown gotcha:** when backend returns populated refs (e.g. `sr_id: { _id, name }`), extract `_id` before passing to MUI `<Select value={...}>`.
- **Errors:** red toast top-center via `react-hot-toast`.
- **Dates:** display `dd/MM/yy`, store ISO.
- **Auth guard:** `middleware.ts` redirects unauthenticated users hitting protected paths to `/login`; authenticated users hitting `/login` redirect to `/dashboard`.
- **API client:** `frontend/src/lib/api.ts` (axios) — attaches `Authorization: Bearer` automatically, handles 401 by clearing tokens and redirecting.

---

## 12. Mobile App Status (Feb 2026)

**Completed:**
- Auth (JWT + refresh + AsyncStorage persistence).
- GPS tracking (session start/stop, batch upload, offline sync queue with exponential backoff).
- Fraud detection (backend-side scoring).
- **Open Shop flow (5/5 modules):** Shop Action hub (10 m proximity), Shop Closed, No Sales Reason (8 predefined reasons), Audit Inventory (category accordions, variance, drafts), Sales Module (catalog + offers carousel + cart + FIFO atomic order), Damage Claim (7 reasons, multi-item, drafts).
- Visit duration tracking (check_in/check_out, in-progress indicator).
- Trace Route screen with today's-visits batch summary.

**Pending:**
- iOS build.
- Geo-fenced attendance check-in, leave workflow.
- Brand coverage tracking UI.
- Photo/signature capture, HQ live tracking dashboard, historical playback.
- AI route optimization, target/achievement screens.

Key mobile services: `authService.ts`, `locationService.ts` (1-min interval, 10 m filter), `trackingAPI.ts`, `syncService.ts` (AsyncStorage queue, max 5 retries, 2/4/8/16/32 s backoff), `salesAPI.ts`, `damageClaimAPI.ts`.

---

## 13. KPIs & Formulas

```
PC%         = Orders / Visited Outlets × 100
LPC         = Order Lines / Orders
CCP         = Unique Categories / Orders
Coverage%   = Visited / Scheduled × 100
Drop Size   = Total Order Value / Orders
Achievement%= Actual / Target × 100
Haversine   = standard great-circle distance
Credit      = Σ discount_amount + Σ (free_qty × db_price)
Ledger Bal  = prev_bal + (type=='Debit' ? +amount : -amount)
```

---

## 14. Known Pitfalls & Lessons

1. **`req.user._id` vs `req.user.employee_id`** — field-assigned routes/outlets/attendance are linked to Employee, not User. Always use `employee_id`.
2. **Populated ref objects in Selects** — extract `_id` before feeding MUI `<Select>`.
3. **Zod + HTML inputs** — use `z.preprocess` to coerce string → number; bare `z.number()` rejects string input.
4. **Metro port 8081 conflict** — pick alternate or kill stale node processes.
5. **Android cleartext traffic** — `android:usesCleartextTraffic="true"` required in dev; rebuild APK after manifest change.
6. **Mock GPS always detected in emulator** — expected; don't treat as bug.
7. **Timezone in route day lookup** — use server-local day consistently (SAT vs SUN bugs seen).
8. **Decimal128 in math** — convert to Number carefully; never store money as `Number`.
9. **FIFO batch ordering** — sort by `received_date` ascending; reduce from head.
10. **Atomic transactions** — mongoose sessions required for order placement + stock reduction + visit update.

---

## 15. Testing

- Backend tests → `backend/tests/` only.
- Frontend tests → `frontend/tests/` only.
- **Never place test files in project roots.**
- Seed scripts under `backend/scripts/` and root `create-*.js` (users, roles, permissions, brands, products, sidebar menu).

Quick seeds:
```bash
node insert-superadmin.js
node create-roles.js
node create-api-permissions.js
node create-pg-permissions.js
node create-sidebar-menu.js
node create-role-pg-permissions.js
node create-roles-api-permissions.js
node create-role-sidebar-menu-items.js
node create-users.js
node create-brands.js
node create-products.js
```

---

## 16. Documentation Index (read on demand)

| Topic | File |
|---|---|
| Generic reusable auth spec | `AUTH-SPEC.md` |
| Primary sales deep dive | `PRIMARY_SALES_SESSION_START.md` |
| Secondary sales deep dive | `SECONDARY_SALES_SESSION_START.md` |
| Mobile app deep dive | `MOBILE_APPS_SESSION_START.md` |
| Backend architecture | `BACKEND_CONTEXT.md` |
| Frontend architecture | `FRONTEND_CONTEXT.md` |
| Database schema (full) | `DATABASE_CONTEXT.md`, `DATABASE_SCHEMA.md` |
| Modules overview | `MODULES_OVERVIEW.md` |
| Project specifications | `PROJECT_SPECIFICATIONS.md` |
| Tech spec | `TECHNICAL_SPECIFICATION.md` |
| BRD | `BRD.md` |
| Deployment | `DEPLOYMENT_GUIDE.md`, `DATABASE_DEPLOYMENT_GUIDE.md`, `PRODUCTION_DEPLOY_STEPS.md`, `DSR_PRODUCTION_DEPLOYMENT.md` |
| GPS tracking | `GPS_TRACKING_IMPLEMENTATION_STATUS.md`, `GPS_TRACKING_SESSION_3_COMPLETE.md`, `GPS_TRACKING_TESTING_GUIDE.md` |
| Offers | `OFFERS_COMPLETE.md`, `OFFERS_QUICK_REFERENCE.md`, `SECONDARY_OFFERS_*.md` |
| Collections | `COLLECTIONS_COMPLETE_IMPLEMENTATION.md`, `COLLECTIONS_APPROVAL_*.md`, `COLLECTIONS_RETURN_FEATURE.md` |
| Distribution scheduling | `DISTRIBUTION_COMPREHENSIVE_IMPLEMENTATION.md`, `DISTRIBUTION_SCHEDULING_COMPLETE.md`, `MOBILE_FIRST_SCHEDULING_IMPLEMENTATION.md` |
| Inventory / requisitions | `INVENTORY_SYSTEM_IMPLEMENTATION.md`, `REQUISITION_WORKFLOW_COMPLETE.md`, `DEPOT_TRANSFER_MODULE_COMPLETE.md` |
| Open Shop (mobile) | `OPEN_SHOP_IMPLEMENTATION_COMPLETE.md` |

---

## 17. Session-Start Checklist

- [ ] Confirm current working branch and `git status` clean.
- [ ] Identify whether task touches **Primary (CTN)**, **Secondary/Mobile (PCS)**, or both.
- [ ] Confirm which actor/role (`employee_type`, distributor, SO/DSR) is affected.
- [ ] For entity queries involving field staff → use `req.user.employee_id`.
- [ ] For new money fields → `Decimal128`.
- [ ] For new geospatial → `2dsphere` index + `[lng, lat]`.
- [ ] For new endpoints → add `api_permission` + junction, guard with `requireApiPermission`.
- [ ] For new pages → add `page_permission` + sidebar item + junction entries, role-gate in UI.
- [ ] For forms → RHF + Zod (with `z.preprocess` for numerics).
- [ ] For mobile async ops → add to `syncService` queue, handle offline gracefully.
- [ ] Run appropriate seed scripts if schema touches permissions/menu.

---

**End of Session Start Context**
