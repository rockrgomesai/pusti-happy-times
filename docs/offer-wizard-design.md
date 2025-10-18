# Offer Wizard Design Document

**Product:** Pusti Happy Times Offer Management  
**Feature:** Offer Creation Wizard  
**Author:** GitHub Copilot  
**Date:** 15 Oct 2025  
**Version:** 1.0 (Draft for review)

---

## 1. Executive Summary
- Deliver a four-step guided experience for trade marketers to create, review, and launch complex promotional offers across distributors.
- Translate the existing visual specification into a build-ready blueprint covering UX flows, data contracts, validations, automation, and rollout strategy.
- Ensure scalability to 14 offer archetypes while maintaining consistent patterns for search, filtering, previews, and calculations.

## 2. Goals & Success Criteria
- **Single wizard flow** enabling completion of all mandatory data within one session or draft-save resumption.
- **90%+ validation compliance** at form submission, with inline feedback preventing server-side rejects.
- **Offer activation SLA**: successful activation within <5 seconds for offers scoped to ≤1,000 distributors.
- **Analytics visibility**: estimation panels and audit logs available for every created offer.

## 3. Scope & Non-Goals
### In Scope
- UX, backend, and data design for wizard steps, scope filtering, and rules configuration across all documented offer types.
- Draft/save, preview, export, validation, notification, and overlap-warning behaviors.
- Supporting APIs for search, counts, configurations, and offer persistence.

### Out of Scope
- Distributor-facing storefront UI (covered separately).
- Historical migration of legacy offers.
- Incentive payout engines beyond rebate calculation blueprint.

## 4. Stakeholders & Personas
| Persona | Goals | Pain Points | Success Signals |
|---------|-------|-------------|-----------------|
| Trade Marketing Manager | Launch targeted promotions quickly | Manual data entry, scope complexity | Draft-to-live cycle < 1 day, accurate scope |
| Regional Sales Manager | Ensure eligible distributors, monitor uptake | Limited visibility into eligibility | Clear eligibility summary, export list |
| Distributor | Receive fair offers & freebies automatically | Duplicate/conflicting offers | Accurate cart application, no manual steps |
| Finance / Compliance | Track discount liability, ensure approvals | Missing audit & overlaps | Validated cost impact, approval checkpoints |

## 5. Assumptions & Constraints
- All timestamps stored in BD timezone (UTC+6) with no daylight saving adjustments.
- Offer name uniqueness enforced at database level with case-insensitive index.
- Product, distributor, and geography catalogs exposed via existing master data services.
- Wizard is mobile-first, responsive down to 1280px, with keyboard navigation compliance.
- Concurrency: maximum 5 simultaneous edits per offer draft enforced via optimistic locking.

## 6. End-to-End User Journey
1. **Entry**: user selects “Create Offer” in back-office; wizard opens at Step 1, status defaults to Active.
2. **Progressive entry**: user fills Basic info → Scope distributors → Offer type → Configure rules.
3. **Review**: aggregated summary screen with edit anchors for each section.
4. **Submit**: create live offer or save draft; backend validates, calculates overlaps, triggers notifications.
5. **Post-creation**: offer visible in catalog (if active), analytics and audit entries recorded.

Key navigation principles:
- Progress bar reflects current step; preceding steps remain clickable for edits.
- “Next” disabled until required fields satisfied; “Back” always available without side-effects.
- Draft save possible at any step; preview available once offer type chosen.

## 7. Wizard Step Requirements
### 7.1 Step 1 – Basic Information
- **Fields**: Offer name (3–100 chars, unique), optional description (≤500 chars with live counter), start/end date pickers with time selectors and computed duration, status toggle (Active/Inactive) with warning banner.
- **Validations**: end date/time must be > start date/time; active offers require future end date; uniqueness check debounced on blur.
- **Data bindings**: persisted as `offer_name`, `offer_description`, `start_date`, `end_date`, `active`.

### 7.2 Step 2 – Scope Distributors
- **Mandatory zone selection** with select-all/clear, search, cards showing DB counts, selection totals.
- Expandable panels for **Regions, Areas, DB Points, Distributors** with include/exclude modes, search, pagination, and chips summarizing selections.
- Real-time **eligibility summary** (zones, regions, areas, DB points, distributor count) and actions `[Export List]`, `[Recalculate]`.
- Supports multi-level overrides (e.g., include zones, exclude region, re-include distributors).

### 7.3 Step 3 – Offer Type
- Grid of 14 cards grouped by theme; each card displays icon, headline, description, `[Select]` button.
- Only one active selection; type persisted as enum `offer_type`.
- “Next” disabled until selection made.

### 7.4 Step 4 – Configure Rules
- Common header: selected offer type, segment multi-select (at least one), product search surface as appropriate.
- Dynamic form inserted per offer type template (see Section 8).
- Reusable controls: searchable product lists, quantity inputs, toggles for multiple application, per-order caps, value previews.
- Inline calculators & charts update on change, referencing product price data.

### 7.5 Review & Create Screen
- Read-only recap grouped into Basic Info, Scope, Rules, Estimated Impact, Warnings.
- Inline `[Edit]` links return user to relevant step retaining state.
- Validation checklist, overlap warnings (with priority resolution description), acknowledgement checkboxes prior to final submission.
- Actions: `[Back]`, `[Save as Draft]`, `[Create Offer & Activate]`.

### 7.6 Cross-step Features
- Draft auto-save every 60 seconds plus explicit action.
- Unsaved-change guard when attempting to exit wizard.
- Keyboard shortcuts: Alt+←/→ navigate steps when allowed, Enter on primary action.

## 8. Offer Type Templates
Each template comprises purpose, input controls, business logic, calculations, persistence fields, and cart behavior. Key formulas use price `p`, quantity `q`, discount `d`, free units `f`.

### 8.1 Tiered Pricing
- **Purpose**: volume-based price breaks on selected SKUs.
- **Inputs**: product selection (all/segment/specific), ordered list of tiers (`from_qty`, `to_qty`, `unit_price`, optional `% discount note`).
- **Rules**: tiers must cover ℕ without gaps; last tier `to_qty` can be ∞.
- **Calculation**: price per unit applied by highest qualifying tier; savings = $(p_{base} - p_{tier}) × q$.
- **Persistence**: `tiered_rules` array with audit metadata.

### 8.2 BOGO – Same SKU
- **Inputs**: qualifying products, `buy_qty`, `get_qty`, application mode (single/multiple), max free units, auto-add toggle.
- **Logic**: qualifying sets = $\	ext{floor}\left(\dfrac{q}{buy\_qty}\right)$; freebies = $\	ext{min}(sets × get\_qty, cap)$.
- **Cart**: free lines auto-added when toggle on; else prompt user confirmation.

### 8.3 BOGO – Different SKU
- **Inputs**: qualifier products with min qty, qualifier logic (AND/OR), reward products with free qty, distribution mode (all/choice), value cap per item, repetition toggle.
- **Validation**: reward value cap ≥ cheapest reward price.
- **Calculation**: freebies per set; ensure OR logic counts unique qualifying SKUs.

### 8.4 BOGO – Category
- **Inputs**: qualifier category (single/multiple), required qty, reward category, free qty, max value cap, distributor selection mode, per-order limit.
- **UX**: reward selection modal or dropdown when distributor chooses.
- **Rule**: each block of required qty grants free items respecting cap.

### 8.5 Mix & Match
- **Inputs**: eligible catalog (all/segment/category/specific), bundle size, bundle price, per-product limits, per-order bundle cap, value warning toggles.
- **Value Guard**: compare bundle price vs sum of chosen items; show warning when bundle cost ≥ individual cost.

### 8.6 N-for-৳X Pack
- **Inputs**: product pool, pack size, pack price, selection constraints (any/one-of-each/all), per-product limit, per-order max packs.
- **Formula**: savings = $(\sum p_i) - pack\_price$ for chosen mix; show negative savings alert.

### 8.7 Spend Threshold
- **Modes**: single threshold or tiered; reward types (percent, fixed, free gift); optional caps.
- **Single**: minimum order value `min_amount`, reward, cap.
- **Tiered**: ordered tiers with `from`, `to`, reward type/value, optional cap.
- **Messaging**: near-threshold prompt when `$current < min_amount$`.

### 8.8 Cross-SKU Uplift
- **Inputs**: qualifier list (min qty), logic (AND/OR), reward products, discount type/value, per-qualifier reward limit, per-order cap.
- **Formula**: discounted units per qualifier = `qualifier_count × unlocked_units`.

### 8.9 Fixed Bundle
- **Inputs**: bundle name/description, product items with fixed quantity, bundle price, max bundles per order, inventory tracking mode, optional custom SKU.
- **Preview**: formatted card showing contents, strikethrough regular price, savings.

### 8.10 Slab Discount
- **Inputs**: slabs defined by order value ranges with discount %, optional max discount.
- **Behavior**: apply discount associated with slab containing order subtotal; enforce cap.

### 8.11 Free Goods by UOM
- **Inputs**: product UOM mapping, bulk purchase quantity, free smaller UOM quantity, application mode, free-unit cap, UOM locking toggle.
- **Rules**: only specified UOM qualifies; calculates freebies per bulk unit.

### 8.12 Launch Discount
- **Inputs**: new products, discount type/value, launch duration (from product launch or date range), per-distributor limits, badges, notifications, post-launch behavior.
- **Automation**: schedule activation per product launch date; auto expiry tasks remove discount and badges.

### 8.13 Clearance Discount
- **Inputs**: clearance products with stock/expiry metadata, discount type/value, end condition (date/stock/both), stock visibility, per-distributor limit, urgency messaging.
- **Automation**: stop offer when stock zero or end date reached; archive offer.

### 8.14 Growth/Target Rebate
- **Inputs**: rebate period (fixed/rolling), scope, target type (single/tiered), rebate calculation (percent/fixed), payout method, settlement timeline, visibility settings, eligibility criteria.
- **Analytics**: track progress vs target, send alerts at 80% attainment.
- **Formula** (single target): rebate = $\min\left(\dfrac{d}{100} × sales, cap\right)$ when sales ≥ target.

## 9. Data Model & Persistence
### 9.1 Core Entities
- `offers`: id, offer_name, description, start_date, end_date, status, offer_type, active_flag, created_by, updated_by, timestamps.
- `offer_segments`: offer_id, product_segment, required (≥1 entry).
- `offer_scope_nodes`: offer_id, level (zone/region/area/db_point/distributor), selection_mode (all/include/exclude), node_id, metadata, priority order.
- `offer_rules`: offer_id, rule_type, payload (JSONB), version, checksum.
- `offer_drafts`: offer_id, state_snapshot (JSONB), expires_at.
- `offer_audits`: offer_id, action, actor, payload, occurred_at.

### 9.2 Rule Payload Schemas (JSONB)
Provide per-type schema definitions to keep primary tables lean. Sample for tiered pricing:
```json
{
  "products": ["COL-500", "OJ-1000"],
  "tiers": [
    {"from": 1, "to": 99, "unitPrice": 50},
    {"from": 100, "to": 499, "unitPrice": 48}
  ],
  "basePrice": 50,
  "applyTo": "specific-products"
}
```

### 9.3 Indices & Performance
- Composite index on `(active_flag, start_date, end_date)` for overlap queries.
- GIN index on `offer_scope_nodes.node_id` for lookup by distributor.
- Partial unique index on `(offer_name)` where `deleted_at IS NULL`.
- Check constraints ensuring JSON schema conformity (via PostgreSQL `CHECK` with JSON schema validation or application-level guard).

## 10. API Design
| Endpoint | Method | Purpose | Notes |
|----------|--------|---------|-------|
| `/api/offers/drafts` | POST | Create/update draft snapshot | Idempotent; request includes step data |
| `/api/offers/validate-name` | GET | Check name uniqueness | Debounced client call |
| `/api/offers/scope/nodes` | GET | Fetch zones/regions/areas/distributors with filters | Supports search, pagination |
| `/api/offers/scope/eligibility` | POST | Calculate counts based on selections | Returns totals & export download link |
| `/api/offers/products/search` | GET | Product lookup (segment/category filters) | Returns pricing metadata |
| `/api/offers/preview` | POST | Generate distributor-facing preview | Requires complete payload |
| `/api/offers/overlap` | POST | Detect overlapping offers | Returns conflicts with priority info |
| `/api/offers` | POST | Persist offer & activate/draft | Transactional write across tables |
| `/api/offers/{id}` | PUT | Update draft or active offer | Respect lock & audit |
| `/api/offers/{id}/export` | GET | Download eligibility list | Triggers async job for large sets |
| `/api/offers/{id}/audit` | GET | Audit trail listing | Paginated |

Authentication via JWT; authorization includes `offer:create`, `offer:edit`, `offer:approve` scopes.

## 11. Validation & Business Rules
- **Date**: `start_date < end_date`; active offers must start ≤ now + 24h tolerance.
- **Scope**: at least one zone; include/exclude rules must not net zero eligible distributors (warn, block if zero).
- **Products**: ensure catalog items active & in stock for timeline; block if discontinued (except clearance).
- **Overlap**: highlight conflicting active offers for same SKUs/segments/time; enforce manual override with priority order.
- **Financial caps**: validate max discounts ≤ configured thresholds from finance policy.
- **Draft expiry**: auto-purge drafts older than 30 days.

## 12. Notifications & Automation
- Activate triggers event `offer.created` (payload includes scope summary) consumed by catalog service.
- Launch/clearance/rebate schedules registered with job scheduler (e.g., BullMQ) for activation/expiry reminders.
- Email/push templates for:
  - Offer activation summary to stakeholders.
  - Distributor launch announcement.
  - Clearance countdown (7 days remaining).
  - Rebate progress (weekly) and 80% attainment alert.
- Webhook integration for ERP inventory adjustments when fixed bundles sold.

## 13. UX, Accessibility & Localization Guidelines
- Color-coded progress bar with `aria-current` attributes per step.
- All inputs have labels, descriptions, and inline error messaging using WCAG AA contrast.
- Keyboard navigation: tab order matches visual hierarchy; multi-select lists support arrow navigation.
- Number inputs enforce locale-specific formatting but persist as normalized numbers.
- Currency displayed as `৳` with thousands separators; plan for future multi-currency via configuration.

## 14. Security, Permissions & Auditing
- Permission matrix:
  - `offer:read`, `offer:create`, `offer:scope:manage`, `offer:activate`, `offer:approve`, `offer:export`.
- Scope filters limited by user territory; e.g., regional manager cannot select zones outside jurisdiction.
- All actions recorded in `offer_audits` including diff snapshots for rule payloads.
- Sensitive exports require signed URLs expiring in 24h.

## 15. Performance & Scalability
- Scope selection lists use server-side pagination (default 20) with aggregator queries using indexed filters.
- Eligibility recalculation caches intermediate results by selection hash; fallback to async job for >5k distributors.
- Offer creation transaction limited to <2s by pre-validating heavy computations in preview stage.
- Calculators (charts, savings) computed client-side using fetched price metadata; complex analytics (estimated impact) delegated to backend microservice.

## 16. Draft & Activation Lifecycle
| State | Description | Allowed Transitions |
|-------|-------------|---------------------|
| Draft | Partial data saved, not visible to distributors | Draft → Draft (edit), Draft → Ready for approval |
| Pending Approval (optional) | Requires approver sign-off | Pending → Approved/Rejected |
| Active | Visible and applied in carts | Active → Scheduled Disable (on end date) |
| Expired | End date passed | None (read-only) |
| Archived | Manually retired | Archived → Draft (clone) |

Cloning active/expired offers creates new draft with timestamped suffix.

## 17. Analytics & Reporting
- Estimated impact panel draws on historical sales averages per distributor stored in analytics warehouse.
- Track KPI: uptake rate, free units distributed, discount spend, distributor coverage.
- Event schema (`offer_event`) capturing state changes, scope, and rule payload pointer for BI ingestion.

## 18. Implementation Plan & Milestones
1. **Phase 0 – Foundations (2 weeks)**: finalize API contracts, set up feature flag, create database migrations, build master data adapters.
2. **Phase 1 – Wizard Shell (3 weeks)**: implement navigation, draft management, basic validation.
3. **Phase 2 – Scope & Type Modules (4 weeks)**: build scope selectors, eligibility API, offer type card grid.
4. **Phase 3 – Rule Templates (6 weeks)**: deliver templates in priority order (Tiered Pricing, BOGO, Mix & Match, Spend Threshold, remainder).
5. **Phase 4 – Review, Notifications, Analytics (3 weeks)**: review screen, overlap detection, notification hooks, estimated impact.
6. **Phase 5 – QA & Rollout (2 weeks)**: end-to-end testing, performance hardening, user training, phased launch by territory.

## 19. Risks & Mitigation
| Risk | Impact | Mitigation |
|------|--------|------------|
| Complex rule payloads hard to validate client-side | Submission failures | Shared JSON schema validation library across FE/BE |
| Eligibility recalculation slow for large scopes | Poor UX | Async recalculation with loading states, caching, chunked export |
| Overlapping offers cause conflict in cart | Revenue leakage | Priority rules, conflict detection with manual override |
| Product price changes break savings previews | Misinformation | Real-time price fetch with fallback warning if stale >24h |
| Notification spam to distributors | Opt-out, fatigue | Throttle notifications, combine announcements per distributor |

## 20. Open Questions & Dependencies
1. Should approval workflow be mandatory (dual-control) or optional per offer type?
2. Are finance caps (e.g., max % discount) global or segment-specific?
3. How should overlapping offers prioritize in cart (highest discount vs configured priority)?
4. Do we need multilingual support at launch (Bangla) or is English sufficient?
5. Can analytics service deliver historical averages in real time, or do we precompute nightly?
6. Are there compliance requirements for audit retention beyond 7 years?

Dependencies: master data APIs, notification service, analytics warehouse, job scheduler, permissions service.

## Appendix A – Sample Offer Creation Payload
```json
{
  "offer": {
    "name": "Summer BOGO Cola Promotion",
    "description": "Buy 6 get 1 free on cola",
    "startDate": "2025-06-15T00:00:00+06:00",
    "endDate": "2025-09-30T23:59:59+06:00",
    "status": "active",
    "type": "bogo_same_sku"
  },
  "segments": ["BEV"],
  "scope": {
    "zones": {"mode": "include", "ids": ["ZONE-DHK", "ZONE-CTG"]},
    "regions": {"mode": "all"},
    "areas": {"mode": "all"},
    "dbPoints": {"mode": "all"},
    "distributors": {"mode": "include", "ids": []}
  },
  "rules": {
    "products": ["COL-500", "LEM-500"],
    "buyQuantity": 6,
    "freeQuantity": 1,
    "applyMode": "multiple",
    "maxFreeUnits": 10,
    "autoAddFreeItems": true
  }
}
```

---

**Document Status:** Draft – pending stakeholder review and sign-off.
