# Pusti Happy Times — Session Handover

> Read this first. Single source of evergreen facts for AI agents and devs joining a session. Companion docs: `PRODUCTION_DEPLOYMENT_RUNBOOK.md`, `BACKEND_CONTEXT.md`, `DATABASE_CONTEXT.md`, `FRONTEND_CONTEXT.md`.

## 1. Repo layout

```
pusti-happy-times/
├── backend/      Express 4 + Mongoose 7 REST API (~50k LOC)
├── mobile/       React Native 0.83 Android app  (~25k LOC)
├── frontend/     Next.js 14 (app router) + MUI 7 dashboard (~20k LOC)
├── docker-compose.yml          prod: mongo 7 + redis 7
├── docker-compose.dev.yml      dev:  mongo (:27019) + redis + mongo-express (:8082)
├── nginx-tkgerp.conf
├── PRODUCTION_DEPLOYMENT_RUNBOOK.md   ← canonical deploy steps
└── *.md (~80 historical feature docs — mostly cruft, ignore unless named in a context doc)
```

## 2. Backend (`backend/`)

**Stack:** Express 4.18, Mongoose 7.5, JWT (jsonwebtoken 9), Redis 4.6 (refresh tokens), socket.io 4.8, bcryptjs, helmet, cors, express-mongo-sanitize, hpp, express-validator.

**Layout** (`backend/src/`):
| Dir | Purpose |
|---|---|
| `config/` | DB + Redis connections |
| `middleware/` | `auth.js`, `roleCheck.js`, `errorHandler.js` |
| `models/` | 62 Mongoose schemas (one file per model, PascalCase) |
| `routes/` | API endpoints + inline express-validator + handlers |
| `routes/mobile/` | Mobile-specific endpoints |
| `services/` | Cross-route business logic |
| `seeds/`, `scripts/` | Idempotent data population scripts |
| `tests/` | Jest 29 + supertest + mongodb-memory-server |

**Routes:** all under `/api/v1/...`. Mobile endpoints under `/api/v1/mobile/...`. No `/backend/` prefix in production — Nginx proxies `/api/` directly to `:5000`.

**Auth chain:** `authenticate` → `requireRole(['SO','ASM',...])` → handler. Defined in `middleware/auth.js` and `middleware/roleCheck.js`.

**Access-token payload:**
```ts
{
  userId, username, roleId,
  user_type: "employee" | "distributor",
  // employee:
  employee_id, employee_type: "field" | "facility",
  territory_assignments: { area_ids, region_ids, zone_ids, db_point_ids, all_territory_ids },
  facility_id, factory_store_id,
  // distributor:
  distributor_id, distributor_name, db_point_id,
  product_segment: "BIS" | "BEV", skus_exclude,
  tokenVersion   // bump to invalidate all sessions
}
```

**Validation:** express-validator inline per route (`body()`, `query()`, `param()` + `validationResult(req)`). Example: `backend/src/routes/auth.js#L71-L83`.

**Error shape (always):**
```json
{ "success": false, "message": "...", "code": "STABLE_ENUM", "error": "...", "details": [...] }
```
Central middleware: `backend/src/middleware/errorHandler.js`. Mongoose CastError→404, dup key→409, ValidationError→400, JWT→401.

**Naming:** DB fields `snake_case`, JS vars `camelCase`. Routes files `kebab-case.js` (`demand-orders.js`), models `PascalCase.js`. Logic lives in route files (controllers are rare).

## 3. Mobile (`mobile/`)

**Stack:** RN 0.83.1, React 19.2, react-navigation 7 (NativeStack), axios 1.13, AsyncStorage 2.2, react-native-config 1.6, react-native-geolocation-service 5.3, mapbox 10.2 + leaflet 1.9.

**Layout** (`mobile/src/`):
| Dir | Purpose |
|---|---|
| `screens/` | All screens (`LoginScreen`, `HomeScreen`, `SalesModuleScreen`, `ShopActionScreen`, `TraceRouteScreen`, …) |
| `navigation/AppNavigator.tsx` | Single NativeStackNavigator; auth-gated branch |
| `services/` | `authService`, `syncService`, `trackingAPI`, `outletAPI`, etc. |
| `config/api.ts` | Central API config; **always import from here** — never hardcode hosts |
| `contexts/` | AuthContext, NotificationContext, SocketContext (no Redux/Zustand) |
| `hooks/` | `useOfflineSync`, etc. |
| `utils/logger.ts` | `logger.{log,info,warn,error,debug}` — silent in release |

**API config:** `mobile/src/config/api.ts` reads `Config.API_HOST` (`react-native-config`) and exports `API_BASE_URL = ${API_HOST}${API_BASE_PATH}` and `resolveAssetUrl(path)`. Default fallback `http://10.0.2.2:5000` (emulator).

**`.env` flow:**
- `mobile/.env` → active values (consumed at build time).
- `mobile/.env.production` → production values (`API_HOST=https://tkgerp.com`).
- Swap before release: `cp .env .env.local.bak && cp .env.production .env && ./gradlew assembleRelease && cp .env.local.bak .env`.
- **`android/app/build.gradle` MUST `apply from: dotenv.gradle`** (already wired) — without it `Config.*` is `undefined` at runtime and the app silently falls back to `10.0.2.2`.

**New screen procedure:**
1. Add `XxxScreen.tsx` under `screens/`.
2. Register in `mobile/src/navigation/AppNavigator.tsx`.
3. Add tile in `HomeScreen.tsx` (gated via the existing role helpers).
4. Reuse `services/api.ts` axios instance + `logger`.

**Auth:** `services/authService.ts`. Stores `accessToken` + `refreshToken` in AsyncStorage. Logout clears tokens, pending orders, carts.

**Offline sync:** `services/syncService.ts` + `hooks/useOfflineSync.tsx`. Queue persisted at AsyncStorage key `@sync_queue`. Item shape:
```ts
{ id, type, priority: 1|2, endpoint, method, data, timestamp, retryCount, maxRetries, lastError }
```
Auto-retries on connectivity (exponential 2s→60s). Currently used by tracking; pattern is reusable for any offline write.

**Permissions:** AndroidManifest declares `INTERNET`, `CAMERA`, `READ/WRITE_EXTERNAL_STORAGE`, `READ_MEDIA_IMAGES`, `ACCESS_FINE/COARSE_LOCATION`. Runtime requests are screen-local (PermissionsAndroid).

**Build:** Requires **JDK 21** (Gradle 9.0 rejects JDK 25). On stale-state failures, `rm -rf android/.gradle android/app/build android/app/.cxx android/build` instead of `./gradlew clean`.

## 4. Frontend (`frontend/`)

**Stack:** Next.js 14.2 (app router), React 18.3, MUI 7, axios, react-hook-form + zod, js-cookie.

**Layout** (`frontend/src/`):
| Dir | Purpose |
|---|---|
| `app/` | App-router pages (login, dashboard, admin, master, inventory, ordermanagement, …) |
| `lib/api.ts` | Central axios; auth interceptor + 401→`/auth/refresh` flow |
| `lib/types/` | Shared TS types |
| `contexts/` | Auth, Notification, Socket |
| `services/` | Per-module API helpers |
| `components/` | Reusable UI |

**API base:** dev `http://localhost:5000/api/v1`, prod `/api/v1` (Nginx proxy). Tokens in cookies (js-cookie).

**Sample feature module:** `frontend/src/app/ordermanagement/secondaryorders/page.tsx`.

## 5. Database

| Env | URI |
|---|---|
| Dev | `mongodb://admin:password123@localhost:27019/pusti_happy_times?authSource=admin` |
| Prod | `mongodb://pusti_app:<pwd>@localhost:27017/pusti_happy_times?authSource=pusti_happy_times` |

(Dev port 27019 to avoid local mongod collision.)

**~48 collections.** Key groupings — Auth: `users`, `roles`, `api_permissions`, `page_permissions`, `sidebar_menu_items`. Master: `products`, `brands`, `categories`, `territories`, `facilities`, `employees`, `distributors`. Geo: `routes`, `outlets`, `outlet_types`, `outlet_channels`. Inventory: `distributor_stock`, `depot_stock`, `inventory_requisitions`, `requisition_chalans`, `delivery_chalans`, `delivery_invoices`. Orders: `demand_orders`, `secondary_orders`, `collections`, `customer_ledger`. Tracking: `tracking_sessions`, `location_points`. Ops: `outlet_visits`, `damage_claims`, `dsr`, `attendance`.

**Conventions (NON-NEGOTIABLE):**
1. **Soft delete:** `active: boolean` (default `true`); list/get queries filter `{ active: true }`.
2. **Audit fields:** `created_at`, `updated_at`, `created_by` (→`User._id`), `updated_by`.
3. **Decimal128** for money/qty (DistributorStock, DepotStock).
4. **GeoJSON** on `Outlet.location = { type: "Point", coordinates: [lng, lat] }` with `2dsphere` index. Pre-save hook syncs to legacy `lati/longi`.
5. **Bilingual:** `*_bangla` suffix for Bangla strings.
6. **Compound indexes** where uniqueness is per-tenant (e.g. `{ distributor_id, sku }`).
7. **No hard deletes.** No cascade triggers.

## 6. Auth & RBAC

**Roles:** SuperAdmin, SalesAdmin, SO, ASM, RSM, ZSM, Distributor, Production, Inventory, Collection, DSR (full list in `roles` collection).

**User types:**
- `employee` → `employee_type: "field" | "facility" | "system_admin"`.
  - **field** ⇒ requires `territory_assignments.{zone|region|area|db_point}_ids` populated; `User.validateRoleContext` enforces SO/ASM need `area_ids`, RSM needs `region_ids`, ZSM needs `zone_ids`.
  - **facility** ⇒ requires `facility_id` (Inventory→Depot, Production→Factory).
- `distributor` → `distributor_id` populated; `product_segment` constrains catalog.

**Login** `POST /api/v1/auth/login` returns `{ accessToken, refreshToken, user: { id, username, role, context, ... } }` where `context` matches token payload (§2). Validation pattern: `User.validateRoleContext(role, employee, facility)` in `backend/src/models/User.js#L326`.

## 7. Build & deploy

| Area | Dev | Prod |
|---|---|---|
| backend | `npm run dev` (nodemon) | PM2 (`backend`); `/api/v1/health` |
| frontend | `npm run dev` (:3000) | `npm run build && npm start`; PM2 (`frontend`) |
| mobile | `npm run android` (Metro) | swap `.env.production`→`.env`, JDK 21, `./gradlew assembleRelease` |

**Production host:** `tkgerp.com`. Nginx routes `/api/`, `/socket.io/`, `/uploads/` → `:5000`; `/images/` → alias `/root/apps/pusti-happy-times/backend/public/images/`; `/` → `:3000`. Full procedure in `PRODUCTION_DEPLOYMENT_RUNBOOK.md`.

## 8. Gotchas (read this — saves hours)

1. **Mobile `/routes/my-route` matches by `Employee._id`, NOT `User._id`.** Seed scripts must set `route.sr_assignments.sr_X.sr_id = employee._id`.
2. **SO/ASM login fails with `ROLE_CONTEXT_INVALID` if `employee.employee_type` ≠ `"field"` or `territory_assignments.area_ids` is empty.** Always seed both.
3. **`react-native-config` requires `apply from: dotenv.gradle`** in `android/app/build.gradle`. Without it, release APK silently uses the `10.0.2.2:5000` fallback regardless of `.env`.
4. **APK is older than `.env`** is the #1 "Network Error" cause — always check `stat .env app-release.apk`.
5. **`./gradlew clean` crashes on stale CMake state** (post `npm ci`). Use `rm -rf android/.gradle android/app/build android/app/.cxx android/build` instead.
6. **JDK 25 is incompatible with Gradle 9.0.** Use JDK 21: `export JAVA_HOME=$(readlink -f /usr/lib/jvm/java-21-openjdk)`.
7. **Seed scripts use the raw MongoDB driver** (not Mongoose) for users/employees to bypass strict validation on legacy fields. Don't "fix" this.
8. **DistributorStock is FIFO by `batches[].received_at`.** Use `addStockFIFO()` / `reduceStockFIFO()` model methods — don't mutate `batches[]` directly.
9. **Outlet has dual coordinates** (`location.coordinates` GeoJSON + legacy `lati/longi`). Pre-save hook syncs them; always read from `location.coordinates`.
10. **No Redux/Zustand on mobile.** Auth/cart/offline lives in Context + AsyncStorage.
11. **Frontend stores tokens in cookies (js-cookie); mobile in AsyncStorage.** Don't mix.
12. **Nginx serves `/images/` from disk** (filesystem alias) — backend route handlers don't see those requests.

## 9. Common task recipes

**New backend endpoint** (e.g. `GET /api/v1/widgets/:id`):
1. Add model `backend/src/models/Widget.js` (audit fields + `active`).
2. Create `backend/src/routes/widgets.js`: `router.get("/:id", authenticate, requireRole(['Admin']), [param('id').isMongoId()], async (req,res,next) => { ... })`.
3. Mount in `backend/src/app.js`: `app.use("/api/v1/widgets", require("./routes/widgets"))`.
4. Add Jest test in `backend/tests/widget.test.js`.

**New mobile screen** (see §3 procedure).

**New role-gated mobile feature:** add helper in `mobile/src/utils/roles.ts` style (mirror `shouldShowTrackButton`); gate the Home tile and the screen entry.

**Seeding test data on prod:** use `backend/scripts/seed-*.js` patterns — idempotent, CLI args, raw driver. Never run destructive operations without `--reset` opt-in.

## 10. Test infrastructure

- **Backend:** Jest 29 + supertest 6 + mongodb-memory-server. ~6 spec files in `backend/tests/`. Run: `cd backend && npm test`.
- **Frontend / mobile:** no significant suite yet. Smoke-test by hand against emulator + staging.

## 11. Repo norms

- **Linting:** ESLint + Prettier configured per package; no enforced pre-commit hook.
- **Commits:** lowercase summary; no enforced convention.
- **Docs to trust:** `PRODUCTION_DEPLOYMENT_RUNBOOK.md`, `BACKEND_CONTEXT.md`, `DATABASE_CONTEXT.md`, `FRONTEND_CONTEXT.md`, `ROLE_BASED_CONTEXT_VALIDATION.md`, `MOBILE_APPS_SESSION_START.md`. Most other top-level `*.md` files are historical — verify before relying on them.
- **Don't:** add new top-level `*_SUMMARY.md` files for routine changes; add to existing context docs or this file instead.

## 12. Quick-start session checklist

1. Read this file + the relevant context doc from §11.
2. `git status && git log --oneline -5` — know current state.
3. If touching mobile: confirm `mobile/.env` matches the target backend (dev vs prod).
4. If touching auth/RBAC: re-read §6 and `validateRoleContext` (`backend/src/models/User.js#L326`).
5. If seeding: use raw-driver pattern; emit a summary block with the credentials/IDs you created.
6. Run lints/tests for any package you touched before declaring done.
