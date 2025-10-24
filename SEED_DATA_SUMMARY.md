# Test Data Seed Summary

## Overview

Successfully created test employees and users for all employee types to demonstrate the employee_type-based context assignment system.

## How to Run

```bash
cd backend
node seed-test-data.js
```

## What the Script Does

### 1. Data Preservation

- ✅ Preserves all designations (client-owned data)
- ✅ Preserves all roles (client-owned data)
- ✅ Preserves facilities, territories, and distributors
- ✅ Keeps SuperAdmin user intact
- ❌ Clears ONLY users (except superadmin) and employees collections

### 2. Test Data Created

#### **HQ Employees (8 total)** - `employee_type: 'hq'`

No special context assignments required.

| Employee ID | Name                            | Designation          | Role             | Username                     |
| ----------- | ------------------------------- | -------------------- | ---------------- | ---------------------------- |
| EMP0001     | Head of Sales Apple             | Head of Sales        | HOS              | headofsalesapple             |
| EMP0002     | Finance Manager Banana          | Finance Manager      | Finance          | financemanagerbanana         |
| EMP0003     | Accounts Manager Cherry         | Accounts Manager     | Finance          | accountsmanagercherry        |
| EMP0004     | Distribution Manager Dragon     | Distribution Manager | Distribution     | distributionmanagerdragon    |
| EMP0005     | Supply Chain Manager Elderberry | Supply Chain Manager | SCM              | supplychainmanagerelderberry |
| EMP0006     | OM Manager Fig                  | OM Manager           | Order Management | ommanagerfig                 |
| EMP0007     | PS Manager Grape                | PS Manager           | PSM              | psmanagergrape               |
| EMP0008     | Sales Admin Honey               | Sales Admin          | Sales Admin      | salesadminhoney              |

#### **Field Employees (6 total)** - `employee_type: 'field'`

Each has `territory_assignments` with zone/region/area IDs based on their role level.

| Employee ID | Name                   | Designation      | Role | Username             | Territory Scope      |
| ----------- | ---------------------- | ---------------- | ---- | -------------------- | -------------------- |
| EMP0009     | Zonal Manager Indigo   | Zonal Manager    | ZSM  | zonalmanagerindigo   | Zone only            |
| EMP0010     | Zonal Manager Jade     | Zonal Manager    | ZSM  | zonalmanagerjade     | Zone only            |
| EMP0011     | Regional Manager Kiwi  | Regional Manager | RSM  | regionalmanagerkiwi  | Zone + Region        |
| EMP0012     | Regional Manager Lemon | Regional Manager | RSM  | regionalmanagerlemon | Zone + Region        |
| EMP0013     | Area Manager Mango     | Area Manager     | ASM  | areamanagermango     | Zone + Region + Area |
| EMP0014     | Area Manager Nectar    | Area Manager     | ASM  | areamanagernectar    | Zone + Region + Area |

#### **Facility Employees (4 total)** - `employee_type: 'facility'`

Each has a `facility_id` assignment to a specific depot.

| Employee ID | Name                      | Designation        | Role       | Username                | Facility            |
| ----------- | ------------------------- | ------------------ | ---------- | ----------------------- | ------------------- |
| EMP0015     | Production Manager Orange | Production Manager | Production | productionmanagerorange | Dhaka Central Depot |
| EMP0016     | Production Manager Papaya | Production Manager | Production | productionmanagerpapaya | Chittagong Depot    |
| EMP0017     | Inventory Manager Quince  | Inventory Manager  | Inventory  | inventorymanagerquince  | Sylhet Depot        |
| EMP0018     | Inventory Manager Ruby    | Inventory Manager  | Inventory  | inventorymanagerruby    | Rajshahi Depot      |

#### **Distributor Users (4 total)** - `user_type: 'distributor'`

Linked to existing distributor records, no employee record.

| Username   | Role        | Distributor      |
| ---------- | ----------- | ---------------- |
| distapple  | Distributor | Distributor-0001 |
| distbanana | Distributor | Distributor-0002 |
| distcherry | Distributor | Distributor-0004 |
| distdragon | Distributor | Distributor-0005 |

## Login Credentials

**All users have the same password:** `password123`

### Example Logins:

- **HQ User:** `headofsalesapple` / `password123`
- **Field User (Zonal):** `zonalmanagerindigo` / `password123`
- **Field User (Regional):** `regionalmanagerkiwi` / `password123`
- **Field User (Area):** `areamanagermango` / `password123`
- **Facility User:** `productionmanagerorange` / `password123`
- **Distributor User:** `distapple` / `password123`

## Data Summary

- **Total Users Created:** 22 (+ 1 SuperAdmin = 23 total)
- **Total Employees Created:** 18
- **HQ Employees:** 8
- **Field Employees:** 6 (2 ZSM, 2 RSM, 2 ASM)
- **Facility Employees:** 4 (2 Production, 2 Inventory)
- **Distributor Users:** 4

## Testing the System

### 1. Employee Type Context

Log in with different employee types to verify:

- **HQ employees** can access HQ functions
- **Field employees** see territory-based data (zones/regions/areas)
- **Facility employees** see facility-specific data (depots)
- **Distributors** see distributor-specific data

### 2. Territory Hierarchy

Field employees demonstrate three levels:

- **ZSM (Zonal):** Only zone_ids populated
- **RSM (Regional):** zone_ids + region_ids populated
- **ASM (Area):** zone_ids + region_ids + area_ids populated

### 3. Facility Context

Facility employees are assigned to different depots:

- Production Managers: Dhaka, Chittagong
- Inventory Managers: Sylhet, Rajshahi

## Notes

- All employee names follow the pattern: `{Designation} {ColorfulName}`
- Employee IDs are sequential: EMP0001, EMP0002, etc.
- Usernames are lowercase without spaces: `zonalmanagerindigo`
- Email format: `{colorfulname}.{designation}@test.com`
- All employees have standard Bangladesh address data (Dhaka, Blood group A+, etc.)
- Territory assignments use actual territories from the database
- Facility assignments use actual depots from the database
- Distributor users are linked to existing distributor records

## Script Location

`backend/seed-test-data.js`

## Dependencies

- mongoose
- bcryptjs
- All employee, user, designation, role, facility, territory, and distributor models

## Safe to Re-run

Yes! The script clears users and employees collections each time, preserving all other data. You can run it multiple times to reset test data.
