# Territory Selector Implementation Guide

## Overview

This document describes the role-based cascading territory selector component for employee/user management.

## Role-Based Territory Requirements

Based on the role-based context validation in `User.validateRoleContext()`:

### ZSM (Zonal Sales Manager)

- **UI**: Single Zone dropdown
- **Requirement**: Must select one Zone
- **Validation**: `territory_assignments.zone_ids` must have at least one value

### RSM (Regional Sales Manager)

- **UI**: Zone dropdown → Region dropdown (cascading)
- **Requirement**: Must select one Zone and one Region
- **Validation**: `territory_assignments.region_ids` must have at least one value
- **Cascading**: Regions are filtered by selected Zone

### ASM (Area Sales Manager)

- **UI**: Zone dropdown → Region dropdown → Area dropdown (cascading)
- **Requirement**: Must select one Zone, one Region, and one Area
- **Validation**: `territory_assignments.area_ids` must have at least one value
- **Cascading**:
  - Regions filtered by selected Zone
  - Areas filtered by selected Region

### SO (Sales Officer)

- **UI**: Zone dropdown → Region dropdown → Area dropdown (cascading)
- **Requirement**: Same as ASM
- **Validation**: `territory_assignments.area_ids` must have at least one value
- **Cascading**: Same as ASM

## Component: TerritorySelector

### Location

```
frontend/src/components/common/TerritorySelector.tsx
```

### Props Interface

```typescript
interface TerritorySelectorProps {
  role: string; // 'ZSM', 'RSM', 'ASM', 'SO'
  value: {
    zone_id?: string;
    region_id?: string;
    area_id?: string;
  };
  onChange: (value: { zone_id?: string; region_id?: string; area_id?: string }) => void;
  error?: {
    zone_id?: string;
    region_id?: string;
    area_id?: string;
  };
  disabled?: boolean;
}
```

### Features

1. **Role-Based Display**

   - Shows only relevant dropdowns based on role
   - ZSM: Zone only
   - RSM: Zone + Region
   - ASM/SO: Zone + Region + Area

2. **Cascading Loading**

   - Regions load when Zone is selected
   - Areas load when Region is selected
   - Previous selections clear when parent changes

3. **Loading States**

   - Individual loading indicators for each dropdown
   - Dropdowns disabled while loading

4. **Validation**
   - Required field indicators (\*)
   - Error message display
   - Helper text for dependent fields

## Backend Data Structure

### Employee Model Territory Assignments

```javascript
territory_assignments: {
  zone_ids: [ObjectId],      // Array of Zone IDs
  region_ids: [ObjectId],    // Array of Region IDs
  area_ids: [ObjectId],      // Array of Area IDs
  db_point_ids: [ObjectId],  // Array of DB Point IDs
  all_territory_ids: [ObjectId]  // Flattened list for querying
}
```

### Territory Model Hierarchy

```javascript
{
  _id: ObjectId,
  name: String,
  type: 'zone' | 'region' | 'area' | 'db_point',
  level: Number,  // 0=zone, 1=region, 2=area, 3=db_point
  parent_id: ObjectId | null,
  ancestors: [ObjectId],
  active: Boolean
}
```

## Usage Example

### In Employee/User Form

```typescript
import TerritorySelector from "@/components/common/TerritorySelector";

// In your component
const [selectedRole, setSelectedRole] = useState<string>("");
const [territoryValue, setTerritoryValue] = useState({
  zone_id: undefined,
  region_id: undefined,
  area_id: undefined,
});

// In your form
<TerritorySelector
  role={selectedRole}
  value={territoryValue}
  onChange={setTerritoryValue}
  error={formErrors.territory}
  disabled={isSubmitting}
/>;
```

### Converting to Employee Model Format

When saving to the Employee model, convert the single selections to arrays:

```typescript
const convertToEmployeeFormat = (territoryValue, role) => {
  const assignments = {
    zone_ids: [],
    region_ids: [],
    area_ids: [],
    db_point_ids: [],
    all_territory_ids: [],
  };

  switch (role) {
    case "ZSM":
      if (territoryValue.zone_id) {
        assignments.zone_ids = [territoryValue.zone_id];
        assignments.all_territory_ids = [territoryValue.zone_id];
      }
      break;

    case "RSM":
      if (territoryValue.zone_id) {
        assignments.zone_ids = [territoryValue.zone_id];
        assignments.all_territory_ids.push(territoryValue.zone_id);
      }
      if (territoryValue.region_id) {
        assignments.region_ids = [territoryValue.region_id];
        assignments.all_territory_ids.push(territoryValue.region_id);
      }
      break;

    case "ASM":
    case "SO":
      if (territoryValue.zone_id) {
        assignments.zone_ids = [territoryValue.zone_id];
        assignments.all_territory_ids.push(territoryValue.zone_id);
      }
      if (territoryValue.region_id) {
        assignments.region_ids = [territoryValue.region_id];
        assignments.all_territory_ids.push(territoryValue.region_id);
      }
      if (territoryValue.area_id) {
        assignments.area_ids = [territoryValue.area_id];
        assignments.all_territory_ids.push(territoryValue.area_id);
      }
      break;
  }

  return assignments;
};
```

## API Endpoints Used

### Get Territories by Type

```
GET /territories?type={zone|region|area}&parentId={parentId}&includeInactive=false&limit=200
```

Response:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "_id": "...",
        "name": "Zone 1",
        "type": "zone",
        "level": 0,
        "parent_id": null,
        "active": true
      }
    ]
  }
}
```

## Validation Flow

### Frontend Validation (Form Submit)

```typescript
const validateTerritorySelection = (role, territoryValue) => {
  const errors = {};

  switch (role) {
    case "ZSM":
      if (!territoryValue.zone_id) {
        errors.zone_id = "Zone is required for ZSM role";
      }
      break;

    case "RSM":
      if (!territoryValue.zone_id) {
        errors.zone_id = "Zone is required for RSM role";
      }
      if (!territoryValue.region_id) {
        errors.region_id = "Region is required for RSM role";
      }
      break;

    case "ASM":
    case "SO":
      if (!territoryValue.zone_id) {
        errors.zone_id = "Zone is required for this role";
      }
      if (!territoryValue.region_id) {
        errors.region_id = "Region is required for this role";
      }
      if (!territoryValue.area_id) {
        errors.area_id = "Area is required for this role";
      }
      break;
  }

  return errors;
};
```

### Backend Validation (Login)

The `User.validateRoleContext()` method in `backend/src/models/User.js` validates:

- ZSM must have at least one zone_id
- RSM must have at least one region_id
- ASM/SO must have at least one area_id

## Integration Steps

### 1. Import the Component

```typescript
import TerritorySelector from "@/components/common/TerritorySelector";
```

### 2. Add State Management

```typescript
const [role, setRole] = useState("");
const [territorySelection, setTerritorySelection] = useState({
  zone_id: undefined,
  region_id: undefined,
  area_id: undefined,
});
```

### 3. Add to Form

```tsx
{
  /* Show only for field employee roles */
}
{
  ["ZSM", "RSM", "ASM", "SO"].includes(role) && (
    <TerritorySelector
      role={role}
      value={territorySelection}
      onChange={setTerritorySelection}
      error={errors.territory}
      disabled={isSubmitting}
    />
  );
}
```

### 4. Handle Form Submission

```typescript
const onSubmit = async (data) => {
  // Convert territory selection to employee format
  const territoryAssignments = convertToEmployeeFormat(territorySelection, data.role);

  // Include in API payload
  const payload = {
    ...data,
    territory_assignments: territoryAssignments,
  };

  await api.post("/employees", payload);
};
```

## Best Practices

1. **Clear Cascading Selections**: When a parent changes, clear child selections
2. **Loading States**: Show loading indicators during data fetch
3. **Disabled States**: Disable child dropdowns until parent is selected
4. **Error Handling**: Display helpful error messages
5. **Empty States**: Show meaningful placeholder text
6. **Validation**: Validate on both frontend and backend

## Testing Checklist

- [ ] ZSM role shows only Zone dropdown
- [ ] RSM role shows Zone and Region dropdowns
- [ ] ASM role shows Zone, Region, and Area dropdowns
- [ ] SO role shows Zone, Region, and Area dropdowns
- [ ] Regions load when Zone is selected
- [ ] Areas load when Region is selected
- [ ] Changing Zone clears Region and Area
- [ ] Changing Region clears Area
- [ ] Loading indicators appear during data fetch
- [ ] Dropdowns are disabled appropriately
- [ ] Validation errors display correctly
- [ ] Form submission includes correct territory_assignments format
- [ ] Backend validation accepts the payload
- [ ] User can login after territory assignment

## Related Files

- **Component**: `frontend/src/components/common/TerritorySelector.tsx`
- **Validation**: `backend/src/models/User.js` → `validateRoleContext()`
- **Employee Model**: `backend/src/models/Employee.js`
- **Territory Model**: `backend/src/models/Territory.js`
- **Territory Routes**: `backend/src/routes/territories.js`
- **Employee Routes**: `backend/src/routes/employees.js`
- **User Routes**: `backend/src/routes/users.js`

## Notes

- The component uses single selections but stores as arrays in the database
- This aligns with the Employee model which uses arrays for territory_assignments
- The role-based validation ensures data integrity during login
- The cascading behavior improves UX by showing only relevant options
