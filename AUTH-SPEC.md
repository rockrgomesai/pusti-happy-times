# Authentication & Authorization System Specification

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Data Models](#data-models)
4. [JWT Token Structure](#jwt-token-structure)
5. [Authentication Flow](#authentication-flow)
6. [Authorization Patterns](#authorization-patterns)
7. [Middleware Documentation](#middleware-documentation)
8. [API Endpoints](#api-endpoints)
9. [Security Features](#security-features)
10. [Redis Integration](#redis-integration)
11. [Implementation Guide](#implementation-guide)

---

## Overview

This document describes a comprehensive authentication and authorization system built with **JWT tokens**, **Redis session management**, and **role-based access control (RBAC)** with fine-grained permissions.

### Key Features
- ✅ Dual JWT tokens (access + refresh) for secure authentication
- ✅ Context-aware token payloads for multi-type users
- ✅ Role-based access control with granular permissions
- ✅ Token versioning for logout-all functionality
- ✅ Redis-backed token blacklisting and refresh token storage
- ✅ Territory and facility-based access control
- ✅ Account lockout on multiple failed login attempts
- ✅ Password complexity requirements
- ✅ Comprehensive audit logging

### Technology Stack
- **Backend**: Node.js + Express.js
- **Database**: MongoDB (Mongoose ODM)
- **Cache/Session**: Redis
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcrypt
- **Validation**: express-validator

---

## Architecture

### High-Level Flow

```
┌──────────┐         ┌────────────────┐         ┌──────────┐
│  Client  │ ◄─────► │   API Server   │ ◄─────► │ MongoDB  │
└──────────┘         └────────────────┘         └──────────┘
                             │
                             ▼
                       ┌──────────┐
                       │  Redis   │
                       │ (Tokens) │
                       └──────────┘
```

### Component Layers

1. **Authentication Layer**
   - JWT token generation and verification
   - User login with credential validation
   - Token refresh mechanism
   - Logout and session invalidation

2. **Authorization Layer**
   - Role-based access control (RBAC)
   - API permission checking
   - Page/menu permission validation
   - Context-aware access (territory, facility)
   - User type restrictions (employee vs distributor)

3. **Session Management Layer**
   - Redis-backed token storage
   - Token blacklisting
   - Refresh token rotation
   - User activity tracking

4. **Security Layer**
   - Password hashing with bcrypt
   - Account lockout mechanism
   - Token versioning
   - Audit logging

---

## Data Models

### User Model

```javascript
{
  _id: ObjectId,
  username: String,           // Unique username (lowercase)
  password: String,           // Bcrypt hashed (12 rounds)
  role_id: ObjectId,          // Reference to Role
  user_type: String,          // "employee" | "distributor"
  
  // Employee-specific
  employee_id: ObjectId,      // Reference to Employee (if employee)
  
  // Distributor-specific
  distributor_id: ObjectId,   // Reference to Distributor (if distributor)
  
  // Security
  tokenVersion: Number,       // For logout-all functionality
  failedLoginAttempts: Number,
  accountLockedUntil: Date,
  lastLoginAt: Date,
  
  // Status
  active: Boolean,
  created_by: ObjectId,
  created_at: Date,
  updated_at: Date
}
```

**Indexes:**
- `username` (unique)
- `role_id`
- `employee_id`
- `distributor_id`

**Password Policy:**
- Minimum 6 characters
- Must contain at least one letter and one number
- Automatically hashed with bcrypt (12 salt rounds)

---

### Role Model

```javascript
{
  _id: ObjectId,
  role_name: String,          // Unique role name
  description: String,
  active: Boolean,
  created_at: Date,
  updated_at: Date
}
```

**Common Roles:**
- `System Admin`
- `Territory Manager`
- `Sales Officer`
- `Sales Representative`
- `Distributor Admin`
- `Distributor User`

---

### Permission Models

#### Page Permission (Menu/UI Access)

```javascript
{
  _id: ObjectId,
  pg_permissions: String,     // Unique permission code (e.g., "users:view")
  pg_display_name: String,
  description: String,
  active: Boolean,
  created_at: Date,
  updated_at: Date
}
```

#### API Permission (Endpoint Access)

```javascript
{
  _id: ObjectId,
  api_permissions: String,    // Permission code (e.g., "users:read", "roles:create")
  api_display_name: String,
  description: String,
  active: Boolean,
  created_at: Date,
  updated_at: Date
}
```

**Permission Naming Convention:**
```
<resource>:<action>

Examples:
- users:read       // GET endpoints
- users:create     // POST endpoints
- users:update     // PUT/PATCH endpoints
- users:delete     // DELETE endpoints
- reports:export   // Special actions
```

---

### Junction Tables (Role-Permission Mapping)

#### RolePagePermission

```javascript
{
  _id: ObjectId,
  role_id: ObjectId,             // Reference to Role
  page_permission_id: ObjectId,  // Reference to PagePermission
  active: Boolean,
  created_at: Date,
  updated_at: Date
}
```

#### RoleApiPermission

```javascript
{
  _id: ObjectId,
  role_id: ObjectId,             // Reference to Role
  api_permission_id: ObjectId,   // Reference to ApiPermission
  active: Boolean,
  created_at: Date,
  updated_at: Date
}
```

---

### Employee Model (Context Data)

```javascript
{
  _id: ObjectId,
  employee_id: String,        // Unique employee code
  name: String,
  employee_type: String,      // "system_admin" | "field" | "facility" | "hq"
  
  // Field employee context
  territory_assignments: [{
    territory_id: ObjectId,
    assigned_at: Date
  }],
  
  // Facility employee context
  facility_id: ObjectId,      // Reference to Facility
  factory_store_id: ObjectId, // Optional, for production roles
  
  active: Boolean,
  created_at: Date,
  updated_at: Date
}
```

---

### Distributor Model (Context Data)

```javascript
{
  _id: ObjectId,
  distributor_id: String,     // Unique distributor code
  name: String,
  db_point_id: String,        // Distribution point ID
  territory_id: ObjectId,
  active: Boolean,
  created_at: Date,
  updated_at: Date
}
```

---

## JWT Token Structure

### Access Token

**Lifetime**: 15 minutes  
**Purpose**: API request authentication  
**Storage**: Client memory (not localStorage for security)

**Payload Structure:**

```javascript
{
  // Core user data
  userId: "507f1f77bcf86cd799439011",
  username: "john.doe",
  role: "Sales Officer",
  roleId: "507f1f77bcf86cd799439012",
  user_type: "employee",
  
  // Context data (varies by user_type)
  employee_type: "field",        // If user_type = "employee"
  employee_code: "EMP001",
  employee_id: "507f1f77bcf86cd799439013",
  territory_assignments: [...],   // For field employees
  
  // OR
  
  distributor_id: "507f...",     // If user_type = "distributor"
  distributor_name: "ABC Dist",
  db_point_id: "DB001",
  
  // Token metadata
  type: "access",
  iat: 1234567890,               // Issued at
  exp: 1234568790                // Expires at (15 min)
}
```

**JWT Secret**: `process.env.JWT_SECRET`

---

### Refresh Token

**Lifetime**: 7 days  
**Purpose**: Obtain new access tokens without re-authentication  
**Storage**: Redis + Client secure storage (httpOnly cookie recommended)

**Payload Structure:**

```javascript
{
  userId: "507f1f77bcf86cd799439011",
  username: "john.doe",
  tokenVersion: 1,               // Incremented on logout-all
  type: "refresh",
  iat: 1234567890,
  exp: 1235172690                // 7 days
}
```

**JWT Secret**: `process.env.JWT_REFRESH_SECRET`

---

## Authentication Flow

### 1. Login Flow

```
┌────────┐                    ┌────────┐                    ┌─────────┐
│ Client │                    │  API   │                    │  Redis  │
└────┬───┘                    └───┬────┘                    └────┬────┘
     │                            │                              │
     │  POST /auth/login          │                              │
     │  { username, password }    │                              │
     ├───────────────────────────►│                              │
     │                            │                              │
     │                            │  Validate credentials        │
     │                            │  Check account status        │
     │                            │  Load user + role + context  │
     │                            │                              │
     │                            │  Generate access + refresh   │
     │                            │                              │
     │                            │  Store refresh token         │
     │                            ├─────────────────────────────►│
     │                            │                              │
     │  200 OK                    │                              │
     │  { tokens: {...} }         │                              │
     │◄───────────────────────────┤                              │
     │                            │                              │
```

**Steps:**

1. **Validate Credentials**
   - Find user by username (case-insensitive)
   - Check if user is active
   - Verify password with bcrypt
   - Check account lockout status
   - Track failed login attempts

2. **Build Context**
   - Populate role data
   - If `user_type = "employee"`: load employee data, territory assignments, facility info
   - If `user_type = "distributor"`: load distributor data

3. **Generate Tokens**
   - Create access token (15 min) with full context
   - Create refresh token (7 days) with minimal data

4. **Store Session**
   - Store refresh token in Redis: `refresh_token:{userId}:{timestamp}`
   - Set expiration to 7 days

5. **Return Response**
   ```json
   {
     "success": true,
     "message": "Login successful",
     "data": {
       "user": {
         "id": "...",
         "username": "...",
         "role": "...",
         "user_type": "..."
       },
       "tokens": {
         "accessToken": "eyJhbGciOiJIUzI1NiIs...",
         "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
         "expiresIn": 900
       }
     }
   }
   ```

---

### 2. Token Refresh Flow

```
┌────────┐                    ┌────────┐                    ┌─────────┐
│ Client │                    │  API   │                    │  Redis  │
└────┬───┘                    └───┬────┘                    └────┬────┘
     │                            │                              │
     │  POST /auth/refresh        │                              │
     │  { refreshToken }          │                              │
     ├───────────────────────────►│                              │
     │                            │                              │
     │                            │  Verify JWT signature        │
     │                            │                              │
     │                            │  Check Redis                 │
     │                            ├─────────────────────────────►│
     │                            │◄─────────────────────────────┤
     │                            │                              │
     │                            │  Load user + context         │
     │                            │  Generate new token pair     │
     │                            │                              │
     │                            │  Update Redis                │
     │                            ├─────────────────────────────►│
     │                            │                              │
     │  200 OK                    │                              │
     │  { tokens: {...} }         │                              │
     │◄───────────────────────────┤                              │
     │                            │                              │
```

**Steps:**

1. Verify refresh token JWT signature
2. Check if token exists in Redis
3. Verify user still active and role still active
4. Rebuild context data (same as login)
5. Generate new access + refresh token pair
6. Update refresh token in Redis
7. Return new tokens

**Error Cases:**
- Invalid JWT signature → 401 Unauthorized
- Token not in Redis → 401 (possible logout or token reuse)
- User inactive → 401, remove token from Redis
- Role inactive → 403 Forbidden

---

### 3. Logout Flow

```
┌────────┐                    ┌────────┐                    ┌─────────┐
│ Client │                    │  API   │                    │  Redis  │
└────┬───┘                    └───┬────┘                    └────┬────┘
     │                            │                              │
     │  POST /auth/logout         │                              │
     │  Authorization: Bearer ... │                              │
     ├───────────────────────────►│                              │
     │                            │                              │
     │                            │  Blacklist access token      │
     │                            ├─────────────────────────────►│
     │                            │                              │
     │                            │  Remove refresh token        │
     │                            ├─────────────────────────────►│
     │                            │                              │
     │  200 OK                    │                              │
     │◄───────────────────────────┤                              │
     │                            │                              │
```

**Steps:**

1. Extract access token from `Authorization` header
2. Blacklist access token in Redis (24 hour expiry)
3. Remove refresh token from Redis
4. Return success

**Logout All Devices:**

```javascript
POST /auth/logout-all
```

1. Remove ALL refresh tokens for user: `refresh_token:{userId}:*`
2. Blacklist current access token
3. Clear user activity data
4. Increment `tokenVersion` in User model (invalidates all existing tokens)

---

### 4. Password Change Flow

```javascript
PUT /auth/change-password
{
  "currentPassword": "oldpass123",
  "newPassword": "newpass456"
}
```

**Steps:**

1. Authenticate user with current token
2. Verify current password
3. Validate new password meets requirements
4. Hash new password with bcrypt (12 rounds)
5. Update password in database
6. Invalidate ALL refresh tokens (force re-login)
7. Blacklist current access token
8. Return success with `forceLogout: true` flag

---

## Authorization Patterns

### 1. Role-Based Access Control (RBAC)

Restrict access based on user's role:

```javascript
// Middleware usage
router.get('/admin-only', 
  authenticate, 
  requireRole(['System Admin']), 
  controllerFunction
);
```

**Implementation:**

```javascript
function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !req.user.role_id) {
      return res.status(403).json({
        success: false,
        message: "Access denied - no role assigned"
      });
    }
    
    const userRole = req.user.role_id.role_name;
    
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: "Access denied - insufficient role permissions"
      });
    }
    
    next();
  };
}
```

---

### 2. API Permission-Based Access

Fine-grained control over API endpoints:

```javascript
// Middleware usage
router.post('/users', 
  authenticate, 
  requireApiPermission('users:create'), 
  controllerFunction
);
```

**Implementation:**

```javascript
function requireApiPermission(permissionCode) {
  return async (req, res, next) => {
    try {
      const hasPermission = await checkApiPermission(
        req.user, 
        permissionCode
      );
      
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: "Access denied - missing API permission",
          requiredPermission: permissionCode
        });
      }
      
      next();
    } catch (error) {
      res.status(500).json({ success: false, message: "Permission check failed" });
    }
  };
}

async function checkApiPermission(user, permissionCode) {
  // Find API permission by code
  const apiPermission = await ApiPermission.findOne({
    api_permissions: permissionCode
  });
  
  if (!apiPermission) return false;
  
  // Check if user's role has this permission
  const rolePermission = await RoleApiPermission.findOne({
    role_id: user.role_id._id,
    api_permission_id: apiPermission._id
  });
  
  return !!rolePermission;
}
```

---

### 3. User Type Restrictions

Separate access for employees vs distributors:

```javascript
// Employee-only routes
router.get('/internal/reports', 
  authenticate, 
  requireUserType(['employee']), 
  controllerFunction
);

// Distributor-only routes
router.get('/my-orders', 
  authenticate, 
  requireUserType(['distributor']), 
  controllerFunction
);
```

**Implementation:**

```javascript
function requireUserType(allowedTypes) {
  return (req, res, next) => {
    if (!allowedTypes.includes(req.user.user_type)) {
      return res.status(403).json({
        success: false,
        message: "Access denied - invalid user type",
        requiredTypes: allowedTypes
      });
    }
    next();
  };
}
```

---

### 4. Employee Type Restrictions

Granular control for different employee categories:

```javascript
// Field employees only
router.get('/my-territory', 
  authenticate, 
  requireEmployeeType(['field']), 
  controllerFunction
);

// Facility/production employees
router.post('/production/batch', 
  authenticate, 
  requireEmployeeType(['facility']), 
  controllerFunction
);
```

**Implementation:**

```javascript
function requireEmployeeType(allowedTypes) {
  return (req, res, next) => {
    if (req.user.user_type !== 'employee') {
      return res.status(403).json({
        success: false,
        message: "Access denied - not an employee account"
      });
    }
    
    if (!allowedTypes.includes(req.user.employee_type)) {
      return res.status(403).json({
        success: false,
        message: "Access denied - invalid employee type",
        requiredTypes: allowedTypes
      });
    }
    
    next();
  };
}
```

---

### 5. Territory-Based Access

Restrict field employees to their assigned territories:

```javascript
router.get('/outlets/:id', 
  authenticate, 
  requireTerritoryAccess('params', 'id', async (outletId) => {
    const outlet = await Outlet.findById(outletId);
    return outlet?.territory_id;
  }), 
  controllerFunction
);
```

**Implementation:**

```javascript
function requireTerritoryAccess(source, field, getTerritoryId) {
  return async (req, res, next) => {
    // Only apply to field employees
    if (req.user.employee_type !== 'field') {
      return next();
    }
    
    // Get resource ID from request
    const resourceId = source === 'params' 
      ? req.params[field] 
      : req.body[field];
    
    // Get territory ID from resource
    const territoryId = await getTerritoryId(resourceId);
    
    if (!territoryId) {
      return res.status(404).json({
        success: false,
        message: "Resource not found"
      });
    }
    
    // Check if user has access to this territory
    const userTerritories = req.user.territory_assignments || [];
    const hasAccess = userTerritories.some(
      t => t.territory_id.toString() === territoryId.toString()
    );
    
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: "Territory access denied"
      });
    }
    
    next();
  };
}
```

---

### 6. Facility-Based Access

Restrict facility employees to their assigned facility:

```javascript
router.post('/production/output', 
  authenticate, 
  requireFacilityAccess('body', 'facility_id'), 
  controllerFunction
);
```

**Implementation:**

```javascript
function requireFacilityAccess(source, field) {
  return async (req, res, next) => {
    // Only apply to facility employees
    if (req.user.employee_type !== 'facility') {
      return next();
    }
    
    const requestedFacilityId = source === 'params' 
      ? req.params[field] 
      : req.body[field];
    
    const userFacilityId = req.user.facility_id?.toString();
    
    if (requestedFacilityId !== userFacilityId) {
      return res.status(403).json({
        success: false,
        message: "Facility access denied"
      });
    }
    
    next();
  };
}
```

---

### 7. Self-Access Only

Restrict users to access only their own data:

```javascript
router.get('/profile/:userId', 
  authenticate, 
  requireSelfOnly('params', 'userId'), 
  controllerFunction
);
```

**Implementation:**

```javascript
function requireSelfOnly(source, field) {
  return (req, res, next) => {
    const requestedUserId = source === 'params' 
      ? req.params[field] 
      : req.body[field];
    
    if (requestedUserId !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied - can only access own data"
      });
    }
    
    next();
  };
}
```

---

## Middleware Documentation

### Core Authentication Middleware

#### `authenticate`

Verifies JWT access token and loads user context.

```javascript
router.get('/protected', authenticate, (req, res) => {
  res.json({ user: req.user });
});
```

**What it does:**

1. Extracts JWT from `Authorization: Bearer <token>` header
2. Verifies token signature with `JWT_SECRET`
3. Checks if token is blacklisted in Redis
4. Loads user from database with role populated
5. Validates user and role are active
6. Attaches `req.user` and `req.token` for downstream use

**Attached Request Properties:**

```javascript
req.user = {
  _id: ObjectId,
  username: String,
  role_id: { role_name: String, ... },
  user_type: String,
  employee_id: ObjectId | Object,
  distributor_id: ObjectId | Object,
  employee_type: String,         // From JWT context
  territory_assignments: Array,  // From JWT context
  facility_id: ObjectId,         // From JWT context
  ...
};

req.token = "eyJhbGciOiJIUzI1NiIs...";
```

**Error Responses:**

```javascript
// No token
401 { success: false, message: "No token provided" }

// Invalid token
401 { success: false, message: "Invalid or expired token" }

// Blacklisted token
401 { success: false, message: "Token has been revoked" }

// User not found/inactive
401 { success: false, message: "User not found or inactive" }

// Role inactive
403 { success: false, message: "User role is inactive" }
```

---

#### `optionalAuthenticate`

Same as `authenticate` but doesn't fail if no token provided (for optional auth routes).

```javascript
router.get('/public-or-private', optionalAuthenticate, (req, res) => {
  if (req.user) {
    // Authenticated user
  } else {
    // Anonymous user
  }
});
```

---

### Authorization Middleware

#### `requireRole(allowedRoles)`

```javascript
requireRole(['System Admin', 'Territory Manager'])
```

Restricts access to users with specific roles.

---

#### `requireApiPermission(permissionCode)`

```javascript
requireApiPermission('users:create')
```

Checks if user's role has the specified API permission.

---

#### `requirePermission(permissionCode)` *(deprecated)*

Legacy permission checker, use `requireApiPermission` instead.

---

#### `requireUserType(allowedTypes)`

```javascript
requireUserType(['employee'])
requireUserType(['distributor'])
requireUserType(['employee', 'distributor']) // Allow both
```

Restricts to specific user types.

---

#### `requireEmployeeType(allowedTypes)`

```javascript
requireEmployeeType(['field'])
requireEmployeeType(['facility', 'hq'])
```

Restricts to specific employee types (only for `user_type = 'employee'`).

---

#### `requireTerritoryAccess(source, field, getTerritoryIdFn)`

```javascript
requireTerritoryAccess('params', 'outletId', async (id) => {
  const outlet = await Outlet.findById(id);
  return outlet?.territory_id;
})
```

Ensures field employees can only access resources in their assigned territories.

---

#### `requireFacilityAccess(source, field)`

```javascript
requireFacilityAccess('body', 'facility_id')
```

Ensures facility employees can only access their assigned facility.

---

#### `requireSelfOnly(source, field)`

```javascript
requireSelfOnly('params', 'userId')
```

Ensures users can only access their own data.

---

## API Endpoints

### Authentication Endpoints

#### **POST /api/auth/login**

Login with username and password.

**Request:**
```json
{
  "username": "john.doe",
  "password": "securePass123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "username": "john.doe",
      "role": "Sales Officer",
      "user_type": "employee"
    },
    "tokens": {
      "accessToken": "eyJhbGc...",
      "refreshToken": "eyJhbGc...",
      "expiresIn": 900
    }
  }
}
```

**Error Cases:**
- `400` - Invalid credentials
- `401` - Account locked (too many failed attempts)
- `403` - User inactive or role inactive

---

#### **POST /api/auth/refresh**

Get new access token using refresh token.

**Request:**
```json
{
  "refreshToken": "eyJhbGc..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "tokens": {
      "accessToken": "eyJhbGc...",
      "refreshToken": "eyJhbGc...",
      "expiresIn": 900
    }
  }
}
```

---

#### **POST /api/auth/logout**

Logout from current device.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response:**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

---

#### **POST /api/auth/logout-all**

Logout from all devices.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out from all devices successfully"
}
```

---

#### **PUT /api/auth/change-password**

Change current user's password.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request:**
```json
{
  "currentPassword": "oldPass123",
  "newPassword": "newPass456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password changed successfully - please log in again",
  "data": {
    "changedAt": "2024-01-15T10:30:00.000Z",
    "forceLogout": true
  }
}
```

**Side Effects:**
- All refresh tokens invalidated
- Current access token blacklisted
- User must re-login on all devices

---

## Security Features

### 1. Password Security

**Hashing:**
- Algorithm: bcrypt
- Salt rounds: 12
- Automatic hashing on user creation/update

**Password Policy:**
```javascript
{
  minLength: 6,
  pattern: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{6,}$/,
  requirements: [
    "At least 6 characters",
    "At least one letter",
    "At least one number",
    "Allowed special chars: @$!%*#?&"
  ]
}
```

---

### 2. Account Lockout

**Configuration:**
```javascript
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
```

**Behavior:**
- Track failed login attempts in `User.failedLoginAttempts`
- After 5 failed attempts, set `User.accountLockedUntil` to 15 minutes from now
- Reset counter on successful login
- Return `403` during lockout period

**Implementation:**
```javascript
// On failed login
user.failedLoginAttempts += 1;
if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
  user.accountLockedUntil = new Date(Date.now() + LOCKOUT_DURATION);
}
await user.save();

// On successful login
user.failedLoginAttempts = 0;
user.accountLockedUntil = null;
user.lastLoginAt = new Date();
await user.save();
```

---

### 3. Token Blacklisting

**Purpose:**
- Logout functionality
- Immediate token revocation
- Password change security

**Redis Storage:**
```
Key: blacklist:{token}
Value: { reason: "logged_out" | "password_changed", timestamp: ... }
TTL: 24 hours (longer than access token expiry)
```

**Middleware Check:**
```javascript
const isBlacklisted = await redis.isTokenBlacklisted(token);
if (isBlacklisted) {
  return res.status(401).json({
    success: false,
    message: "Token has been revoked"
  });
}
```

---

### 4. Token Versioning (Logout All Devices)

**Concept:**
- User model has `tokenVersion` field (default 0)
- Increment on logout-all or security events
- Tokens include `tokenVersion` in payload (for refresh tokens)
- On token verification, check if version matches

**Implementation:**
```javascript
// Generate token with version
const refreshToken = jwt.sign({
  userId: user._id,
  tokenVersion: user.tokenVersion
}, JWT_REFRESH_SECRET);

// On token verification
if (decoded.tokenVersion !== user.tokenVersion) {
  return res.status(401).json({
    message: "Token version mismatch - please log in again"
  });
}
```

**When to increment:**
- Logout from all devices
- Security breach detected
- Admin-initiated session revocation

---

### 5. Refresh Token Rotation

**Strategy:**
- Each refresh generates NEW token pair
- Old refresh token overwritten in Redis
- Prevents refresh token reuse attacks

**Implementation:**
```javascript
// On /auth/refresh
const newTokens = TokenManager.generateTokenPair(user, context);

// Update Redis with NEW refresh token
await redis.storeRefreshToken(
  user._id.toString(), 
  newTokens.refreshToken, 
  7 * 24 * 60 * 60
);
```

---

### 6. HTTPS & Secure Headers

**Recommendations:**

```javascript
// Use helmet for security headers
const helmet = require('helmet');
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));

// Rate limiting
const rateLimit = require('express-rate-limit');
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per window
  message: "Too many login attempts, please try again later"
});
app.use('/api/auth/login', loginLimiter);
```

---

### 7. Input Validation

**Using express-validator:**

```javascript
const { body, validationResult } = require('express-validator');

const loginValidation = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required')
    .toLowerCase(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

router.post('/login', loginValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  // ... proceed with login
});
```

---

## Redis Integration

### Redis Client Setup

```javascript
const redis = require('redis');

const client = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  db: 0
});

client.on('connect', () => console.log('✅ Redis connected'));
client.on('error', (err) => console.error('❌ Redis error:', err));

await client.connect();
```

---

### Token Storage Patterns

#### 1. Refresh Token Storage

```javascript
// Store
await client.setEx(
  `refresh_token:${userId}:${Date.now()}`,
  7 * 24 * 60 * 60, // 7 days in seconds
  refreshToken
);

// Retrieve
const keys = await client.keys(`refresh_token:${userId}:*`);
if (keys.length > 0) {
  const token = await client.get(keys[0]);
}

// Delete (logout)
await client.del(`refresh_token:${userId}:${timestamp}`);

// Delete all (logout all)
const allKeys = await client.keys(`refresh_token:${userId}:*`);
if (allKeys.length > 0) {
  await client.del(allKeys);
}
```

---

#### 2. Token Blacklist

```javascript
// Blacklist token
await client.setEx(
  `blacklist:${token}`,
  24 * 60 * 60, // 24 hours
  JSON.stringify({
    userId: userId,
    reason: 'logged_out',
    timestamp: Date.now()
  })
);

// Check blacklist
const isBlacklisted = await client.exists(`blacklist:${token}`);
```

---

#### 3. User Activity Tracking

```javascript
// Track last activity
await client.setEx(
  `user_activity:${userId}`,
  30 * 60, // 30 minutes
  JSON.stringify({
    lastSeen: Date.now(),
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  })
);

// Get active users
const keys = await client.keys('user_activity:*');
const activeUsers = keys.length;
```

---

### TokenManager Class

Centralized token management utility:

```javascript
class TokenManager {
  /**
   * Generate access and refresh token pair
   */
  static generateTokenPair(user, contextData = {}) {
    const accessTokenPayload = {
      userId: user._id.toString(),
      username: user.username,
      role: user.role_id.role_name,
      roleId: user.role_id._id.toString(),
      user_type: user.user_type,
      ...contextData,
      type: 'access'
    };

    const refreshTokenPayload = {
      userId: user._id.toString(),
      username: user.username,
      tokenVersion: user.tokenVersion || 0,
      type: 'refresh'
    };

    const accessToken = jwt.sign(
      accessTokenPayload,
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      refreshTokenPayload,
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60 // 900 seconds
    };
  }

  /**
   * Verify access token
   */
  static verifyAccessToken(token) {
    return jwt.verify(token, process.env.JWT_SECRET);
  }

  /**
   * Verify refresh token
   */
  static verifyRefreshToken(token) {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  }
}

module.exports = { TokenManager };
```

---

## Implementation Guide

### Step 1: Environment Variables

Create `.env` file:

```bash
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-too
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/your-database

# Security
BCRYPT_ROUNDS=12
MAX_LOGIN_ATTEMPTS=5
ACCOUNT_LOCKOUT_DURATION=900000  # 15 minutes in ms
```

---

### Step 2: Install Dependencies

```bash
npm install --save \
  express \
  mongoose \
  jsonwebtoken \
  bcryptjs \
  redis \
  express-validator \
  dotenv \
  helmet \
  cors \
  express-rate-limit
```

---

### Step 3: Create Models

1. **models/User.js**
2. **models/Role.js**
3. **models/Permission.js** (PagePermission, ApiPermission, MenuPermission)
4. **models/JunctionTables.js** (RolePagePermission, RoleApiPermission)
5. **models/Employee.js**
6. **models/Distributor.js**

---

### Step 4: Create Middleware

**middleware/auth.js**

Implement:
- `TokenManager` class
- `authenticate` middleware
- `requireRole()` middleware
- `requireApiPermission()` middleware
- `requireUserType()` middleware
- `requireEmployeeType()` middleware
- `requireTerritoryAccess()` middleware
- `requireFacilityAccess()` middleware

---

### Step 5: Create Auth Routes

**routes/auth.js**

Implement:
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `POST /api/auth/logout-all`
- `PUT /api/auth/change-password`

---

### Step 6: Redis Helper

**utils/redis.js**

```javascript
class RedisHelper {
  constructor(client) {
    this.client = client;
  }

  async storeRefreshToken(userId, token, ttlSeconds) {
    const key = `refresh_token:${userId}:${Date.now()}`;
    await this.client.setEx(key, ttlSeconds, token);
  }

  async getRefreshToken(userId) {
    const keys = await this.client.keys(`refresh_token:${userId}:*`);
    if (keys.length === 0) return null;
    return await this.client.get(keys[0]);
  }

  async removeRefreshToken(userId) {
    const keys = await this.client.keys(`refresh_token:${userId}:*`);
    if (keys.length > 0) {
      await this.client.del(keys);
    }
  }

  async blacklistToken(token, ttlSeconds = 86400, reason = 'logged_out') {
    await this.client.setEx(
      `blacklist:${token}`,
      ttlSeconds,
      JSON.stringify({ reason, timestamp: Date.now() })
    );
  }

  async isTokenBlacklisted(token) {
    return await this.client.exists(`blacklist:${token}`);
  }
}

module.exports = RedisHelper;
```

---

### Step 7: Protected Route Example

```javascript
const express = require('express');
const router = express.Router();
const { 
  authenticate, 
  requireApiPermission,
  requireEmployeeType 
} = require('../middleware/auth');

/**
 * Example: Create new user
 * - Requires authentication
 * - Requires 'users:create' API permission
 */
router.post(
  '/users',
  authenticate,
  requireApiPermission('users:create'),
  async (req, res) => {
    try {
      // Implementation
      res.json({ success: true, message: 'User created' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

/**
 * Example: Field employee accessing territory data
 * - Requires authentication
 * - Requires employee user type
 * - Requires field employee type
 */
router.get(
  '/my-territory',
  authenticate,
  requireUserType(['employee']),
  requireEmployeeType(['field']),
  async (req, res) => {
    const territories = req.user.territory_assignments;
    res.json({ success: true, data: { territories } });
  }
);

module.exports = router;
```

---

### Step 8: Client-Side Integration (React/Next.js Example)

#### Token Storage

```javascript
// utils/auth.js
export const AuthService = {
  // Store tokens in memory (preferred for access tokens)
  accessToken: null,
  
  // Store refresh token in httpOnly cookie or secure storage
  setTokens(accessToken, refreshToken) {
    this.accessToken = accessToken;
    localStorage.setItem('refreshToken', refreshToken); // Or use httpOnly cookie
  },
  
  getAccessToken() {
    return this.accessToken;
  },
  
  getRefreshToken() {
    return localStorage.getItem('refreshToken');
  },
  
  clearTokens() {
    this.accessToken = null;
    localStorage.removeItem('refreshToken');
  }
};
```

#### API Client with Auto-Refresh

```javascript
// utils/api.js
import axios from 'axios';
import { AuthService } from './auth';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL
});

// Request interceptor - add token
api.interceptors.request.use(
  (config) => {
    const token = AuthService.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle 401 and refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If 401 and not already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Attempt token refresh
        const refreshToken = AuthService.getRefreshToken();
        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
          { refreshToken }
        );
        
        const { accessToken, refreshToken: newRefreshToken } = response.data.data.tokens;
        
        // Update tokens
        AuthService.setTokens(accessToken, newRefreshToken);
        
        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed - redirect to login
        AuthService.clearTokens();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
```

#### Login Component

```javascript
// components/LoginForm.jsx
import { useState } from 'react';
import api from '../utils/api';
import { AuthService } from '../utils/auth';

export default function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await api.post('/auth/login', {
        username,
        password
      });

      const { tokens, user } = response.data.data;
      
      // Store tokens
      AuthService.setTokens(tokens.accessToken, tokens.refreshToken);
      
      // Store user data
      localStorage.setItem('user', JSON.stringify(user));
      
      // Redirect to dashboard
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error && <div className="error">{error}</div>}
      <button type="submit">Login</button>
    </form>
  );
}
```

---

## Best Practices

### 1. Token Security
- ✅ Store access tokens in memory (not localStorage)
- ✅ Store refresh tokens in httpOnly cookies when possible
- ✅ Use HTTPS in production
- ✅ Set short access token expiry (15 min)
- ✅ Implement token rotation on refresh

### 2. Password Security
- ✅ Use bcrypt with 12+ salt rounds
- ✅ Enforce password complexity
- ✅ Implement account lockout
- ✅ Never log passwords
- ✅ Hash passwords before storing

### 3. API Security
- ✅ Validate all inputs with express-validator
- ✅ Use rate limiting on auth endpoints
- ✅ Implement CORS properly
- ✅ Use helmet for security headers
- ✅ Log security events (failed logins, lockouts)

### 4. Database Security
- ✅ Use indexes on frequently queried fields
- ✅ Never expose password hashes in API responses
- ✅ Populate only necessary fields in JWT payloads
- ✅ Use `.select('+password')` explicitly when password needed
- ✅ Implement soft deletes over hard deletes

### 5. Error Handling
- ✅ Don't expose internal errors to clients
- ✅ Log errors server-side for debugging
- ✅ Return consistent error format
- ✅ Use proper HTTP status codes
- ✅ Handle Redis failures gracefully

### 6. Testing
- ✅ Test each middleware independently
- ✅ Test token expiry scenarios
- ✅ Test permission edge cases
- ✅ Load test authentication endpoints
- ✅ Test Redis failure scenarios

---

## Troubleshooting

### Common Issues

#### 1. "Invalid or expired token"
- Check JWT_SECRET matches between generation and verification
- Verify token hasn't expired (check `exp` claim)
- Check if token is blacklisted in Redis

#### 2. "Token has been revoked"
- User logged out manually
- Password was changed
- Admin forced logout
- Check Redis blacklist entry

#### 3. "Permission denied" despite correct role
- Verify RoleApiPermission junction table has entry
- Check permission code matches exactly (case-sensitive)
- Ensure ApiPermission exists and is active
- Populate role in authenticate middleware

#### 4. Redis connection errors
- Verify Redis is running: `redis-cli ping`
- Check REDIS_HOST and REDIS_PORT in .env
- Handle Redis errors gracefully in code
- Don't fail auth if Redis is down (log warning)

#### 5. Territory access denied
- Ensure `territory_assignments` populated in JWT
- Check territory_id comparison (ObjectId vs string)
- Verify req.user.employee_type === 'field'
- Debug with console.log in middleware

---

## Monitoring & Logs

### Important Metrics

1. **Authentication:**
   - Login success rate
   - Failed login attempts per user
   - Account lockouts
   - Token refresh rate

2. **Performance:**
   - Token verification time
   - Redis response time
   - Database query time for user lookup
   - Middleware execution time

3. **Security:**
   - Blacklisted tokens count
   - Suspicious login patterns
   - Multiple failed attempts from same IP
   - Token reuse attempts

### Log Examples

```javascript
// Successful login
console.log(`✅ Login successful: ${username} from ${ip}`);

// Failed login
console.log(`❌ Login failed: ${username} - ${reason}`);

// Account locked
console.log(`🔒 Account locked: ${username} - ${failedAttempts} attempts`);

// Token refreshed
console.log(`🔄 Token refreshed: ${userId}`);

// Permission denied
console.log(`🚫 Permission denied: ${userId} - ${requiredPermission}`);
```

---

## Migration Guide

### Existing System → This Auth System

**Step 1:** Backup existing users and passwords

**Step 2:** Migrate user schema:
```javascript
// Add new fields to existing users
await User.updateMany({}, {
  $set: {
    tokenVersion: 0,
    failedLoginAttempts: 0,
    active: true
  }
});
```

**Step 3:** Hash existing plain text passwords:
```javascript
for (const user of users) {
  if (!user.password.startsWith('$2')) {
    user.password = await bcrypt.hash(user.password, 12);
    await user.save();
  }
}
```

**Step 4:** Create permission records:
```javascript
// Seed API permissions
await ApiPermission.insertMany([
  { api_permissions: 'users:read', api_display_name: 'View Users' },
  { api_permissions: 'users:create', api_display_name: 'Create Users' },
  // ... more permissions
]);

// Map roles to permissions
for (const role of roles) {
  await RoleApiPermission.create({
    role_id: role._id,
    api_permission_id: permission._id
  });
}
```

**Step 5:** Update frontend to use new token format

**Step 6:** Test thoroughly in staging before production

---

## Appendix

### Full Middleware Chain Example

```javascript
router.post(
  '/outlets',
  authenticate,                              // 1. Verify JWT
  requireUserType(['employee']),             // 2. Must be employee
  requireEmployeeType(['field']),            // 3. Must be field employee
  requireApiPermission('outlets:create'),    // 4. Must have create permission
  requireTerritoryAccess('body', 'territory_id', // 5. Must have territory access
    async (territoryId) => territoryId
  ),
  controllerFunction                          // 6. Execute business logic
);
```

### Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `JWT_SECRET` | Secret for access tokens | `your-secret-key-here` |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens | `your-refresh-secret-here` |
| `JWT_EXPIRES_IN` | Access token expiry | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiry | `7d` |
| `REDIS_HOST` | Redis server host | `localhost` |
| `REDIS_PORT` | Redis server port | `6379` |
| `REDIS_PASSWORD` | Redis password | `` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/db` |
| `BCRYPT_ROUNDS` | Bcrypt salt rounds | `12` |

---

## License & Credits

This authentication specification is based on industry best practices and modern security standards. Feel free to adapt it for your project needs.

**Key References:**
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [JWT.io](https://jwt.io/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

---

**Document Version:** 1.0  
**Last Updated:** January 2024  
**Maintainer:** Development Team
