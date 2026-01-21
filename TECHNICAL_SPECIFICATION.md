# TECHNICAL SPECIFICATION DOCUMENT
## Pusti Happy Times - Sales Management ERP System
### Primary & Secondary Sales Management Platform

---

## DOCUMENT CONTROL

| Field | Details |
|-------|---------|
| **Project Name** | Pusti Happy Times Sales Management ERP |
| **Client** | TK Group, Bangladesh |
| **Document Type** | Technical Specification |
| **Version** | 1.0 |
| **Date** | January 21, 2026 |
| **Status** | Final |
| **Prepared By** | Development Team |
| **Approved By** | Technical Architect |

---

## TABLE OF CONTENTS

1. [Introduction](#1-introduction)
2. [System Architecture](#2-system-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Database Design](#4-database-design)
5. [API Specifications](#5-api-specifications)
6. [Security Architecture](#6-security-architecture)
7. [Module Technical Details](#7-module-technical-details)
8. [Integration Architecture](#8-integration-architecture)
9. [Performance Specifications](#9-performance-specifications)
10. [Deployment Architecture](#10-deployment-architecture)
11. [Testing Strategy](#11-testing-strategy)
12. [Code Structure](#12-code-structure)
13. [Data Flow Architecture](#13-data-flow-architecture)
14. [Error Handling & Logging](#14-error-handling--logging)
15. [Scalability & High Availability](#15-scalability--high-availability)

---

## 1. INTRODUCTION

### 1.1 Purpose

This document provides comprehensive technical specifications for the Pusti Happy Times Sales Management ERP System, covering both Primary Sales (Factory → Distributor) and Secondary Sales (Distributor → Retailer) modules.

### 1.2 Scope

The technical specification covers:
- **Primary Sales System:** 12 integrated modules
- **Secondary Sales System:** 9 integrated modules
- **Cross-cutting Concerns:** Security, performance, scalability
- **Infrastructure:** Deployment, monitoring, backup strategies

### 1.3 Audience

- **Technical Team:** Developers, architects, DevOps engineers
- **QA Team:** Test engineers, automation specialists
- **Client IT Team:** System administrators, database administrators
- **Project Managers:** Technical project coordinators

### 1.4 System Overview

**Architecture Type:** Monolithic with modular design (microservices-ready)

**Key Components:**
- **Backend API:** Node.js + Express.js
- **Frontend Application:** Next.js 14 + TypeScript
- **Database:** MongoDB (NoSQL)
- **Cache Layer:** Redis
- **Real-time Engine:** Socket.IO
- **File Storage:** Local filesystem (scalable to S3/Cloud)

---

## 2. SYSTEM ARCHITECTURE

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│  Web Browser (Desktop/Mobile)  │  Mobile Apps (iOS/Android)     │
│  - Next.js 14 SSR/CSR          │  - React Native/PWA           │
│  - Material-UI Components       │  - Offline-first              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      LOAD BALANCER (Nginx)                       │
│  - SSL Termination  │  Rate Limiting  │  Request Routing        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     APPLICATION LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│                    Node.js + Express.js API                      │
│  ┌─────────────┬──────────────┬──────────────┬────────────┐    │
│  │ Auth        │ Master Data  │ Orders       │ Inventory  │    │
│  │ Middleware  │ Management   │ Management   │ Management │    │
│  └─────────────┴──────────────┴──────────────┴────────────┘    │
│  ┌─────────────┬──────────────┬──────────────┬────────────┐    │
│  │ Collections │ Distribution │ Offers       │ Reports    │    │
│  │ Management  │ Scheduling   │ Engine       │ Generator  │    │
│  └─────────────┴──────────────┴──────────────┴────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     BUSINESS LOGIC LAYER                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Controllers (Request Handlers)                           │  │
│  │  - Input Validation  │  Business Rules  │  Response      │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Services (Business Logic)                                │  │
│  │  - Offer Calculations  │  Workflow Engines  │  Ledger    │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                        DATA LAYER                                │
├──────────────────────┬──────────────────────┬──────────────────┤
│   MongoDB (Primary)  │  Redis (Cache)       │  File Storage    │
│   - Documents        │  - Session Store     │  - Images        │
│   - Collections      │  - Cache Layer       │  - Documents     │
│   - Indexes          │  - Queue             │  - Exports       │
└──────────────────────┴──────────────────────┴──────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    EXTERNAL INTEGRATIONS                         │
├─────────────────────────────────────────────────────────────────┤
│  SMS Gateway  │  Email Service  │  Maps API  │  Payment Gateway│
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Component Architecture

#### 2.2.1 Frontend Architecture

```
frontend/
├── src/
│   ├── app/                    # Next.js 14 App Router
│   │   ├── (auth)/            # Authentication routes
│   │   ├── admin/             # Admin panel
│   │   ├── distributor/       # Distributor portal
│   │   ├── product/           # Product management
│   │   ├── orders/            # Order management
│   │   ├── inventory/         # Inventory module
│   │   ├── collections/       # Collections module
│   │   ├── reports/           # Reporting module
│   │   └── dashboard/         # Dashboard
│   │
│   ├── components/            # Reusable components
│   │   ├── common/           # Common UI components
│   │   ├── layout/           # Layout components
│   │   ├── forms/            # Form components
│   │   └── charts/           # Chart components
│   │
│   ├── contexts/              # React Context API
│   │   ├── AuthContext.tsx   # Authentication state
│   │   ├── SocketContext.tsx # Socket.IO connection
│   │   └── NotificationContext.tsx
│   │
│   ├── lib/                   # Libraries & utilities
│   │   ├── api.ts            # Axios API client
│   │   ├── auth.ts           # Auth helpers
│   │   └── utils.ts          # Utility functions
│   │
│   ├── services/              # API service layer
│   │   ├── authService.ts
│   │   ├── productService.ts
│   │   └── orderService.ts
│   │
│   ├── types/                 # TypeScript definitions
│   │   ├── user.ts
│   │   ├── product.ts
│   │   └── order.ts
│   │
│   └── hooks/                 # Custom React hooks
│       ├── useAuth.ts
│       ├── useSocket.ts
│       └── useNotifications.ts
│
├── public/                    # Static assets
│   ├── images/
│   ├── icons/
│   └── fonts/
│
└── next.config.js            # Next.js configuration
```

#### 2.2.2 Backend Architecture

```
backend/
├── src/
│   ├── models/               # Mongoose schemas
│   │   ├── User.js
│   │   ├── Role.js
│   │   ├── Product.js
│   │   ├── DemandOrder.js
│   │   ├── Collection.js
│   │   └── ... (50+ models)
│   │
│   ├── routes/               # Express routes
│   │   ├── auth.js          # Authentication endpoints
│   │   ├── users.js         # User management
│   │   ├── products.js      # Product CRUD
│   │   ├── demandOrders.js  # Order management
│   │   ├── collections.js   # Collections
│   │   └── ... (30+ route files)
│   │
│   ├── middleware/           # Express middleware
│   │   ├── auth.js          # JWT verification
│   │   ├── validation.js    # Input validation
│   │   ├── errorHandler.js  # Error handling
│   │   └── rateLimiter.js   # Rate limiting
│   │
│   ├── services/             # Business logic services
│   │   ├── offerEngine.js   # Offer calculations
│   │   ├── workflowEngine.js # Approval workflows
│   │   ├── ledgerService.js # Ledger management
│   │   └── reportService.js # Report generation
│   │
│   ├── utils/                # Utility functions
│   │   ├── redis.js         # Redis client
│   │   ├── logger.js        # Logging
│   │   └── helpers.js       # Helper functions
│   │
│   ├── config/               # Configuration
│   │   ├── database.js      # MongoDB config
│   │   ├── redis.js         # Redis config
│   │   └── constants.js     # App constants
│   │
│   └── app.js                # Express app setup
│
├── public/                   # Static file serving
│   └── images/
│       ├── categories/
│       └── products/
│
├── .env                      # Environment variables
└── server.js                 # Entry point
```

### 2.3 Design Patterns

#### 2.3.1 Backend Patterns

**1. Model-Route-Controller (MRC) Pattern**
```javascript
// Model Layer (Mongoose Schema)
const demandOrderSchema = new mongoose.Schema({...});

// Route Layer (Express Router)
router.post('/demand-orders', authenticate, requirePermission, 
  demandOrderController.create);

// Controller Layer (Business Logic)
async function create(req, res) {
  // Validation, business logic, response
}
```

**2. Middleware Chain Pattern**
```javascript
router.post('/orders',
  authenticate,           // JWT verification
  requireApiPermission,   // Permission check
  validateInput,          // Input validation
  orderController.create  // Business logic
);
```

**3. Service Layer Pattern**
```javascript
// Reusable business logic
class OfferEngine {
  calculateDiscount(offer, orderItems) {...}
  validateOffer(offer) {...}
  applyBundleRules(bundle, items) {...}
}
```

**4. Repository Pattern** (for complex queries)
```javascript
class OrderRepository {
  async findPendingOrders(filters) {...}
  async updateOrderStatus(orderId, status) {...}
}
```

#### 2.3.2 Frontend Patterns

**1. Container-Presenter Pattern**
```typescript
// Container (Logic)
function OrdersContainer() {
  const [orders, setOrders] = useState([]);
  const loadOrders = async () => {...};
  return <OrdersView orders={orders} />;
}

// Presenter (UI)
function OrdersView({ orders }) {
  return <div>{orders.map(...)}</div>;
}
```

**2. Custom Hooks Pattern**
```typescript
function useOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const fetchOrders = async () => {...};
  
  return { orders, loading, fetchOrders };
}
```

**3. Context API for Global State**
```typescript
const AuthContext = createContext();

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}
```

---

## 3. TECHNOLOGY STACK

### 3.1 Backend Technologies

#### 3.1.1 Core Framework

**Node.js (v18.x LTS)**
- **Purpose:** Server-side runtime
- **Justification:** 
  - High performance for I/O operations
  - Large ecosystem (npm)
  - JavaScript across full stack
  - Non-blocking, event-driven architecture
- **Version:** 18.x LTS (Long Term Support)

**Express.js (v4.x)**
- **Purpose:** Web application framework
- **Justification:**
  - Minimal and flexible
  - Robust middleware ecosystem
  - Industry standard
  - Easy to scale
- **Key Features:**
  - Routing
  - Middleware support
  - Template engine support
  - Static file serving

#### 3.1.2 Database & Cache

**MongoDB (v6.0+)**
- **Purpose:** Primary database
- **Justification:**
  - Document-oriented (flexible schema)
  - Horizontal scalability
  - Rich query language
  - Aggregation framework
  - Geospatial capabilities (for GPS tracking)
- **Configuration:**
  ```javascript
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000
  }
  ```

**Mongoose (v7.x)**
- **Purpose:** ODM (Object Data Modeling)
- **Features:**
  - Schema validation
  - Middleware (pre/post hooks)
  - Virtuals and methods
  - Population (joins)
  - Query building

**Redis (v7.0+)**
- **Purpose:** In-memory cache & session store
- **Use Cases:**
  - Session management
  - API response caching
  - Rate limiting
  - Queue management
  - Real-time analytics
- **Configuration:**
  ```javascript
  {
    host: process.env.REDIS_HOST,
    port: 6379,
    password: process.env.REDIS_PASSWORD,
    db: 0,
    retryStrategy: (times) => Math.min(times * 50, 2000)
  }
  ```

#### 3.1.3 Authentication & Security

**jsonwebtoken (JWT)**
- **Purpose:** Token-based authentication
- **Token Types:**
  - Access Token (15 min expiry)
  - Refresh Token (7 days expiry)
- **Payload:**
  ```javascript
  {
    id: user._id,
    username: user.username,
    role: user.role_id,
    tokenVersion: user.tokenVersion
  }
  ```

**bcryptjs**
- **Purpose:** Password hashing
- **Configuration:**
  - Salt rounds: 10
  - Algorithm: bcrypt with salt
- **Usage:**
  ```javascript
  const hashedPassword = await bcrypt.hash(password, 10);
  const isValid = await bcrypt.compare(password, hashedPassword);
  ```

**helmet**
- **Purpose:** HTTP security headers
- **Headers Set:**
  - Content-Security-Policy
  - X-DNS-Prefetch-Control
  - X-Frame-Options
  - X-Content-Type-Options
  - Strict-Transport-Security

**cors**
- **Purpose:** Cross-Origin Resource Sharing
- **Configuration:**
  ```javascript
  {
    origin: process.env.FRONTEND_URL,
    credentials: true,
    optionsSuccessStatus: 200
  }
  ```

#### 3.1.4 Validation & File Handling

**Joi**
- **Purpose:** Schema validation
- **Use Cases:**
  - Request body validation
  - Query parameter validation
  - Environment variable validation

**Multer**
- **Purpose:** File upload handling
- **Configuration:**
  ```javascript
  {
    storage: diskStorage({
      destination: 'public/images/categories/',
      filename: (req, file, cb) => {
        const uniqueName = `category-${Date.now()}-${randomBytes(8).toString('hex')}`;
        cb(null, uniqueName + path.extname(file.originalname));
      }
    }),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
      const allowedTypes = /jpeg|jpg|png|gif/;
      const isValid = allowedTypes.test(file.mimetype);
      cb(null, isValid);
    }
  }
  ```

#### 3.1.5 Real-time Communication

**Socket.IO (v4.x)**
- **Purpose:** Real-time bidirectional communication
- **Features:**
  - WebSocket with fallback
  - Room-based broadcasting
  - Automatic reconnection
  - Binary support
- **Use Cases:**
  - Push notifications
  - Live dashboard updates
  - Chat/messaging
  - GPS tracking updates

### 3.2 Frontend Technologies

#### 3.2.1 Core Framework

**Next.js 14**
- **Purpose:** React framework with SSR/SSG
- **Key Features:**
  - App Router (new routing system)
  - Server Components
  - Streaming SSR
  - API Routes
  - Automatic code splitting
  - Image optimization
  - Built-in CSS support
- **Justification:**
  - SEO-friendly
  - Fast page loads
  - Developer experience
  - Production-ready

**React 18**
- **Purpose:** UI library
- **Key Features:**
  - Concurrent rendering
  - Automatic batching
  - Suspense
  - Server Components
  - Hooks API

**TypeScript (v5.x)**
- **Purpose:** Type safety
- **Benefits:**
  - Early error detection
  - Better IDE support
  - Code documentation
  - Refactoring confidence
- **Configuration:**
  ```json
  {
    "compilerOptions": {
      "target": "ES2020",
      "lib": ["ES2020", "DOM"],
      "jsx": "preserve",
      "module": "ESNext",
      "strict": true,
      "esModuleInterop": true,
      "skipLibCheck": true,
      "forceConsistentCasingInFileNames": true,
      "moduleResolution": "node",
      "resolveJsonModule": true,
      "isolatedModules": true,
      "incremental": true,
      "plugins": [{ "name": "next" }],
      "paths": {
        "@/*": ["./src/*"]
      }
    }
  }
  ```

#### 3.2.2 UI Framework

**Material-UI (MUI v5)**
- **Purpose:** Component library
- **Components Used:**
  - Layout: Box, Container, Grid, Stack
  - Inputs: TextField, Select, Checkbox, Switch
  - Navigation: AppBar, Drawer, Tabs, Breadcrumbs
  - Data Display: Table, Card, Chip, Avatar, Badge
  - Feedback: Alert, Dialog, Snackbar, Progress
  - Utils: Modal, Popover, Tooltip, Collapse
- **Theming:**
  ```typescript
  const theme = createTheme({
    palette: {
      primary: { main: '#1976d2' },
      secondary: { main: '#dc004e' }
    },
    typography: {
      fontFamily: 'Roboto, Arial, sans-serif'
    }
  });
  ```

**@emotion/react & @emotion/styled**
- **Purpose:** CSS-in-JS styling
- **Used by:** Material-UI

#### 3.2.3 State Management

**React Context API**
- **Purpose:** Global state management
- **Contexts:**
  - AuthContext (user authentication)
  - SocketContext (WebSocket connection)
  - NotificationContext (notifications)
  - ThemeContext (UI theme)

**React Hook Form**
- **Purpose:** Form management
- **Features:**
  - Performance optimized
  - Minimal re-renders
  - Built-in validation
  - TypeScript support
- **Usage:**
  ```typescript
  const { register, handleSubmit, formState: { errors } } = useForm();
  ```

#### 3.2.4 HTTP & Real-time

**Axios**
- **Purpose:** HTTP client
- **Features:**
  - Promise-based
  - Request/response interceptors
  - Automatic JSON transformation
  - Request cancellation
- **Configuration:**
  ```typescript
  const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL,
    timeout: 10000,
    headers: { 'Content-Type': 'application/json' }
  });
  
  // Request interceptor (add auth token)
  api.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });
  
  // Response interceptor (handle errors)
  api.interceptors.response.use(
    response => response,
    error => {
      if (error.response?.status === 401) {
        // Handle unauthorized
      }
      return Promise.reject(error);
    }
  );
  ```

**Socket.IO Client**
- **Purpose:** Real-time communication
- **Connection:**
  ```typescript
  const socket = io(process.env.NEXT_PUBLIC_API_URL, {
    auth: { token: localStorage.getItem('token') },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5
  });
  ```

#### 3.2.5 Data Visualization

**Chart.js**
- **Purpose:** Charts and graphs
- **Chart Types:**
  - Line charts (trends)
  - Bar charts (comparisons)
  - Pie charts (distributions)
  - Doughnut charts (percentages)

**Recharts**
- **Purpose:** React charting library
- **Features:**
  - Composable charts
  - Responsive design
  - Animation support

#### 3.2.6 Utilities

**date-fns**
- **Purpose:** Date manipulation
- **Functions:**
  - format, parse
  - add, subtract
  - difference calculations
  - Locale support

**react-hot-toast**
- **Purpose:** Toast notifications
- **Features:**
  - Customizable
  - Promise handling
  - Accessible

### 3.3 DevOps & Deployment

#### 3.3.1 Containerization

**Docker**
- **Purpose:** Container platform
- **Images:**
  - node:18-alpine (backend)
  - node:18-alpine (frontend)
  - mongo:6.0 (database)
  - redis:7.0-alpine (cache)

**Docker Compose**
- **Purpose:** Multi-container orchestration
- **Services:**
  ```yaml
  version: '3.8'
  services:
    backend:
      build: ./backend
      ports: ["5000:5000"]
      depends_on: [mongodb, redis]
      
    frontend:
      build: ./frontend
      ports: ["3000:3000"]
      depends_on: [backend]
      
    mongodb:
      image: mongo:6.0
      volumes: [mongodb_data:/data/db]
      
    redis:
      image: redis:7.0-alpine
      volumes: [redis_data:/data]
  ```

#### 3.3.2 Web Server

**Nginx**
- **Purpose:** Reverse proxy, load balancer
- **Configuration:**
  ```nginx
  upstream backend {
    server backend:5000;
  }
  
  server {
    listen 80;
    server_name example.com;
    
    location /api {
      proxy_pass http://backend;
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection 'upgrade';
      proxy_set_header Host $host;
      proxy_cache_bypass $http_upgrade;
    }
    
    location / {
      proxy_pass http://frontend:3000;
    }
  }
  ```

#### 3.3.3 Process Management

**PM2 (Optional)**
- **Purpose:** Node.js process manager
- **Features:**
  - Auto-restart on crash
  - Load balancing
  - Log management
  - Monitoring

### 3.4 Development Tools

**ESLint**
- **Purpose:** JavaScript linting
- **Rules:** Airbnb style guide

**Prettier**
- **Purpose:** Code formatting
- **Configuration:**
  ```json
  {
    "semi": true,
    "singleQuote": true,
    "tabWidth": 2,
    "printWidth": 100
  }
  ```

**Nodemon**
- **Purpose:** Auto-restart on file changes (development)

---

## 4. DATABASE DESIGN

### 4.1 Database Schema Architecture

**Database Type:** MongoDB (NoSQL Document Database)

**Design Principles:**
1. **Document-Oriented:** Related data embedded in documents
2. **Hybrid Approach:** Mix of embedded and referenced data
3. **Denormalization:** Strategic duplication for performance
4. **Indexing Strategy:** Comprehensive indexes for query optimization
5. **Audit Trail:** All collections track creation/modification
6. **Soft Delete:** Logical deletion with archived flag (where applicable)

### 4.2 Collections Overview

**Total Collections:** 50+

**Categories:**
- **Authentication & Authorization:** 5 collections
- **Master Data:** 12 collections
- **Distributor Management:** 2 collections
- **Offers & Promotions:** 3 collections
- **Order Management:** 1 collection (with embedded scheduling)
- **Collections & Finance:** 2 collections
- **Inventory Management:** 8 collections
- **Reporting:** 2 collections
- **Notifications:** 1 collection
- **Secondary Sales:** 15 collections

### 4.3 Core Schema Definitions

#### 4.3.1 Authentication Schemas

**users Collection:**
```javascript
{
  _id: ObjectId,
  username: String (unique, indexed),
  password: String (hashed, bcrypt),
  email: String (unique, indexed),
  role_id: ObjectId (ref: roles),
  user_type: String (enum: ['employee', 'distributor']),
  employee_id: ObjectId (ref: employees, conditional),
  distributor_id: ObjectId (ref: distributors, conditional),
  dsr_id: ObjectId (ref: dsrs, optional),
  tokenVersion: Number (default: 0),
  active: Boolean (default: true),
  created_at: Date,
  created_by: ObjectId (ref: users),
  updated_at: Date,
  updated_by: ObjectId (ref: users)
}

// Indexes
db.users.createIndex({ username: 1 }, { unique: true });
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ role_id: 1 });
db.users.createIndex({ user_type: 1 });
db.users.createIndex({ employee_id: 1 }, { sparse: true });
db.users.createIndex({ distributor_id: 1 }, { sparse: true });
```

**roles Collection:**
```javascript
{
  _id: ObjectId,
  role: String (unique, indexed),
  description: String,
  active: Boolean (default: true),
  created_at: Date,
  created_by: ObjectId (ref: users),
  updated_at: Date,
  updated_by: ObjectId (ref: users)
}

// Indexes
db.roles.createIndex({ role: 1 }, { unique: true });
db.roles.createIndex({ active: 1 });
```

**apipermissions Collection:**
```javascript
{
  _id: ObjectId,
  code: String (unique, e.g., 'users:read'),
  name: String,
  description: String,
  category: String (e.g., 'User Management'),
  active: Boolean,
  created_at: Date,
  created_by: ObjectId (ref: users),
  updated_at: Date,
  updated_by: ObjectId (ref: users)
}

// Indexes
db.apipermissions.createIndex({ code: 1 }, { unique: true });
db.apipermissions.createIndex({ category: 1 });
```

**rolesapipermissions Collection (Many-to-Many):**
```javascript
{
  _id: ObjectId,
  role_id: ObjectId (ref: roles),
  api_permission_id: ObjectId (ref: apipermissions),
  created_at: Date,
  created_by: ObjectId (ref: users)
}

// Indexes
db.rolesapipermissions.createIndex({ role_id: 1, api_permission_id: 1 }, { unique: true });
db.rolesapipermissions.createIndex({ role_id: 1 });
```

**sidebarmenuitem Collection:**
```javascript
{
  _id: ObjectId,
  label: String,
  path: String,
  icon: String,
  parent_id: ObjectId (ref: sidebarmenuitem, nullable),
  order: Number,
  roles: [ObjectId] (ref: roles),
  active: Boolean,
  created_at: Date,
  created_by: ObjectId (ref: users),
  updated_at: Date,
  updated_by: ObjectId (ref: users)
}

// Indexes
db.sidebarmenuitem.createIndex({ parent_id: 1, order: 1 });
db.sidebarmenuitem.createIndex({ roles: 1 });
```

#### 4.3.2 Master Data Schemas

**products Collection:**
```javascript
{
  _id: ObjectId,
  product_id: String (unique, indexed, e.g., 'SKU001'),
  name: String (indexed),
  description: String,
  brand_id: ObjectId (ref: brands, indexed),
  category_ids: [ObjectId] (ref: categories, indexed),
  segment: String (enum: ['BIS', 'BEV'], indexed),
  unit: String (e.g., 'PCS', 'KG'),
  unit_price: Number,
  mrp: Number,
  tax_rate: Number,
  hsn_code: String,
  active: Boolean (indexed),
  created_at: Date,
  created_by: ObjectId (ref: users),
  updated_at: Date,
  updated_by: ObjectId (ref: users)
}

// Indexes
db.products.createIndex({ product_id: 1 }, { unique: true });
db.products.createIndex({ name: 'text' });
db.products.createIndex({ brand_id: 1, active: 1 });
db.products.createIndex({ category_ids: 1 });
db.products.createIndex({ segment: 1 });
```

**territories Collection:**
```javascript
{
  _id: ObjectId,
  name: String (indexed),
  code: String (unique, indexed),
  level: String (enum: ['ZONE', 'REGION', 'AREA', 'DB_POINT'], indexed),
  parent_id: ObjectId (ref: territories, nullable, indexed),
  active: Boolean,
  created_at: Date,
  created_by: ObjectId (ref: users),
  updated_at: Date,
  updated_by: ObjectId (ref: users)
}

// Indexes
db.territories.createIndex({ code: 1 }, { unique: true });
db.territories.createIndex({ parent_id: 1, level: 1 });
db.territories.createIndex({ level: 1, active: 1 });
db.territories.createIndex({ name: 'text' });

// Compound index for hierarchy queries
db.territories.createIndex({ level: 1, parent_id: 1, active: 1 });
```

**employees Collection:**
```javascript
{
  _id: ObjectId,
  employee_id: String (unique, indexed),
  name: String (indexed),
  designation_id: ObjectId (ref: designations, indexed),
  facility_id: ObjectId (ref: facilities, indexed),
  territory_id: ObjectId (ref: territories, indexed),
  mobile: String,
  email: String,
  joining_date: Date,
  active: Boolean (indexed),
  created_at: Date,
  created_by: ObjectId (ref: users),
  updated_at: Date,
  updated_by: ObjectId (ref: users)
}

// Indexes
db.employees.createIndex({ employee_id: 1 }, { unique: true });
db.employees.createIndex({ name: 'text' });
db.employees.createIndex({ designation_id: 1, active: 1 });
db.employees.createIndex({ facility_id: 1 });
db.employees.createIndex({ territory_id: 1 });
```

**facilities Collection:**
```javascript
{
  _id: ObjectId,
  facility_id: String (unique, indexed),
  name: String (indexed),
  type: String (enum: ['FACTORY', 'DEPOT'], indexed),
  address: {
    street: String,
    city: String,
    state: String,
    postal_code: String,
    country: String (default: 'Bangladesh')
  },
  segments: [String] (enum: ['BIS', 'BEV']),
  active: Boolean (indexed),
  created_at: Date,
  created_by: ObjectId (ref: users),
  updated_at: Date,
  updated_by: ObjectId (ref: users)
}

// Indexes
db.facilities.createIndex({ facility_id: 1 }, { unique: true });
db.facilities.createIndex({ type: 1, active: 1 });
db.facilities.createIndex({ segments: 1 });
```

#### 4.3.3 Distributor Schema

**distributors Collection:**
```javascript
{
  _id: ObjectId,
  distributor_id: String (unique, indexed),
  name: String (indexed),
  db_point_id: ObjectId (ref: territories, indexed),
  segment: String (enum: ['BIS', 'BEV'], indexed),
  contact_person: String,
  mobile: String,
  email: String,
  address: {
    street: String,
    city: String,
    state: String,
    postal_code: String
  },
  credit_limit: Number,
  credit_days: Number,
  excluded_skus: [ObjectId] (ref: products),
  active: Boolean (indexed),
  created_at: Date,
  created_by: ObjectId (ref: users),
  updated_at: Date,
  updated_by: ObjectId (ref: users)
}

// Indexes
db.distributors.createIndex({ distributor_id: 1 }, { unique: true });
db.distributors.createIndex({ name: 'text' });
db.distributors.createIndex({ db_point_id: 1, active: 1 });
db.distributors.createIndex({ segment: 1 });
```

**distributorstocks Collection:**
```javascript
{
  _id: ObjectId,
  distributor_id: ObjectId (ref: distributors, indexed),
  product_id: ObjectId (ref: products, indexed),
  quantity: Number,
  last_updated: Date,
  created_at: Date,
  updated_at: Date
}

// Indexes
db.distributorstocks.createIndex({ distributor_id: 1, product_id: 1 }, { unique: true });
db.distributorstocks.createIndex({ product_id: 1 });
```

#### 4.3.4 Offers Schema

**offers Collection:**
```javascript
{
  _id: ObjectId,
  offer_code: String (unique, indexed),
  offer_name: String (indexed),
  offer_type: String (enum: ['BOGO', 'BUNDLE_OFFER', 'FLAT_DISCOUNT_PCT', 
    'FLAT_DISCOUNT_AMT', 'DISCOUNT_SLAB_PCT', 'DISCOUNT_SLAB_AMT', 
    'VOLUME_DISCOUNT', 'FREE_PRODUCT'], indexed),
  
  // BOGO specific
  buy_product_id: ObjectId (ref: products),
  buy_quantity: Number,
  get_product_id: ObjectId (ref: products),
  get_quantity: Number,
  
  // Bundle specific
  bundle_items: [{
    product_id: ObjectId (ref: products),
    quantity: Number
  }],
  bundle_price: Number,
  
  // Discount specific
  discount_percentage: Number,
  discount_amount: Number,
  
  // Slab specific
  slabs: [{
    min_quantity: Number,
    max_quantity: Number,
    discount_percentage: Number,
    discount_amount: Number
  }],
  
  // Free product specific
  threshold_product_id: ObjectId (ref: products),
  threshold_quantity: Number,
  free_product_id: ObjectId (ref: products),
  free_quantity: Number,
  
  start_date: Date (indexed),
  end_date: Date (indexed),
  active: Boolean (indexed),
  created_at: Date,
  created_by: ObjectId (ref: users),
  updated_at: Date,
  updated_by: ObjectId (ref: users)
}

// Indexes
db.offers.createIndex({ offer_code: 1 }, { unique: true });
db.offers.createIndex({ offer_type: 1, active: 1 });
db.offers.createIndex({ start_date: 1, end_date: 1 });
db.offers.createIndex({ 
  active: 1, 
  start_date: 1, 
  end_date: 1 
}, { 
  name: 'active_offers_date_range' 
});
```

**offersends Collection:**
```javascript
{
  _id: ObjectId,
  offer_id: ObjectId (ref: offers, indexed),
  distributor_ids: [ObjectId] (ref: distributors, indexed),
  sent_date: Date,
  sent_by: ObjectId (ref: users),
  created_at: Date,
  created_by: ObjectId (ref: users)
}

// Indexes
db.offersends.createIndex({ offer_id: 1 });
db.offersends.createIndex({ distributor_ids: 1 });
db.offersends.createIndex({ sent_date: -1 });
```

**offerreceives Collection:**
```javascript
{
  _id: ObjectId,
  offer_send_id: ObjectId (ref: offersends, indexed),
  distributor_id: ObjectId (ref: distributors, indexed),
  status: String (enum: ['PENDING', 'ACCEPTED', 'REJECTED'], indexed),
  received_date: Date,
  notes: String,
  created_at: Date,
  updated_at: Date
}

// Indexes
db.offerreceives.createIndex({ offer_send_id: 1, distributor_id: 1 }, { unique: true });
db.offerreceives.createIndex({ distributor_id: 1, status: 1 });
```

#### 4.3.5 Demand Orders Schema

**demandorders Collection:**
```javascript
{
  _id: ObjectId,
  order_number: String (unique, indexed),
  distributor_id: ObjectId (ref: distributors, indexed),
  db_point_id: ObjectId (ref: territories, indexed),
  
  items: [{
    _id: ObjectId (auto-generated),
    product_id: ObjectId (ref: products),
    quantity: Number,
    unit_price: Number,
    offer_id: ObjectId (ref: offers, nullable),
    bundle_id: String (nullable, for BOGO/Bundle tracking),
    total_amount: Number
  }],
  
  total_amount: Number,
  
  status: String (enum: ['DRAFT', 'SUBMITTED', 'ASM_APPROVED', 'RSM_APPROVED', 
    'REJECTED', 'SCHEDULED', 'COMPLETED'], indexed),
  
  // Approval tracking
  submitted_at: Date,
  asm_approved_by: ObjectId (ref: users),
  asm_approved_at: Date,
  rsm_approved_by: ObjectId (ref: users),
  rsm_approved_at: Date,
  rejection_reason: String,
  rejected_by: ObjectId (ref: users),
  rejected_at: Date,
  
  // Embedded scheduling
  schedules: [{
    _id: ObjectId (auto-generated),
    schedule_date: Date,
    facility_id: ObjectId (ref: facilities),
    items: [{
      product_id: ObjectId (ref: products),
      scheduled_quantity: Number,
      bundle_id: String (nullable)
    }],
    status: String (enum: ['SCHEDULED', 'DISPATCHED', 'DELIVERED']),
    scheduled_by: ObjectId (ref: users),
    scheduled_at: Date
  }],
  
  created_at: Date (indexed),
  created_by: ObjectId (ref: users),
  updated_at: Date,
  updated_by: ObjectId (ref: users)
}

// Indexes
db.demandorders.createIndex({ order_number: 1 }, { unique: true });
db.demandorders.createIndex({ distributor_id: 1, created_at: -1 });
db.demandorders.createIndex({ status: 1, created_at: -1 });
db.demandorders.createIndex({ db_point_id: 1, status: 1 });
db.demandorders.createIndex({ 'items.product_id': 1 });
db.demandorders.createIndex({ 'schedules.facility_id': 1, 'schedules.status': 1 });

// Compound index for approval queries
db.demandorders.createIndex({ 
  status: 1, 
  db_point_id: 1, 
  created_at: -1 
}, { 
  name: 'approval_workflow_index' 
});
```

#### 4.3.6 Collections & Finance Schemas

**collections Collection:**
```javascript
{
  _id: ObjectId,
  collection_number: String (unique, indexed),
  distributor_id: ObjectId (ref: distributors, indexed),
  collection_date: Date (indexed),
  amount: Number,
  
  payment_method: String (enum: ['CASH', 'BANK_TRANSFER', 'CHEQUE'], indexed),
  
  // Bank transfer details
  bank_id: ObjectId (ref: banks, nullable),
  transaction_reference: String,
  
  // Cheque details
  cheque_number: String,
  cheque_date: Date,
  cheque_bank: String,
  
  attachment_url: String,
  
  status: String (enum: ['PENDING', 'APPROVED', 'REJECTED', 'RETURNED'], indexed),
  approved_by: ObjectId (ref: users),
  approved_at: Date,
  rejection_reason: String,
  
  // Locking mechanism
  locked: Boolean (default: false),
  locked_by: ObjectId (ref: users),
  locked_at: Date,
  
  created_at: Date,
  created_by: ObjectId (ref: users),
  updated_at: Date,
  updated_by: ObjectId (ref: users)
}

// Indexes
db.collections.createIndex({ collection_number: 1 }, { unique: true });
db.collections.createIndex({ distributor_id: 1, collection_date: -1 });
db.collections.createIndex({ status: 1, collection_date: -1 });
db.collections.createIndex({ payment_method: 1 });
db.collections.createIndex({ locked: 1, status: 1 });
```

**customerledger Collection:**
```javascript
{
  _id: ObjectId,
  distributor_id: ObjectId (ref: distributors, indexed),
  transaction_date: Date (indexed),
  transaction_type: String (enum: ['ORDER', 'PAYMENT', 'RETURN', 'ADJUSTMENT'], indexed),
  reference_id: ObjectId (ref to demandorders/collections),
  reference_number: String,
  debit: Number (default: 0),
  credit: Number (default: 0),
  balance: Number,
  description: String,
  created_at: Date,
  created_by: ObjectId (ref: users)
}

// Indexes
db.customerledger.createIndex({ distributor_id: 1, transaction_date: -1 });
db.customerledger.createIndex({ transaction_type: 1 });
db.customerledger.createIndex({ reference_id: 1 });

// Compound index for ledger queries
db.customerledger.createIndex({ 
  distributor_id: 1, 
  transaction_date: -1, 
  _id: -1 
}, { 
  name: 'ledger_query_index' 
});
```

#### 4.3.7 Inventory Schemas

**factorystoreinventories Collection:**
```javascript
{
  _id: ObjectId,
  facility_id: ObjectId (ref: facilities, indexed),
  product_id: ObjectId (ref: products, indexed),
  quantity: Number,
  batch_number: String,
  manufacturing_date: Date,
  expiry_date: Date,
  rack_location: String,
  last_updated: Date,
  created_at: Date,
  updated_at: Date
}

// Indexes
db.factorystoreinventories.createIndex({ facility_id: 1, product_id: 1 });
db.factorystoreinventories.createIndex({ expiry_date: 1 });
db.factorystoreinventories.createIndex({ batch_number: 1 });
```

**inventoryrequisitions Collection:**
```javascript
{
  _id: ObjectId,
  requisition_number: String (unique, indexed),
  requesting_facility_id: ObjectId (ref: facilities, indexed),
  items: [{
    product_id: ObjectId (ref: products),
    requested_quantity: Number
  }],
  status: String (enum: ['PENDING', 'APPROVED', 'REJECTED', 'SCHEDULED'], indexed),
  approved_by: ObjectId (ref: users),
  approved_at: Date,
  created_at: Date,
  created_by: ObjectId (ref: users),
  updated_at: Date,
  updated_by: ObjectId (ref: users)
}

// Indexes
db.inventoryrequisitions.createIndex({ requisition_number: 1 }, { unique: true });
db.inventoryrequisitions.createIndex({ requesting_facility_id: 1, status: 1 });
db.inventoryrequisitions.createIndex({ created_at: -1 });
```

### 4.4 Secondary Sales Schemas

#### 4.4.1 Secondary Orders

**secondaryorders Collection:**
```javascript
{
  _id: ObjectId,
  order_number: String (unique, indexed),
  so_id: ObjectId (ref: employees, indexed),
  dsr_id: ObjectId (ref: distributors),
  pos_id: ObjectId (ref: outlets, indexed),
  route_id: ObjectId (ref: routes),
  
  items: [{
    product_id: ObjectId (ref: products),
    quantity: Number,
    unit_price: Number,
    total_amount: Number
  }],
  
  total_amount: Number,
  total_categories: Number,
  line_number: Number,
  memo_count: Number,
  
  order_date: Date (indexed),
  delivery_date: Date,
  
  status: String (enum: ['PENDING', 'DELIVERED', 'CANCELLED'], indexed),
  
  // GPS tracking
  gps_location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: [Number] // [longitude, latitude]
  },
  
  created_at: Date,
  created_by: ObjectId (ref: users),
  updated_at: Date,
  updated_by: ObjectId (ref: users)
}

// Indexes
db.secondaryorders.createIndex({ order_number: 1 }, { unique: true });
db.secondaryorders.createIndex({ so_id: 1, order_date: -1 });
db.secondaryorders.createIndex({ pos_id: 1, status: 1 });
db.secondaryorders.createIndex({ route_id: 1, order_date: -1 });
db.secondaryorders.createIndex({ gps_location: '2dsphere' });
```

#### 4.4.2 User Movement Tracking

**userlocations Collection:**
```javascript
{
  _id: ObjectId,
  user_id: ObjectId (ref: users, indexed),
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: [Number] // [longitude, latitude]
  },
  timestamp: Date (indexed),
  activity: String (enum: ['MOVING', 'AT_POS', 'IDLE']),
  pos_id: ObjectId (ref: outlets, nullable),
  created_at: Date
}

// Indexes
db.userlocations.createIndex({ user_id: 1, timestamp: -1 });
db.userlocations.createIndex({ location: '2dsphere' });
db.userlocations.createIndex({ timestamp: 1 }, { expireAfterSeconds: 2592000 }); // 30 days TTL
```

### 4.5 Indexing Strategy

#### 4.5.1 Index Types

**1. Single Field Indexes**
- Primary key (_id): automatic
- Unique constraints: username, email, order_number
- Query optimization: status, active, created_at

**2. Compound Indexes**
- Multi-field queries: { distributor_id: 1, created_at: -1 }
- Approval workflows: { status: 1, db_point_id: 1, created_at: -1 }
- Ledger queries: { distributor_id: 1, transaction_date: -1, _id: -1 }

**3. Text Indexes**
- Full-text search: name, description fields
- Example: db.products.createIndex({ name: 'text', description: 'text' })

**4. Geospatial Indexes**
- GPS tracking: { location: '2dsphere' }
- Proximity queries for outlet visits

**5. TTL Indexes**
- Auto-deletion: user sessions, temporary logs
- Example: { timestamp: 1 }, { expireAfterSeconds: 86400 }

#### 4.5.2 Index Monitoring

**Query Performance:**
```javascript
// Explain plan
db.demandorders.find({ status: 'SUBMITTED' }).explain('executionStats');

// Index usage stats
db.demandorders.aggregate([{ $indexStats: {} }]);
```

**Index Maintenance:**
```javascript
// Rebuild indexes
db.demandorders.reIndex();

// Remove unused index
db.demandorders.dropIndex('old_index_name');
```

### 4.6 Data Validation

**Schema-Level Validation (Mongoose):**
```javascript
const demandOrderSchema = new mongoose.Schema({
  order_number: {
    type: String,
    required: [true, 'Order number is required'],
    unique: true,
    match: [/^DO-\d{6}$/, 'Invalid order number format']
  },
  total_amount: {
    type: Number,
    required: true,
    min: [0, 'Amount cannot be negative']
  },
  status: {
    type: String,
    enum: {
      values: ['DRAFT', 'SUBMITTED', 'ASM_APPROVED', 'RSM_APPROVED', 'REJECTED'],
      message: '{VALUE} is not a valid status'
    }
  }
});
```

### 4.7 Data Migration & Seeding

**Migration Scripts:**
- create-indexes.js
- seed-master-data.js
- seed-test-users.js
- migrate-v1-to-v2.js

**Seed Data Categories:**
- Roles & Permissions (5 roles, 50+ permissions)
- Territories (4-level hierarchy)
- Products (100+ SKUs)
- Employees (50+ records)
- Distributors (30+ records)

---

## 5. API SPECIFICATIONS

### 5.1 API Architecture

**API Style:** RESTful

**Base URL:** `http://localhost:5000/api/v1`

**Versioning:** URI versioning (/api/v1/, /api/v2/)

**Authentication:** JWT Bearer Token

**Content Type:** application/json

### 5.2 Request/Response Format

#### 5.2.1 Standard Request Headers

```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
Accept: application/json
```

#### 5.2.2 Standard Response Format

**Success Response:**
```json
{
  "success": true,
  "data": { /* resource data */ },
  "message": "Operation successful",
  "pagination": {
    "currentPage": 1,
    "totalPages": 10,
    "totalCount": 95,
    "pageSize": 10
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error (dev mode only)",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

### 5.3 API Endpoints

#### 5.3.1 Authentication APIs

**POST /api/v1/auth/login**
```javascript
// Request
{
  "username": "admin",
  "password": "password123"
}

// Response (200)
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "_id": "...",
      "username": "admin",
      "email": "admin@example.com",
      "role": { "_id": "...", "role": "Super Admin" }
    },
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

**POST /api/v1/auth/refresh-token**
```javascript
// Request
{
  "refreshToken": "eyJhbGc..."
}

// Response (200)
{
  "success": true,
  "data": {
    "accessToken": "newAccessToken...",
    "refreshToken": "newRefreshToken..."
  }
}
```

**POST /api/v1/auth/logout**
```javascript
// Request (with Bearer token)
{}

// Response (200)
{
  "success": true,
  "message": "Logged out successfully"
}
```

**POST /api/v1/auth/logout-all-devices**
```javascript
// Request (with Bearer token)
{}

// Response (200)
{
  "success": true,
  "message": "Logged out from all devices"
}
```

**POST /api/v1/auth/change-password**
```javascript
// Request
{
  "currentPassword": "oldPass123",
  "newPassword": "newPass456"
}

// Response (200)
{
  "success": true,
  "message": "Password changed successfully"
}
```

#### 5.3.2 User Management APIs

**GET /api/v1/users**
```javascript
// Query Parameters
?page=1&limit=10&sort=username&search=admin&role=Super Admin

// Response (200)
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "username": "admin",
      "email": "admin@example.com",
      "role_id": { "_id": "...", "role": "Super Admin" },
      "active": true,
      "created_at": "2026-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalCount": 45,
    "pageSize": 10
  }
}
```

**GET /api/v1/users/:id**
```javascript
// Response (200)
{
  "success": true,
  "data": {
    "_id": "...",
    "username": "admin",
    "email": "admin@example.com",
    "role_id": { "_id": "...", "role": "Super Admin" },
    "user_type": "employee",
    "employee_id": { "_id": "...", "name": "John Doe" },
    "active": true
  }
}
```

**POST /api/v1/users**
```javascript
// Request
{
  "username": "newuser",
  "email": "newuser@example.com",
  "password": "password123",
  "role_id": "role_objectid",
  "user_type": "employee",
  "employee_id": "employee_objectid",
  "active": true
}

// Response (201)
{
  "success": true,
  "message": "User created successfully",
  "data": { /* created user */ }
}
```

**PUT /api/v1/users/:id**
```javascript
// Request
{
  "username": "updateduser",
  "email": "updated@example.com",
  "password": "newpassword123", // optional
  "role_id": "new_role_id",
  "active": true
}

// Response (200)
{
  "success": true,
  "message": "User updated successfully",
  "data": { /* updated user */ }
}
```

**DELETE /api/v1/users/:id**
```javascript
// Response (200)
{
  "success": true,
  "message": "User deleted successfully"
}
```

#### 5.3.3 Product APIs

**GET /api/v1/products**
```javascript
// Query Parameters
?page=1&limit=20&search=chips&brand=lays&segment=BIS&active=true

// Response (200)
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "product_id": "SKU001",
      "name": "Lays Classic Chips 50g",
      "brand_id": { "_id": "...", "name": "Lays" },
      "category_ids": [{ "_id": "...", "name": "Chips" }],
      "segment": "BIS",
      "unit_price": 20.00,
      "mrp": 25.00,
      "active": true
    }
  ]
}
```

**POST /api/v1/products**
```javascript
// Request
{
  "product_id": "SKU002",
  "name": "New Product",
  "description": "Product description",
  "brand_id": "brand_objectid",
  "category_ids": ["cat1_id", "cat2_id"],
  "segment": "BIS",
  "unit": "PCS",
  "unit_price": 50.00,
  "mrp": 60.00,
  "tax_rate": 5.0,
  "hsn_code": "12345678",
  "active": true
}

// Response (201)
{
  "success": true,
  "message": "Product created successfully",
  "data": { /* created product */ }
}
```

#### 5.3.4 Demand Order APIs

**GET /api/v1/demand-orders**
```javascript
// Query Parameters
?status=SUBMITTED&distributor=dist_id&from_date=2026-01-01&to_date=2026-01-31

// Response (200)
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "order_number": "DO-000001",
      "distributor_id": { "_id": "...", "name": "ABC Distributors" },
      "items": [
        {
          "product_id": { "_id": "...", "name": "Product A" },
          "quantity": 100,
          "unit_price": 20.00,
          "total_amount": 2000.00
        }
      ],
      "total_amount": 2000.00,
      "status": "SUBMITTED",
      "created_at": "2026-01-15T10:00:00Z"
    }
  ]
}
```

**POST /api/v1/demand-orders**
```javascript
// Request
{
  "distributor_id": "dist_objectid",
  "items": [
    {
      "product_id": "prod_id",
      "quantity": 100,
      "unit_price": 20.00,
      "offer_id": null // optional
    }
  ]
}

// Response (201)
{
  "success": true,
  "message": "Order created successfully",
  "data": { /* created order */ }
}
```

**PUT /api/v1/demand-orders/:id/submit**
```javascript
// Response (200)
{
  "success": true,
  "message": "Order submitted for approval",
  "data": { /* updated order */ }
}
```

**PUT /api/v1/demand-orders/:id/approve**
```javascript
// Request
{
  "approval_level": "ASM", // or "RSM"
  "comments": "Approved"
}

// Response (200)
{
  "success": true,
  "message": "Order approved successfully",
  "data": { /* updated order */ }
}
```

**PUT /api/v1/demand-orders/:id/reject**
```javascript
// Request
{
  "rejection_reason": "Insufficient stock"
}

// Response (200)
{
  "success": true,
  "message": "Order rejected",
  "data": { /* updated order */ }
}
```

**POST /api/v1/demand-orders/:id/schedule**
```javascript
// Request
{
  "schedule_date": "2026-01-20",
  "facility_id": "facility_id",
  "items": [
    {
      "product_id": "prod_id",
      "scheduled_quantity": 50
    }
  ]
}

// Response (200)
{
  "success": true,
  "message": "Order scheduled successfully",
  "data": { /* updated order with schedule */ }
}
```

#### 5.3.5 Collection APIs

**GET /api/v1/collections**
```javascript
// Query Parameters
?status=PENDING&distributor=dist_id&from_date=2026-01-01

// Response (200)
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "collection_number": "COL-000001",
      "distributor_id": { "_id": "...", "name": "ABC Distributors" },
      "collection_date": "2026-01-15",
      "amount": 10000.00,
      "payment_method": "CASH",
      "status": "PENDING"
    }
  ]
}
```

**POST /api/v1/collections**
```javascript
// Request
{
  "distributor_id": "dist_id",
  "collection_date": "2026-01-15",
  "amount": 10000.00,
  "payment_method": "BANK_TRANSFER",
  "bank_id": "bank_id",
  "transaction_reference": "TXN123456"
}

// Response (201)
{
  "success": true,
  "message": "Collection recorded successfully",
  "data": { /* created collection */ }
}
```

**POST /api/v1/collections/upload-image**
```javascript
// Request (multipart/form-data)
{
  "image": File
}

// Response (200)
{
  "success": true,
  "data": {
    "path": "/images/collections/collection-1234567890-abc.jpg"
  }
}
```

### 5.4 Error Codes

| HTTP Status | Error Code | Description |
|-------------|------------|-------------|
| 400 | BAD_REQUEST | Invalid request format or parameters |
| 401 | UNAUTHORIZED | Missing or invalid authentication token |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | Resource not found |
| 409 | CONFLICT | Resource conflict (duplicate) |
| 422 | VALIDATION_ERROR | Input validation failed |
| 429 | RATE_LIMIT_EXCEEDED | Too many requests |
| 500 | INTERNAL_ERROR | Server error |
| 503 | SERVICE_UNAVAILABLE | Service temporarily unavailable |

### 5.5 Rate Limiting

**Configuration:**
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later'
});

// Apply to all routes
app.use('/api/', limiter);

// Strict limiter for authentication
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 attempts per 15 minutes
  skipSuccessfulRequests: true
});

app.use('/api/v1/auth/login', authLimiter);
```

### 5.6 API Documentation

**Tool:** Postman Collection + Swagger/OpenAPI (optional)

**Documentation Includes:**
- Endpoint descriptions
- Request/response examples
- Authentication requirements
- Error responses
- Rate limits
- Versioning information

---

## 6. SECURITY ARCHITECTURE

### 6.1 Authentication System

#### 6.1.1 JWT Token Structure

**Access Token:**
```javascript
{
  header: {
    alg: "HS256",
    typ: "JWT"
  },
  payload: {
    id: "user_objectid",
    username: "admin",
    role: "role_objectid",
    tokenVersion: 0,
    iat: 1706745600,
    exp: 1706746500 // 15 minutes
  },
  signature: "..."
}
```

**Refresh Token:**
```javascript
{
  header: {
    alg: "HS256",
    typ: "JWT"
  },
  payload: {
    id: "user_objectid",
    tokenVersion: 0,
    iat: 1706745600,
    exp: 1707350400 // 7 days
  },
  signature: "..."
}
```

#### 6.1.2 Token Generation

```javascript
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    {
      id: user._id,
      username: user.username,
      role: user.role_id,
      tokenVersion: user.tokenVersion
    },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
  
  const refreshToken = jwt.sign(
    {
      id: user._id,
      tokenVersion: user.tokenVersion
    },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
  
  return { accessToken, refreshToken };
};
```

#### 6.1.3 Token Verification Middleware

```javascript
const authenticate = async (req, res, next) => {
  try {
    // Extract token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }
    
    const token = authHeader.substring(7);
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check Redis cache first
    const cacheKey = `user:${decoded.id}`;
    let user = await redis.get(cacheKey);
    
    if (!user) {
      // Fetch from database
      user = await User.findById(decoded.id)
        .populate('role_id')
        .lean();
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }
      
      // Cache for 5 minutes
      await redis.setex(cacheKey, 300, JSON.stringify(user));
    } else {
      user = JSON.parse(user);
    }
    
    // Verify token version (for logout all devices)
    if (user.tokenVersion !== decoded.tokenVersion) {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }
    
    // Attach user to request
    req.user = user;
    next();
    
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }
    
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};
```

#### 6.1.4 Token Refresh Flow

```javascript
const refreshTokens = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token required'
      });
    }
    
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    // Fetch user
    const user = await User.findById(decoded.id);
    
    if (!user || user.tokenVersion !== decoded.tokenVersion) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }
    
    // Generate new tokens
    const tokens = generateTokens(user);
    
    res.json({
      success: true,
      data: tokens
    });
    
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid refresh token'
    });
  }
};
```

### 6.2 Authorization System

#### 6.2.1 Role-Based Access Control (RBAC)

**Permission Check Middleware:**
```javascript
const requireApiPermission = (permissionCode) => {
  return async (req, res, next) => {
    try {
      const userRole = req.user.role_id;
      
      // Check cache first
      const cacheKey = `permissions:${userRole._id}`;
      let permissions = await redis.get(cacheKey);
      
      if (!permissions) {
        // Fetch from database
        const rolePermissions = await RoleApiPermission.find({
          role_id: userRole._id
        }).populate('api_permission_id');
        
        permissions = rolePermissions.map(rp => rp.api_permission_id.code);
        
        // Cache for 10 minutes
        await redis.setex(cacheKey, 600, JSON.stringify(permissions));
      } else {
        permissions = JSON.parse(permissions);
      }
      
      // Check permission
      if (!permissions.includes(permissionCode)) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }
      
      next();
      
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error checking permissions'
      });
    }
  };
};

// Usage
router.get('/users', 
  authenticate, 
  requireApiPermission('users:read'), 
  userController.getAll
);
```

### 6.3 Password Security

#### 6.3.1 Password Hashing

```javascript
const bcrypt = require('bcryptjs');

// Pre-save hook (Mongoose)
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    const saltRounds = 10;
    this.password = await bcrypt.hash(this.password, saltRounds);
    next();
  } catch (error) {
    next(error);
  }
});

// Password comparison method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};
```

#### 6.3.2 Password Policy

**Requirements:**
- Minimum length: 6 characters
- Must contain: letters and numbers (recommended)
- Password history: Not implemented (can be added)
- Expiry: Not enforced (can be added)

### 6.4 Data Encryption

#### 6.4.1 In-Transit Encryption

**HTTPS/TLS:**
- All API communications over HTTPS
- TLS 1.2+ required
- SSL certificate from trusted CA

**Nginx SSL Configuration:**
```nginx
server {
    listen 443 ssl http2;
    server_name api.example.com;
    
    ssl_certificate /etc/ssl/certs/cert.pem;
    ssl_certificate_key /etc/ssl/private/key.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Other security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

#### 6.4.2 At-Rest Encryption

**MongoDB Encryption:**
- MongoDB Atlas: Encryption at rest enabled
- Self-hosted: Encrypted filesystem (LUKS, dm-crypt)

**Environment Variables:**
- Sensitive data in .env files
- .env files excluded from version control (.gitignore)
- Production secrets in environment/secret management systems

### 6.5 Input Validation & Sanitization

#### 6.5.1 Request Validation (Joi)

```javascript
const { body, validationResult } = require('express-validator');

const userCreateValidation = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be 3-30 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username can only contain letters, numbers, underscores, and hyphens'),
  
  body('email')
    .trim()
    .isEmail()
    .withMessage('Invalid email address')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  
  body('role_id')
    .isMongoId()
    .withMessage('Invalid role ID')
];

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: errors.array()
    });
  }
  next();
};

router.post('/users',
  authenticate,
  requireApiPermission('users:create'),
  userCreateValidation,
  handleValidationErrors,
  userController.create
);
```

#### 6.5.2 XSS Protection

**helmet Middleware:**
```javascript
const helmet = require('helmet');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'same-origin' }
}));
```

### 6.6 Security Headers

```javascript
// Custom headers middleware
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'same-origin');
  next();
});
```

### 6.7 CORS Configuration

```javascript
const cors = require('cors');

const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS.split(',');
    
    // Allow requests with no origin (mobile apps, Postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
```

### 6.8 SQL/NoSQL Injection Prevention

**Mongoose Protection:**
```javascript
// Mongoose automatically sanitizes queries
// Avoid using $where operator with user input

// Safe query
const users = await User.find({ username: req.query.username });

// Unsafe (avoid)
const users = await User.find({
  $where: `this.username == '${req.query.username}'`
});

// Additional sanitization
const mongoSanitize = require('express-mongo-sanitize');
app.use(mongoSanitize());
```

### 6.9 Session Security

**Redis Session Store:**
```javascript
const session = require('express-session');
const RedisStore = require('connect-redis')(session);

app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true, // Prevents JavaScript access
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'strict' // CSRF protection
  }
}));
```

### 6.10 Audit Logging

**Audit Trail:**
```javascript
// Middleware to log all API requests
const auditLogger = (req, res, next) => {
  const auditLog = {
    timestamp: new Date(),
    user: req.user ? req.user._id : null,
    action: `${req.method} ${req.path}`,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    body: req.method !== 'GET' ? req.body : null
  };
  
  // Log to file or database
  logger.info('API Request', auditLog);
  
  next();
};

app.use('/api/', authenticate, auditLogger);
```

**Database Audit Fields:**
- created_by: User who created the record
- created_at: Timestamp of creation
- updated_by: User who last updated the record
- updated_at: Timestamp of last update

---

This is a comprehensive technical specification document. Would you like me to continue with the remaining sections (7-15)?
