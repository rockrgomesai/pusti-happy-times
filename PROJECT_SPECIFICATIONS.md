# Pusti Happy Times - MERN Stack Project Specifications

## Project Overview
**Project Name**: Pusti Happy Times  
**Architecture**: MERN Stack Application  
**Database**: MongoDB (pusti_happy_times)  
**Development Date**: September 2025  

## Technology Stack

### Backend Technologies
- **Runtime**: Node.js 22
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose.js ODM
- **Caching**: Redis
- **Authentication**: JWT-based authentication
- **Password Hashing**: bcrypt

### Frontend Technologies
- **Framework**: Next.js (React-based)
- **UI Library**: Material UI (MUI)
- **HTTP Client**: Axios
- **Form Management**: React Hook Form
- **Form Validation**: Zod schema validation
- **Tree View Component**: React Arborist (for territory and hierarchical data)
- **Design Inspiration**: Apple Theme
- **Design Approach**: **Strictly Mobile First Design**
- **Theme Support**: Dark Mode Support Required

## Development Standards

### Code Quality Requirements
- **Professional Commenting**: Ample and comprehensive commenting throughout codebase
- **Clean Code**: Follow clean code principles and best practices
- **Production Level**: Highly optimized production-ready coding standards
- **Performance**: Optimized for production environments

### Design Guidelines
- **Mobile First**: All UI components must be designed mobile-first
- **Top-Notch UI**: Premium quality user interface design
- **Responsive Design**: Seamless experience across all device sizes
- **Apple-Inspired**: Clean, minimalist design following Apple's design principles
- **Dark Mode**: Full dark mode support across the application

## UI/UX Layout Specifications

### Layout Structure
- **Full-Width Navbar**: Spans entire screen width at the top
- **Sidebar + Main Content**: Positioned underneath the navbar
- **Full-Width Footer**: Spans entire screen width, 50% height of navbar
- **Collapsible Sidebar**: Can be toggled between expanded and collapsed states

### Navbar Components
- **Logo**: Positioned on the far left of navbar
- **Hamburger Toggle**: Left side button to collapse/expand sidebar
- **Dark Mode Toggle**: Switch positioned left of user avatar
- **User Avatar**: Far right position with dropdown functionality
- **Avatar Dropdown**: Two options - "Change Password" and "Logout"

### Sidebar Functionality
- **Role-Based Menu**: Renders menu items from database based on user role
- **Menu Ordering**: Items arranged according to m_order field from database
- **Collapsible Design**: Icons remain visible when collapsed
- **Parent Menu Items**: href=null items display with arrow indicator (no route navigation)
- **Child Menu Items**: Slightly indented under parent, revealed on parent click
- **Hierarchical Navigation**: Support for parent-child menu relationships

### Responsive Behavior
- **Mobile-First**: Optimized for touch interfaces and small screens
- **Progressive Enhancement**: Enhanced features for larger screens
- **Touch-Friendly**: All interactive elements sized for mobile interaction

## CRUD Interface Specifications

### Data Display Modes
- **Dual View Options**: Card view and list view with toggle switch
- **Card View**: Data displayed in card format with action icons in footer
- **List View**: Traditional table/list format with action icons per row
- **View Mode Toggle**: Switch component to change between display modes

### Pagination System
- **Initial Page Size**: 10 items per page
- **Pagination Options**: Series progression of 25, 50, 100, 500 items
- **Mobile-Optimized**: Touch-friendly pagination controls
- **Performance**: Efficient loading for large datasets

### Action Controls
- **Add Button**: Positioned over list on the right side (+ icon)
- **Row Actions**: View, Edit, Delete icons for each data item
- **Card Actions**: Action icons positioned in card footer
- **Permission-Based**: All action icons protected by api_permissions and user role

### Form Interface
- **Popup/Modal Forms**: Overlay forms for create/edit operations
- **Close Button**: 'X' button positioned in top right corner
- **Submit Button**: Save data functionality with form validation
- **Mobile-Responsive**: Forms optimized for mobile input
- **Date Format Display**: Bangladeshi format (dd/MM/yy) for UI presentation
- **Date Storage**: ISO format for database consistency
- **Error Display**: Backend error messages shown in red toast at top middle of screen

### Specialized Components
- **Tree View**: React Arborist for hierarchical data (territory management)
- **Hierarchical Data**: Support for parent-child relationships
- **Interactive Trees**: Expand/collapse functionality for tree structures
- **Toast Notifications**: Red-colored toast messages for backend errors at top middle position

## Data Management & Audit

### Date Handling
- **UI Display Format**: Bangladeshi format (dd/MM/yy) for user-friendly presentation
- **Database Storage**: ISO format for data consistency and international compatibility
- **Format Conversion**: Automatic conversion between UI and database formats
- **Timezone Handling**: Proper timezone management for accurate date representation

### Audit Logging
- **Comprehensive Logging**: All database actions must be logged for future audit
- **Action Tracking**: Create, Read, Update, Delete operations logged
- **User Attribution**: Log entries include user identification and timestamps
- **Data Integrity**: Audit trail for compliance and security purposes

## Database Collections Structure

### Core Collections
1. **roles** - User roles (SuperAdmin, SalesAdmin, Distributor)
2. **users** - User accounts with role-based access
3. **sidebar_menu_items** - Hierarchical navigation menu structure with ordering
   - label: Menu display text
   - href: Route path (null for parent items)
   - m_order: Display order in sidebar
   - icon: Icon identifier for UI rendering
   - parent_id: Reference for hierarchical structure
   - is_submenu: Boolean for child menu identification
4. **brands** - Brand management (PHT, RFL)
5. **api_permissions** - API endpoint permissions
6. **pa_permissions** - Page access permissions (to be created)
7. **role_sidebar_menu_items** - Junction table for role-menu permissions
8. **roles_api_permissions** - Junction table for role-API permissions
9. **role_pa_permissions** - Junction table for role-page access permissions (to be created)
10. **audit_logs** - Comprehensive logging for all database actions with user attribution

### Authentication & Authorization
- **JWT Authentication with Refresh Token**: Dual token system for enhanced security
- **Username/Password Login**: Authentication requires username and password credentials
- **Account Lockout Protection**: 3 failed login attempts within short period locks account for 5 minutes
- **Private Application**: Designed for on-premise server installations only
- **No Registration Option**: User accounts created by administrators only
- **Token Expiry Handling**: Expired token requests automatically redirect to login route
- **Seamless Redirection**: Successful login redirects to originally intended request
- **API Endpoint Protection**: All backend endpoints protected by role-based api_permissions and authentication
- **Public Endpoints Exception**: Logout and refresh token endpoints exempt from full protection
- **Page Access Control**: Database-driven page permissions based on user role
- **403 Error Handling**: Users without page access see "403, Insufficient Permission" error
- Role-Based Access Control (RBAC)
- Granular API permissions
- Menu-based navigation permissions

## Infrastructure
- **Containerization**: Docker & Docker Compose
- **Database**: MongoDB with authentication
- **Caching**: Redis for session management and caching
- **MCP Server**: Model Context Protocol server for MongoDB access

## Development Principles

### Frontend Development
- Mobile-first responsive design
- Material UI component library
- Apple-inspired clean aesthetics
- **Top-notch UI Design**: Premium quality user interface implementation
- **CRUD Interface**: Dual-mode data display (card/list) with permission-based actions
- **Pagination System**: Progressive page sizes (10, 25, 50, 100, 500)
- **Modal Forms**: Popup forms with mobile-optimized input handling
- **Error Handling**: Red toast notifications for backend errors at top middle of screen
- **Page Access Control**: Database-driven page permissions with 403 error display
- **Permission Error UI**: Clean "403, Insufficient Permission" error page
- **Dynamic Sidebar**: Database-driven menu with role-based access
- **Collapsible Navigation**: Hamburger menu with icon-only collapsed state
- **User Avatar Dropdown**: Change password and logout functionality
- **Tree View Components**: React Arborist for hierarchical data management
- Dark mode theme switching with toggle switch
- **React Hook Form**: Efficient form state management
- **Zod Validation**: Type-safe schema validation for forms
- **Hierarchical Menu System**: Parent-child menu relationships with indentation
- **Permission-Protected UI**: Action buttons/icons based on user role permissions
- Optimized for touch interfaces
- Progressive Web App capabilities

### Backend Development
- RESTful API design
- Mongoose ODM for MongoDB operations
- **Mongoose Validation**: Backend data validation using Mongoose schema validation
- Redis caching strategy
- **JWT Authentication with Refresh Token**: Dual token system implementation
- **API Endpoint Protection**: Role-based api_permissions for all endpoints (except logout/refresh)
- **Page Access Authorization**: Database-driven page permissions verification
- **Login Security**: Username/password authentication with failed attempt tracking
- **Account Lockout Logic**: Temporary 5-minute lockout after 3 failed attempts
- **Token Expiry Middleware**: Automatic redirection on expired tokens
- **Login Flow Management**: Preserve intended routes for post-login redirection
- **Date Management**: ISO format storage with UI format conversion
- **Comprehensive Audit Logging**: All database operations logged with user attribution
- **Error Response Format**: Standardized error messages for frontend toast display
- **403 Error Handling**: Proper insufficient permission error responses
- Role-based authorization middleware
- Comprehensive error handling
- API rate limiting
- Security best practices

### Code Standards
- ESLint and Prettier configuration
- TypeScript support (if applicable)
- Comprehensive unit and integration testing
- API documentation (Swagger/OpenAPI)
- Git workflow with feature branches
- Code review requirements

## Security Considerations
- Password hashing with bcrypt
- **JWT with Refresh Token**: Enhanced security with token rotation
- **Login Security**: Username/password authentication requirements
- **Brute Force Protection**: Account lockout after 3 failed attempts within short timeframe
- **Temporary Account Lock**: 5-minute lockout period for security
- **Private Application Security**: On-premise deployment with no external registration
- **Token Expiry Management**: Automatic handling of expired authentication
- **Client-Side Validation**: Zod schema validation for form security
- **Server-Side Validation**: Mongoose schema validation for data integrity
- **API Endpoint Security**: All endpoints protected by role-based api_permissions and authentication
- **Page Access Security**: Database-driven page permissions with role-based access control
- **Public Endpoints**: Only logout and refresh token endpoints exempt from full protection
- **Permission-Based UI**: Action buttons and icons protected by api_permissions
- **Role-Based Access Control**: UI elements and page access based on user permissions
- **403 Error Handling**: Proper insufficient permission error display
- API endpoint protection
- Input validation and sanitization
- CORS configuration
- Rate limiting
- Security headers

## Performance Optimization
- Database indexing strategy
- Redis caching implementation
- Image optimization
- Code splitting and lazy loading
- Bundle optimization
- CDN integration (if applicable)
- Database query optimization

## Deployment Strategy
- **On-Premise Installation**: Private application for internal server deployment
- **No Public Access**: Application not intended for public cloud deployment
- **Administrator-Managed Users**: No self-registration, admin-created accounts only
- Docker containerization
- Environment-specific configurations
- Health checks and monitoring
- Backup and recovery procedures
- CI/CD pipeline integration
- Production environment hardening

---

**Note**: This document serves as the comprehensive specification for the Pusti Happy Times MERN stack application. All development should strictly adhere to these guidelines and standards.
