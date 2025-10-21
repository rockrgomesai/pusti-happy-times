# 🎯 Role-Based Dashboard Strategy

## Problem Statement

You need **separate dashboard content** for each role:
- **System Admin** - Full system overview
- **Facility Employees** - Depot/Factory operations
- **HQ Employees** - Department-specific metrics
- **Field Employees** - Territory sales data
- **Distributors** - Order and catalog management

## Solution Approaches

### ✅ **Recommended: Component-Based Approach**

**Best for your use case** - Single page with conditional components based on role.

#### Advantages
- ✅ Single URL `/dashboard` - simpler navigation
- ✅ Easier to maintain - all dashboard logic in one place
- ✅ Shared components (stats cards, charts) can be reused
- ✅ Better for SEO - single dashboard route
- ✅ Less code duplication
- ✅ Easier permission management

#### Implementation

```tsx
// frontend/src/app/dashboard/page.tsx
'use client';

import { useAuth } from '@/contexts/AuthContext';
import SystemAdminDashboard from '@/components/dashboards/SystemAdminDashboard';
import FacilityDashboard from '@/components/dashboards/FacilityDashboard';
import HQDashboard from '@/components/dashboards/HQDashboard';
import FieldDashboard from '@/components/dashboards/FieldDashboard';
import DistributorDashboard from '@/components/dashboards/DistributorDashboard';

export default function DashboardPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  // Route based on user type and employee type
  if (user?.user_type === 'employee') {
    const employeeType = user.context?.employee_type;
    
    switch (employeeType) {
      case 'system_admin':
        return <SystemAdminDashboard user={user} />;
      
      case 'facility':
        return <FacilityDashboard user={user} />;
      
      case 'hq':
        return <HQDashboard user={user} />;
      
      case 'field':
        return <FieldDashboard user={user} />;
      
      default:
        return <SystemAdminDashboard user={user} />;
    }
  }
  
  if (user?.user_type === 'distributor') {
    return <DistributorDashboard user={user} />;
  }

  // Fallback for SuperAdmin or unknown types
  return <SystemAdminDashboard user={user} />;
}
```

---

### 📁 **Alternative: Separate Page Routes**

**Use when**: Each role needs completely different URL structure and navigation

#### Structure
```
frontend/src/app/
├── dashboard/                    # General/Admin dashboard
│   └── page.tsx
├── operations/                   # Facility employees
│   ├── facility-dashboard/
│   │   └── page.tsx
│   ├── depots/
│   └── factories/
├── hq/                          # HQ employees
│   ├── sales/
│   │   └── dashboard/
│   │       └── page.tsx
│   ├── marketing/
│   │   └── dashboard/
│   └── finance/
│       └── dashboard/
├── sales/                       # Field employees
│   └── field-dashboard/
│       └── page.tsx
└── distributor/                 # Distributors
    ├── catalog/
    └── orders/
```

#### Implementation
```tsx
// frontend/src/app/operations/facility-dashboard/page.tsx
'use client';

export default function FacilityDashboardPage() {
  const { user } = useAuth();
  
  // Protected route - verify user is facility employee
  useEffect(() => {
    if (user?.context?.employee_type !== 'facility') {
      router.push('/dashboard');
    }
  }, [user]);
  
  return <FacilityDashboard user={user} />;
}
```

**Advantages:**
- ✅ Clear URL structure per role
- ✅ Role-specific navigation menus
- ✅ Easier to implement role-based access at page level

**Disadvantages:**
- ❌ More files to maintain
- ❌ Duplicate layout code
- ❌ URL inconsistency (`/dashboard` vs `/operations/facility-dashboard`)

---

### 🎨 **Hybrid Approach (BEST OF BOTH)**

Combine both approaches for flexibility:

```
frontend/src/app/
├── dashboard/                    # Main unified dashboard (component-based)
│   └── page.tsx
├── operations/                   # Facility-specific pages
│   ├── depots/
│   │   ├── [id]/
│   │   │   └── page.tsx
│   │   └── page.tsx
│   └── inventory/
│       └── page.tsx
├── hq/
│   ├── sales/
│   │   ├── reports/
│   │   └── analytics/
│   └── finance/
│       └── budget/
└── sales/
    ├── territories/
    └── leads/
```

- **Dashboard** = Component-based (single page, role-aware)
- **Sub-pages** = Separate routes for role-specific features

---

## 📦 Implementation Plan

### Step 1: Create Dashboard Components

```bash
frontend/src/components/dashboards/
├── SystemAdminDashboard.tsx      # Full system overview
├── FacilityDashboard.tsx         # Depot/Factory operations
├── HQDashboard.tsx               # Department metrics
├── FieldDashboard.tsx            # Territory sales
├── DistributorDashboard.tsx      # Orders and catalog
└── shared/                       # Shared components
    ├── StatCard.tsx
    ├── ChartWidget.tsx
    └── RecentActivity.tsx
```

### Step 2: Update Main Dashboard Page

Replace `/dashboard/page.tsx` with component-based approach (see code above)

### Step 3: Create Role-Specific Components

#### Example: Facility Dashboard

```tsx
// frontend/src/components/dashboards/FacilityDashboard.tsx
'use client';

import { useEffect, useState } from 'react';
import { Box, Grid, Typography, Card, CardContent } from '@mui/material';
import { Warehouse, Inventory, LocalShipping } from '@mui/icons-material';
import StatCard from './shared/StatCard';
import api from '@/lib/api';

interface FacilityDashboardProps {
  user: any;
}

export default function FacilityDashboard({ user }: FacilityDashboardProps) {
  const [depots, setDepots] = useState([]);
  const [stats, setStats] = useState({
    totalInventory: 0,
    pendingOrders: 0,
    todayShipments: 0
  });

  useEffect(() => {
    // Fetch depot-specific data
    const loadDepotData = async () => {
      try {
        const depotIds = user.context?.facility_assignments?.depot_ids || [];
        
        // Fetch data for assigned depots only
        const response = await api.get('/depots/my-facilities');
        setDepots(response.data.data.depots);
        
        // Fetch stats
        const statsRes = await api.get('/depots/stats');
        setStats(statsRes.data.data);
      } catch (error) {
        console.error('Failed to load depot data:', error);
      }
    };

    loadDepotData();
  }, [user]);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" gutterBottom>
          Facility Operations Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Welcome, {user.context?.employee_name}!
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Managing {depots.length} depot(s)
        </Typography>
      </Box>

      {/* Stats Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} lg={4}>
          <StatCard
            title="Total Inventory"
            value={stats.totalInventory}
            icon={<Warehouse />}
            color="#1976d2"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={4}>
          <StatCard
            title="Pending Orders"
            value={stats.pendingOrders}
            icon={<Inventory />}
            color="#ed6c02"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={4}>
          <StatCard
            title="Today's Shipments"
            value={stats.todayShipments}
            icon={<LocalShipping />}
            color="#2e7d32"
          />
        </Grid>
      </Grid>

      {/* Depot List */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Your Assigned Depots
          </Typography>
          
          <Grid container spacing={2} sx={{ mt: 2 }}>
            {depots.map((depot: any) => (
              <Grid item xs={12} md={6} key={depot._id}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6">{depot.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {depot.location}
                    </Typography>
                    {/* Add depot-specific metrics */}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
}
```

### Step 4: Create Backend Endpoints

Add role-specific API endpoints:

```javascript
// backend/src/routes/depots.js

/**
 * Get depots assigned to current facility employee
 */
router.get('/my-facilities',
  authenticate,
  requireUserType('employee'),
  requireEmployeeType('facility'),
  async (req, res) => {
    try {
      const { facility_assignments } = req.userContext;
      
      const depots = await Depot.find({
        _id: { $in: facility_assignments.depot_ids }
      });
      
      const factories = await Factory.find({
        _id: { $in: facility_assignments.factory_ids }
      });
      
      res.json({
        success: true,
        data: { depots, factories }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch facilities'
      });
    }
  }
);

/**
 * Get facility-specific stats
 */
router.get('/stats',
  authenticate,
  requireUserType('employee'),
  requireEmployeeType('facility'),
  async (req, res) => {
    try {
      const { facility_assignments } = req.userContext;
      
      // Calculate stats for assigned depots
      const totalInventory = await calculateInventory(facility_assignments.depot_ids);
      const pendingOrders = await countPendingOrders(facility_assignments.depot_ids);
      const todayShipments = await countTodayShipments(facility_assignments.depot_ids);
      
      res.json({
        success: true,
        data: {
          totalInventory,
          pendingOrders,
          todayShipments
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch stats'
      });
    }
  }
);
```

---

## 🎯 Recommended Architecture

### **Use Component-Based for Dashboard + Separate Routes for Features**

```
✅ Main Dashboard: /dashboard
   - Component-based (SystemAdmin/Facility/HQ/Field/Distributor components)
   - Shows role-specific overview and quick actions

✅ Feature Pages: Separate routes
   - /operations/depots (Facility employees)
   - /hq/sales/reports (HQ Sales employees)
   - /sales/territories (Field employees)
   - /distributor/orders (Distributors)
```

---

## 📝 Implementation Checklist

### Phase 1: Dashboard Components
- [ ] Create `frontend/src/components/dashboards/` directory
- [ ] Create `SystemAdminDashboard.tsx`
- [ ] Create `FacilityDashboard.tsx`
- [ ] Create `HQDashboard.tsx`
- [ ] Create `FieldDashboard.tsx`
- [ ] Create `DistributorDashboard.tsx`
- [ ] Create shared components (StatCard, ChartWidget, etc.)

### Phase 2: Update Main Dashboard
- [ ] Modify `/dashboard/page.tsx` with role-based rendering
- [ ] Add loading states and error handling
- [ ] Test all role types

### Phase 3: Backend API Endpoints
- [ ] Add `/depots/my-facilities` endpoint
- [ ] Add `/depots/stats` endpoint
- [ ] Add `/territories/my-territories` endpoint
- [ ] Add `/hq/:department/stats` endpoint
- [ ] Add distributor-specific endpoints

### Phase 4: Role-Specific Pages (Optional)
- [ ] Create `/operations/` directory for facility pages
- [ ] Create `/hq/` directory for HQ pages
- [ ] Create `/sales/` directory for field pages
- [ ] Update navigation based on role

---

## 🔒 Security Considerations

### Frontend Protection
```tsx
// Protect component rendering
if (user?.context?.employee_type !== 'facility') {
  return <AccessDenied />;
}
```

### Backend Protection
```javascript
// Always verify on backend
router.get('/facilities/stats',
  authenticate,
  requireEmployeeType('facility'),  // Middleware blocks non-facility users
  async (req, res) => {
    // Safe to assume user is facility employee
  }
);
```

---

## 📊 Example Dashboard Content by Role

### System Admin
- Total Users, Employees, Distributors
- System Health Metrics
- Recent Activities Across All Modules
- Quick Actions: Add User, Manage Roles, System Settings

### Facility Employee
- Depot Inventory Levels
- Pending Orders to Process
- Today's Shipments
- Low Stock Alerts
- Quick Actions: Update Inventory, Process Order, View Reports

### HQ Employee (Sales Department)
- Sales Targets vs Actuals
- Top Performing Territories
- Product Performance
- Team Performance
- Quick Actions: View Reports, Analyze Trends, Export Data

### Field Employee
- Assigned Territory Overview
- Sales Performance
- Distributor Orders
- Visit Schedule
- Quick Actions: Log Visit, Create Order, View Distributors

### Distributor
- Pending Orders
- Order History
- Product Catalog
- Account Balance
- Quick Actions: Place Order, View Invoices, Download Catalog

---

## 🚀 Quick Start

**Option 1: Full Component-Based (Recommended)**
```bash
# 1. Create component structure
mkdir -p frontend/src/components/dashboards/shared

# 2. Create components (use provided code above)

# 3. Update /dashboard/page.tsx with role-based rendering
```

**Option 2: Separate Routes**
```bash
# 1. Create route directories
mkdir -p frontend/src/app/operations/facility-dashboard
mkdir -p frontend/src/app/hq/{sales,finance}/dashboard
mkdir -p frontend/src/app/sales/field-dashboard

# 2. Create page.tsx in each directory

# 3. Update AuthContext redirect logic
```

---

## 💡 Best Practices

1. **Keep Dashboard Simple**: Focus on key metrics and quick actions
2. **Role-Specific Data**: Only fetch data relevant to user's role
3. **Progressive Enhancement**: Start with basic stats, add features incrementally
4. **Responsive Design**: Ensure dashboards work on mobile devices
5. **Error Handling**: Handle cases where user has no assigned depots/territories
6. **Loading States**: Show skeletons while data is loading
7. **Real-time Updates**: Consider WebSockets for live inventory/order updates
8. **Caching**: Cache dashboard data to reduce API calls

---

## 🎨 UI/UX Recommendations

- **Color Coding**: Different colors for each role type
- **Personalization**: Show user's name and role prominently
- **Quick Actions**: Most common actions as prominent buttons
- **Notifications**: Role-specific alerts (low stock, pending approvals, etc.)
- **Breadcrumbs**: Clear navigation path
- **Help Text**: Contextual help for each role

---

## ✅ Conclusion

**For your use case, I recommend:**

1. **Component-Based Dashboard** (`/dashboard`) - Single page with role-aware components
2. **Separate Feature Routes** - Role-specific pages under `/operations`, `/hq`, `/sales`, `/distributor`
3. **Backend Middleware** - Strict role verification on all endpoints
4. **Shared Components** - Reusable StatCard, ChartWidget, etc.

This gives you the best balance of:
- ✅ Maintainability (less code duplication)
- ✅ Flexibility (each role can have unique features)
- ✅ Security (backend enforces permissions)
- ✅ User Experience (consistent navigation)

Would you like me to implement any specific dashboard component?
