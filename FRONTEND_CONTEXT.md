# Frontend Architecture Context

**Application:** Pusti Happy Times ERP  
**Generated:** January 5, 2026

---

## Technology Stack

### Core Framework
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript 5
- **React:** 18.3.1

### UI Library & Styling
- **Component Library:** Material-UI (MUI) v7
- **Icons:** @mui/icons-material
- **Styling:** MUI's emotion-based styling
- **Theme:** Custom Apple-inspired theme with dark mode

### Form Management
- **Form Library:** React Hook Form 7.62
- **Validation:** Zod 4.1.5
- **Resolver:** @hookform/resolvers

### Data Management
- **HTTP Client:** Axios 1.11
- **State Management:** React Context API
- **Real-time:** Socket.IO Client 4.8

### UI Components
- **Data Grid:** @mui/x-data-grid
- **Date Pickers:** @mui/x-date-pickers
- **Date Utility:** date-fns 4.1
- **Tree View:** react-arborist (for territories)
- **Notifications:** react-hot-toast 2.6
- **PDF Generation:** jspdf, jspdf-autotable
- **Cookies:** js-cookie

---

## Project Structure

```
frontend/
├── next.config.mjs                # Next.js configuration
├── tsconfig.json                  # TypeScript configuration
├── package.json                   # Dependencies
├── .env.local                     # Local environment variables
├── .env.production                # Production environment
├── Dockerfile                     # Container configuration
│
├── public/                        # Static assets
│   ├── logo.png
│   └── favicon.ico
│
└── src/
    ├── middleware.ts              # Next.js middleware (auth redirect)
    │
    ├── app/                       # Next.js App Router pages
    │   ├── layout.tsx            # Root layout
    │   ├── page.tsx              # Home page (redirects to dashboard)
    │   ├── globals.css           # Global styles
    │   │
    │   ├── login/                # Public login page
    │   │   └── page.tsx
    │   │
    │   ├── dashboard/            # Dashboard
    │   │   └── page.tsx
    │   │
    │   ├── (protected)/          # Protected route group
    │   │   ├── distribution/
    │   │   ├── distributor/
    │   │   └── inventory/
    │   │
    │   ├── admin/                # Admin pages
    │   ├── master/               # Master data pages
    │   ├── hr/                   # HR module
    │   ├── inventory/            # Inventory pages
    │   ├── ordermanagement/      # Order management
    │   ├── finance/              # Finance pages
    │   ├── production/           # Production pages
    │   ├── offers/               # Offer management
    │   └── users/                # User management
    │
    ├── components/               # Reusable components
    │   ├── common/               # Common UI components
    │   ├── dashboards/           # Dashboard widgets
    │   ├── layout/               # Layout components
    │   ├── offers/               # Offer-specific components
    │   └── products/             # Product-specific components
    │
    ├── contexts/                 # React Contexts
    │   ├── AuthContext.tsx       # Authentication context
    │   ├── SocketContext.tsx     # Socket.IO context
    │   └── NotificationContext.tsx
    │
    ├── lib/                      # Core utilities
    │   ├── api.ts                # Axios instance & token manager
    │   └── permissions.ts        # Permission helpers
    │
    ├── services/                 # API service layer
    │   └── collectionsApi.ts
    │
    ├── theme/                    # MUI theme configuration
    │   └── ThemeProvider.tsx
    │
    ├── types/                    # TypeScript type definitions
    │
    └── utils/                    # Helper utilities
```

---

## Design Principles

### 1. Mobile-First Design
**Every page and component is designed mobile-first**

**Breakpoints:**
```typescript
xs: 0px      // Mobile portrait
sm: 600px    // Mobile landscape
md: 900px    // Tablet
lg: 1200px   // Desktop
xl: 1536px   // Large desktop
```

**Responsive Patterns:**
- Stack vertically on mobile, grid on desktop
- Full-width cards on mobile, grid cards on tablet+
- Collapsible sections for mobile
- Bottom navigation for mobile, sidebar for desktop
- Touch-friendly tap targets (min 48x48px)

### 2. Apple-Inspired UI
**Design Characteristics:**
- Clean, minimalist interface
- Generous whitespace
- Subtle shadows and elevations
- Smooth transitions and animations
- Premium typography
- Soft rounded corners

### 3. Dark Mode Support
**Theme Toggle:**
- Light mode (default)
- Dark mode
- Persisted in localStorage
- System preference detection

---

## Layout Structure

### Root Layout (app/layout.tsx)
```tsx
<html>
  <body>
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <ClientLayout>
            {children}
          </ClientLayout>
        </SocketProvider>
        <Toaster />  {/* react-hot-toast */}
      </AuthProvider>
    </ThemeProvider>
  </body>
</html>
```

### Client Layout (components/layout/ClientLayout.tsx)
```tsx
<Box>
  {isAuthenticated ? (
    <>
      <Navbar />
      <Box display="flex">
        <Sidebar />
        <Box component="main" flexGrow={1}>
          {children}
        </Box>
      </Box>
      <Footer />
    </>
  ) : (
    children  // Login page
  )}
</Box>
```

### Navbar Components
**Position:** Fixed top, full width

**Elements:**
- **Logo** (left) - Links to dashboard
- **Hamburger** (left of center) - Toggle sidebar
- **Dark Mode Toggle** (right)
- **Notification Bell** (right)
- **User Avatar** (far right) - Dropdown menu

**Avatar Dropdown:**
- Change Password
- Logout

### Sidebar Components
**Position:** Fixed left, below navbar

**Features:**
- **Collapsible:** Hamburger toggles
- **Role-Based Menu:** Fetched from backend
- **Hierarchical:**
  - Parent items (href=null) - Show arrow, expand/collapse
  - Child items - Indented, route navigation
- **Icons:** Material-UI icons
- **Ordering:** Based on `m_order` field

**Collapsed State:**
- Icons only
- Tooltips on hover
- Auto-expands on hover (optional)

### Footer
**Position:** Fixed bottom, full width
**Height:** 50% of navbar height
**Content:** Copyright, version info

---

## Authentication Flow

### AuthContext (contexts/AuthContext.tsx)

**Provides:**
```typescript
{
  user: User | null,
  isLoading: boolean,
  isAuthenticated: boolean,
  login: (username, password) => Promise<void>,
  logout: () => Promise<void>,
  changePassword: (data) => Promise<void>
}
```

**User Object:**
```typescript
interface User {
  id: string;
  username: string;
  email: string;
  active: boolean;
  user_type: 'employee' | 'distributor';
  role: {
    id: string;
    role: string;
  };
  context: {
    // Employee context
    employee_type?: 'system_admin' | 'field' | 'facility' | 'hq';
    employee_code?: string;
    employee_name?: string;
    designation_id?: string;
    territory_assignments?: {
      zone_ids?: string[];
      region_ids?: string[];
      area_ids?: string[];
      db_point_ids?: string[];
      all_territory_ids?: string[];
    };
    facility_id?: string;
    factory_store_id?: string;
    
    // Distributor context
    distributor_id?: string;
    distributor_name?: string;
    db_point_id?: string;
    product_segment?: string[];
    skus_exclude?: string[];
  };
  permissions?: string[];
}
```

### Token Management (lib/api.ts)

**tokenManager:**
```typescript
{
  getToken: () => string | null,
  setToken: (token: string) => void,
  removeToken: () => void,
  isAuthenticated: () => boolean
}
```

**Storage:** Cookies (js-cookie)
- `token` - Access token
- `refreshToken` - Refresh token

### Middleware (middleware.ts)
**Protected Routes:**
```typescript
const protectedRoutes = [
  '/dashboard',
  '/admin',
  '/master',
  '/inventory',
  '/ordermanagement',
  '/finance',
  // ... all authenticated routes
];
```

**Logic:**
- If not authenticated + accessing protected route → Redirect to `/login`
- If authenticated + accessing `/login` → Redirect to `/dashboard`

---

## API Client (lib/api.ts)

### Axios Instance
```typescript
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});
```

### Interceptors

**Request Interceptor:**
```typescript
// Attach token to every request
config.headers.Authorization = `Bearer ${tokenManager.getToken()}`;
```

**Response Interceptor:**
```typescript
// Handle 401 Unauthorized
if (error.response?.status === 401) {
  tokenManager.removeToken();
  window.location.href = '/login';
}
```

### API Modules
```typescript
export const authAPI = {
  login: (username, password) => api.post('/auth/login', {...}),
  logout: () => api.post('/auth/logout'),
  getProfile: () => api.get('/auth/me'),
  changePassword: (data) => api.post('/auth/change-password', data),
  refresh: (refreshToken) => api.post('/auth/refresh', {...})
};

// Similar modules for other resources
export const productsAPI = {...};
export const ordersAPI = {...};
export const inventoryAPI = {...};
```

---

## Common UI Patterns

### 1. CRUD Pages

**Standard Structure:**
```tsx
<Box>
  <PageHeader title="Resource Name">
    <ViewToggle />  {/* Card/List toggle */}
    <Button startIcon={<AddIcon />}>Add New</Button>
  </PageHeader>
  
  {viewMode === 'card' ? (
    <Grid container spacing={2}>
      {items.map(item => (
        <Grid item xs={12} sm={6} md={4}>
          <ResourceCard item={item} />
        </Grid>
      ))}
    </Grid>
  ) : (
    <DataGrid rows={items} columns={columns} />
  )}
  
  <Pagination />
  
  <ResourceDialog open={dialogOpen} onClose={...} />
</Box>
```

### 2. Form Dialogs

**Pattern:**
```tsx
<Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
  <DialogTitle>
    {mode === 'create' ? 'Add' : 'Edit'} Resource
    <IconButton onClick={onClose}>
      <CloseIcon />
    </IconButton>
  </DialogTitle>
  
  <form onSubmit={handleSubmit(onSubmit)}>
    <DialogContent>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <TextField {...register('field')} />
        </Grid>
        {/* More fields */}
      </Grid>
    </DialogContent>
    
    <DialogActions>
      <Button onClick={onClose}>Cancel</Button>
      <Button type="submit" variant="contained">
        Save
      </Button>
    </DialogActions>
  </form>
</Dialog>
```

### 3. Data Tables (MUI DataGrid)

**Configuration:**
```tsx
<DataGrid
  rows={rows}
  columns={columns}
  pageSize={pageSize}
  rowsPerPageOptions={[10, 25, 50, 100]}
  pagination
  paginationMode="server"
  onPageChange={handlePageChange}
  onPageSizeChange={handlePageSizeChange}
  checkboxSelection
  disableSelectionOnClick
  autoHeight
  sx={{
    '& .MuiDataGrid-cell': {
      fontSize: { xs: '0.75rem', sm: '0.875rem' }
    }
  }}
/>
```

**Column Definition:**
```tsx
const columns: GridColDef[] = [
  { 
    field: 'id', 
    headerName: 'ID', 
    width: 90,
    hide: true 
  },
  { 
    field: 'name', 
    headerName: 'Name', 
    flex: 1,
    minWidth: 150
  },
  {
    field: 'actions',
    headerName: 'Actions',
    width: 120,
    renderCell: (params) => (
      <Box>
        <IconButton onClick={() => handleView(params.row)}>
          <VisibilityIcon />
        </IconButton>
        <IconButton onClick={() => handleEdit(params.row)}>
          <EditIcon />
        </IconButton>
        <IconButton onClick={() => handleDelete(params.row)}>
          <DeleteIcon />
        </IconButton>
      </Box>
    )
  }
];
```

### 4. Card View

**Pattern:**
```tsx
<Card sx={{ height: '100%' }}>
  <CardHeader
    title={item.name}
    subheader={item.code}
    action={
      <Chip 
        label={item.status} 
        color={item.active ? 'success' : 'error'}
        size="small"
      />
    }
  />
  
  <CardContent>
    <Typography variant="body2">
      {item.description}
    </Typography>
    <Box mt={2}>
      <Typography variant="caption" color="text.secondary">
        Created: {formatDate(item.created_at)}
      </Typography>
    </Box>
  </CardContent>
  
  <CardActions>
    <IconButton onClick={() => handleView(item)}>
      <VisibilityIcon />
    </IconButton>
    <IconButton onClick={() => handleEdit(item)}>
      <EditIcon />
    </IconButton>
    <IconButton onClick={() => handleDelete(item)}>
      <DeleteIcon />
    </IconButton>
  </CardActions>
</Card>
```

### 5. Responsive Containers

**Pattern:**
```tsx
<Container maxWidth="lg">
  <Box sx={{ 
    px: { xs: 1, sm: 2, md: 3 },
    py: { xs: 2, sm: 3 }
  }}>
    {children}
  </Box>
</Container>
```

### 6. Loading States

**Skeleton Loading:**
```tsx
{isLoading ? (
  <Grid container spacing={2}>
    {[1, 2, 3].map(i => (
      <Grid item xs={12} sm={6} md={4} key={i}>
        <Card>
          <Skeleton variant="rectangular" height={200} />
          <CardContent>
            <Skeleton variant="text" />
            <Skeleton variant="text" width="60%" />
          </Skeleton>
        </Card>
      </Grid>
    ))}
  </Grid>
) : (
  <ActualContent />
)}
```

### 7. Error Handling

**Toast Notifications:**
```tsx
import toast from 'react-hot-toast';

// Success
toast.success('Operation completed successfully!');

// Error
toast.error('An error occurred. Please try again.');

// Custom
toast((t) => (
  <Box>
    <Typography variant="body2">Custom message</Typography>
    <Button onClick={() => toast.dismiss(t.id)}>Dismiss</Button>
  </Box>
), { duration: 5000 });
```

---

## Page Routing

### App Router Structure

**Public Routes:**
- `/` → Home (redirects to `/dashboard`)
- `/login` → Login page

**Protected Routes (require authentication):**

#### Master Data
- `/master/brands` - Brand management
- `/master/categories` - Category management
- `/master/territories` - Territory tree management
- `/master/facilities` - Facility management
- `/master/transports` - Transport management

#### Admin
- `/admin/users` - User management
- `/admin/roles` - Role management
- `/admin/permissions` - Permission management
- `/admin/menu-items` - Menu configuration

#### HR
- `/hr/designations` - Designation management
- `/hr/employees` - Employee management
- `/hr/facility-employees` - Facility assignments

#### Products & Offers
- `/product/products` - Product management
- `/offers/create-offer` - Create offers
- `/offers/view-offer` - View offers
- `/offers/edit-offer` - Edit offers
- `/offers/send-to-store` - Send offers to distributors

#### Order Management
- `/ordermanagement/demandorders` - Demand orders
- `/ordermanagement/approveorders` - ASM approval
- `/ordermanagement/rsmapproveorders` - RSM approval
- `/ordermanagement/approvedorders` - Approved orders list
- `/ordermanagement/schedulings` - Distribution scheduling
- `/ordermanagement/approvedschedulings` - Approved schedules
- `/ordermanagement/scheduledlist` - Scheduled orders
- `/ordermanagement/collections` - Payment collections

#### Distribution (Protected Group)
- `/(protected)/distribution/pending-orders` - Pending orders
- `/(protected)/distribution/schedule` - Create schedules

#### Distributor Portal
- `/(protected)/distributor/dashboard` - Distributor dashboard
- `/(protected)/distributor/orders` - My orders
- `/(protected)/distributor/offers` - Available offers

#### Inventory
- `/inventory/receive-from-production` - Receive from production
- `/inventory/receive-from-production-list` - Receipt history
- `/inventory/local-stock` - Current inventory
- `/inventory/requisitions` - Create requisitions
- `/inventory/requisitionlist` - Requisition list
- `/inventory/schedule-requisitions` - Schedule requisitions
- `/inventory/approved-req-schedules` - Approved schedules
- `/inventory/requisition-scheduled-list` - Scheduled list
- `/inventory/req-load-sheets` - Load sheets
- `/inventory/req-chalans` - Chalans
- `/inventory/transfer-send` - Send transfers
- `/inventory/transfer-send-list` - Sent transfers
- `/inventory/transfer-receive` - Receive transfers
- `/inventory/transfer-receive-list` - Received transfers
- `/inventory/depot-deliveries` - Depot deliveries

#### Production
- `/production/send-to-store` - Send to depot

#### Finance
- `/finance/customerledger` - Customer ledger

#### Dashboard
- `/dashboard` - Role-based dashboard

---

## State Management

### Context Pattern
```tsx
// Create Context
const MyContext = createContext<MyContextType | undefined>(undefined);

// Provider Component
export function MyProvider({ children }) {
  const [state, setState] = useState(initialState);
  
  const value = {
    state,
    actions: {
      doSomething: () => {...}
    }
  };
  
  return (
    <MyContext.Provider value={value}>
      {children}
    </MyContext.Provider>
  );
}

// Custom Hook
export function useMyContext() {
  const context = useContext(MyContext);
  if (!context) {
    throw new Error('useMyContext must be used within MyProvider');
  }
  return context;
}
```

### Available Contexts

#### AuthContext
```typescript
const { user, isAuthenticated, login, logout, changePassword } = useAuth();
```

#### SocketContext
```typescript
const { socket, isConnected, emit } = useSocket();
```

#### NotificationContext (if implemented)
```typescript
const { notifications, markAsRead, clearAll } = useNotifications();
```

---

## Form Handling

### React Hook Form + Zod

**Pattern:**
```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  age: z.number().min(18, 'Must be 18+')
});

type FormData = z.infer<typeof schema>;

function MyForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<FormData>({
    resolver: zodResolver(schema)
  });
  
  const onSubmit = async (data: FormData) => {
    try {
      await api.post('/endpoint', data);
      toast.success('Saved!');
      reset();
    } catch (error) {
      toast.error('Error saving');
    }
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <TextField
        {...register('name')}
        error={!!errors.name}
        helperText={errors.name?.message}
      />
      <Button type="submit">Submit</Button>
    </form>
  );
}
```

---

## Real-Time Features (Socket.IO)

### SocketContext Setup
```tsx
const socket = io(SOCKET_URL, {
  auth: {
    token: tokenManager.getToken()
  },
  transports: ['websocket']
});

socket.on('connect', () => {
  console.log('Connected');
  socket.emit('join_room', userId);
});

socket.on('notification', (data) => {
  // Show toast notification
  // Update notification count
});
```

### Usage in Components
```tsx
const { socket } = useSocket();

useEffect(() => {
  socket?.on('demand_order_updated', (data) => {
    // Refresh order list
    fetchOrders();
  });
  
  return () => {
    socket?.off('demand_order_updated');
  };
}, [socket]);
```

---

## Theme Configuration

### ThemeProvider (theme/ThemeProvider.tsx)

**Light Theme:**
```typescript
const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0'
    },
    secondary: {
      main: '#9c27b0'
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff'
    }
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' }
    }
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none'
        }
      }
    }
  }
});
```

**Dark Theme:**
```typescript
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#90caf9'
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e'
    }
  }
});
```

---

## Performance Optimization

### 1. Code Splitting
```tsx
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <CircularProgress />,
  ssr: false
});
```

### 2. Memoization
```tsx
import { memo, useMemo, useCallback } from 'react';

const ExpensiveComponent = memo(({ data }) => {
  const processedData = useMemo(() => {
    return data.map(item => expensiveOperation(item));
  }, [data]);
  
  const handleClick = useCallback(() => {
    doSomething();
  }, [dependency]);
  
  return <div>{processedData}</div>;
});
```

### 3. Pagination
```tsx
const [page, setPage] = useState(1);
const [pageSize, setPageSize] = useState(10);

const { data, isLoading } = useQuery(['items', page, pageSize], 
  () => api.get(`/items?page=${page}&limit=${pageSize}`)
);
```

---

## Utilities & Helpers

### Date Formatting
```typescript
import { format } from 'date-fns';

// Display format (Bangladesh)
const displayDate = format(date, 'dd/MM/yy');

// ISO format for API
const isoDate = date.toISOString();
```

### Permission Checking
```typescript
// lib/permissions.ts
export function hasPermission(user: User, permission: string): boolean {
  return user.permissions?.includes(permission) || false;
}

export function hasAnyPermission(user: User, permissions: string[]): boolean {
  return permissions.some(p => hasPermission(user, p));
}
```

### Number Formatting
```typescript
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: 'BDT'
  }).format(amount);
};
```

---

## Environment Variables

**.env.local:**
```bash
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

**.env.production:**
```bash
NEXT_PUBLIC_API_URL=https://api.pustihappytimes.com/api/v1
NEXT_PUBLIC_SOCKET_URL=https://api.pustihappytimes.com
```

---

## Build & Deployment

### Development
```bash
npm run dev         # Start dev server (port 3000)
```

### Production
```bash
npm run build       # Build for production
npm start           # Start production server
```

### Docker
```bash
docker build -t pusti-frontend .
docker run -p 3000:3000 pusti-frontend
```

---

## Next: [DATABASE_CONTEXT.md](./DATABASE_CONTEXT.md)
