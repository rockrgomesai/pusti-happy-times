# User Form UI Sketch

## Overview

This document provides a visual sketch of the User Management UI with role-based context assignments.

---

## 🎨 User Form Dialog Layout

```
┌─────────────────────────────────────────────────────────┐
│ ✕  Create New User                                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  User Credentials                                       │
│  ┌───────────────────────────────────────────────────┐ │
│  │ Username *                                        │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │ Email *                                           │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │ Password *                                        │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  Role & Type                                            │
│  ┌───────────────────────────────────────────────────┐ │
│  │ Role *                        ▼                   │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │ User Type *                   ▼                   │ │
│  │ ☑ Employee  ☐ Distributor                        │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  Employee Assignment                                    │
│  ┌───────────────────────────────────────────────────┐ │
│  │ Select Employee *             ▼                   │ │
│  │ (Autocomplete with search)                        │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  ℹ️  Employee Type: field                               │
│      Designation: Zonal Sales Manager                   │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  [Dynamic Section Based on Role - See Below]            │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  ☑ Active                                               │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                             [Cancel]  [Create] ▶        │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 Dynamic Sections by Role

### Role: ZSM (Zonal Sales Manager)

```
┌─────────────────────────────────────────────────────────┐
│  Territory Assignment (ZSM)                             │
│  ┌───────────────────────────────────────────────────┐ │
│  │ Zone *                        ▼                   │ │
│  │ ○ Zone 1 (z1)                                     │ │
│  │ ○ Zone 2 (z2)                                     │ │
│  │ ○ Zone 3 (z3)                                     │ │
│  │ ○ Zone 4 (z4)                                     │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘

✅ Shows: Zone dropdown only
📦 Saves: { zone_ids: ['zone_id'] }
```

### Role: RSM (Regional Sales Manager)

```
┌─────────────────────────────────────────────────────────┐
│  Territory Assignment (RSM)                             │
│  ┌───────────────────────────────────────────────────┐ │
│  │ Zone *                        ▼                   │ │
│  │ ● Zone 1 (z1)             [Selected] ✓           │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │ Region *                      ▼                   │ │
│  │ ○ Region r1 (z1r1)                                │ │
│  │ ○ Region r2 (z1r2)                                │ │
│  │ ○ Region r3 (z1r3)                                │ │
│  │ ○ Region r4 (z1r4)                                │ │
│  └───────────────────────────────────────────────────┘ │
│  💡 Cascades: Regions filtered by Zone 1              │
└─────────────────────────────────────────────────────────┘

✅ Shows: Zone → Region (cascading)
📦 Saves: { zone_ids: ['zone_id'], region_ids: ['region_id'] }
```

### Role: ASM / SO (Area Sales Manager / Sales Officer)

```
┌─────────────────────────────────────────────────────────┐
│  Territory Assignment (ASM)                             │
│  ┌───────────────────────────────────────────────────┐ │
│  │ Zone *                        ▼                   │ │
│  │ ● Zone 1 (z1)             [Selected] ✓           │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │ Region *                      ▼                   │ │
│  │ ● Region r1 (z1r1)        [Selected] ✓           │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │ Area *                        ▼                   │ │
│  │ ○ Area a1                                         │ │
│  │ ○ Area a2                                         │ │
│  │ ○ Area a3                                         │ │
│  │ ○ Area a4                                         │ │
│  └───────────────────────────────────────────────────┘ │
│  💡 Cascades: Areas filtered by Region r1             │
└─────────────────────────────────────────────────────────┘

✅ Shows: Zone → Region → Area (full cascade)
📦 Saves: {
    zone_ids: ['zone_id'],
    region_ids: ['region_id'],
    area_ids: ['area_id']
  }
```

### Role: Inventory

```
┌─────────────────────────────────────────────────────────┐
│  Facility Assignment (Inventory)                        │
│  ┌───────────────────────────────────────────────────┐ │
│  │ Depot *                       ▼                   │ │
│  │ ○ Dhaka Depot (Depot)                             │ │
│  │ ○ Chittagong Depot (Depot)                        │ │
│  │ ○ Sylhet Depot (Depot)                            │ │
│  └───────────────────────────────────────────────────┘ │
│  💡 Only Depot facilities shown                        │
└─────────────────────────────────────────────────────────┘

✅ Shows: Depot dropdown (filtered)
📦 Saves: { facility_id: 'depot_id' }
🔒 Validation: Must be Depot type
```

### Role: Production

```
┌─────────────────────────────────────────────────────────┐
│  Facility Assignment (Production)                       │
│  ┌───────────────────────────────────────────────────┐ │
│  │ Factory *                     ▼                   │ │
│  │ ○ Dhaka Factory (Factory)                         │ │
│  │ ○ Chittagong Factory (Factory)                    │ │
│  └───────────────────────────────────────────────────┘ │
│  💡 Only Factory facilities shown                      │
└─────────────────────────────────────────────────────────┘

✅ Shows: Factory dropdown (filtered)
📦 Saves: { facility_id: 'factory_id' }
🔒 Validation: Must be Factory type
```

### Other Roles (SuperAdmin, SalesAdmin, etc.)

```
┌─────────────────────────────────────────────────────────┐
│  (No territory or facility assignment required)         │
│                                                         │
│  ☑ Active                                               │
└─────────────────────────────────────────────────────────┘

✅ Shows: No additional fields
📦 Saves: Basic user info only
```

---

## 🔄 User Flow Examples

### Example 1: Creating ZSM User

```
Step 1: Fill Basic Info
┌─────────────────────┐
│ Username: zsmdhaka  │
│ Email: zsm@co.com   │
│ Password: ******    │
└─────────────────────┘

Step 2: Select Role & Type
┌─────────────────────┐
│ Role: ZSM           │
│ Type: Employee      │
└─────────────────────┘

Step 3: Select Employee
┌───────────────────────────────────┐
│ Employee: EMP001 - Ahmed Khan     │
│ (Zonal Sales Manager)             │
└───────────────────────────────────┘

Step 4: Territory Assignment Appears
┌─────────────────────┐
│ Zone: Zone 1 (z1)   │  ← Only Zone shown
└─────────────────────┘

Step 5: Submit
→ Creates User
→ Updates Employee with: { zone_ids: ['z1_id'] }
→ User can login and access Zone 1 data
```

### Example 2: Creating ASM User

```
Step 1-3: Same as above

Step 4: Territory Assignment (3 Levels)
┌─────────────────────────────────────┐
│ Zone: Zone 1 (z1)                   │
│                                     │
│ Region: Region r1 (z1r1)            │  ← Loads after Zone
│                                     │
│ Area: Area a1                       │  ← Loads after Region
└─────────────────────────────────────┘

Step 5: Submit
→ Creates User
→ Updates Employee with: {
    zone_ids: ['z1_id'],
    region_ids: ['r1_id'],
    area_ids: ['a1_id']
  }
```

### Example 3: Creating Inventory User

```
Step 1-3: Same as above (select Inventory role)

Step 4: Facility Assignment Appears
┌───────────────────────────────────┐
│ Depot: Dhaka Depot (Depot)        │  ← Only Depots shown
└───────────────────────────────────┘

❌ If Factory selected: Error!
"Inventory role must be assigned to a Depot facility"

Step 5: Submit
→ Creates User
→ Updates Employee with: { facility_id: 'depot_id' }
```

---

## 📱 Responsive Behavior

### Desktop (>900px)

```
┌─────────────────────────────────────┐
│  Dialog Width: 900px (maxWidth md) │
│  Fields: Full width                │
│  Autocomplete: Shows full labels   │
└─────────────────────────────────────┘
```

### Tablet (600-900px)

```
┌──────────────────────────────┐
│  Dialog: 90% screen width    │
│  Fields: Stack vertically    │
└──────────────────────────────┘
```

### Mobile (<600px)

```
┌────────────────────┐
│  Dialog: Fullscreen│
│  Compact spacing   │
│  Larger touch areas│
└────────────────────┘
```

---

## 🎯 Validation States

### Success States

```
✅ Zone selected
   ┌─────────────────────┐
   │ ● Zone 1        ✓   │
   └─────────────────────┘

✅ All required fields filled
   [Create] ← Enabled, primary color
```

### Error States

```
❌ Missing required field
   ┌─────────────────────┐
   │ Zone *              │ ← Red border
   │ This field required │ ← Helper text
   └─────────────────────┘

❌ Invalid context
   ┌─────────────────────────────────────┐
   │ ⚠️ Inventory role must be assigned  │
   │    to a Depot facility              │
   └─────────────────────────────────────┘
```

### Loading States

```
⏳ Loading employees
   ┌─────────────────────────┐
   │ Select Employee    ⊚    │ ← Spinner
   └─────────────────────────┘

⏳ Submitting form
   [⊚ Creating...]  ← Button disabled
```

### Disabled States

```
🔒 Region dropdown (no Zone selected)
   ┌─────────────────────────────────┐
   │ Region *                    ▼   │ ← Grayed out
   │ Please select a Zone first      │
   └─────────────────────────────────┘

🔒 Area dropdown (no Region selected)
   ┌─────────────────────────────────┐
   │ Area *                      ▼   │ ← Grayed out
   │ Please select a Region first    │
   └─────────────────────────────────┘
```

---

## 🔍 Search & Filter in Autocomplete

### Employee Autocomplete

```
┌───────────────────────────────────────────┐
│ 🔍 emp                               ▼    │
├───────────────────────────────────────────┤
│ ● EMP001 - Ahmed Khan                     │
│   (Zonal Sales Manager)                   │
├───────────────────────────────────────────┤
│ ○ EMP005 - Mehedi Hasan                   │
│   (Area Sales Manager)                    │
├───────────────────────────────────────────┤
│ ○ EMP009 - Kamal Uddin                    │
│   (Sales Officer)                         │
└───────────────────────────────────────────┘

Searchable by:
- Employee ID (EMP001)
- Name (Ahmed Khan)
- Designation (Zonal Sales Manager)
```

---

## 🎨 Color Coding

### Role-Based Colors

```
ZSM  → 🟦 Blue
RSM  → 🟩 Green
ASM  → 🟧 Orange
SO   → 🟪 Purple
Inventory → 🟨 Yellow
Production → 🟥 Red
SuperAdmin → ⬛ Black
```

### Status Colors

```
Active   → 🟢 Green
Inactive → 🔴 Red
```

---

## 💾 Data Flow

```
User Form
    ↓
Validate Fields
    ↓
Validate Role Context ← TerritorySelector / FacilitySelector
    ↓
Update Employee (if needed)
    ├→ Territory Assignments (ZSM/RSM/ASM/SO)
    └→ Facility Assignment (Inventory/Production)
    ↓
Create/Update User
    ↓
Backend Validation (User.validateRoleContext)
    ↓
Success → User can login
```

---

## 🧪 Test Scenarios

### ✅ Happy Paths

- [ ] Create ZSM with Zone 1
- [ ] Create RSM with Zone 1 → Region r1
- [ ] Create ASM with Zone 1 → Region r1 → Area a1
- [ ] Create SO with Zone 2 → Region r5 → Area a17
- [ ] Create Inventory with Dhaka Depot
- [ ] Create Production with Dhaka Factory
- [ ] Create SuperAdmin (no context)
- [ ] Edit existing user and change role
- [ ] Change territory assignment

### ❌ Error Paths

- [ ] Try to create ZSM without Zone → Error
- [ ] Try to create RSM without Region → Error
- [ ] Try to create ASM without Area → Error
- [ ] Try to assign Inventory to Factory → Error
- [ ] Try to assign Production to Depot → Error
- [ ] Try to submit without employee → Error
- [ ] Try to login with incomplete context → Blocked

---

## 📚 Component Tree

```
UserFormDialog
├── TextField (username)
├── TextField (email)
├── TextField (password)
├── Select (role_id)
├── Select (user_type)
├── Autocomplete (employee_id)
├── TerritorySelector ← Custom Component
│   ├── Select (Zone)
│   ├── Select (Region) ← Cascading
│   └── Select (Area) ← Cascading
├── Select (facility_id) ← Filtered by role
└── Switch (active)
```

---

## 🔐 Security Features

1. **Role-Based Validation**

   - Frontend: TerritorySelector enforces required fields
   - Backend: User.validateRoleContext() blocks invalid logins

2. **Context Enforcement**

   - Cannot create user with missing context
   - Cannot login if context becomes invalid

3. **Type Safety**

   - TypeScript interfaces for all data
   - Zod schemas for validation

4. **Audit Trail**
   - created_by / updated_by tracked
   - Timestamps on all changes

---

## 📖 Usage Documentation

See: `TERRITORY_SELECTOR_IMPLEMENTATION.md` for:

- Complete API reference
- Integration guide
- Data conversion helpers
- Validation flows
- Best practices

---

## 🚀 Next Steps

1. Import UserFormDialog into users page
2. Replace existing form dialog
3. Test all role scenarios
4. Add loading states
5. Add success/error toasts
6. Test backend validation
7. Document any edge cases

---

**Created**: 2025-10-21  
**Component**: `frontend/src/app/admin/users/UserFormDialog.tsx`  
**Related**: `frontend/src/components/common/TerritorySelector.tsx`
