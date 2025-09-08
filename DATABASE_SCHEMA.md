# Database Schema Documentation

## Collections

### roles
- **role** [string, required, unique] - The role name

### users
- **username** [string, required, unique] - User's login name
- **password** [string, required, min 6, alphanumeric] - Hashed password
- **role_id** [ObjectId, required] - Reference to roles._id (1-to-1 relationship)
- **email** [string, required, lowercase, unique] - User's email address
- **active** [Boolean, default true] - User status
- **created_at** [Date] - Audit field for creation timestamp
- **updated_at** [Date] - Audit field for last update timestamp
- **created_by** [ObjectId] - Audit field for creator user ID
- **updated_by** [ObjectId] - Audit field for last updater user ID

## Relationships

### Users ↔ Roles (1-to-1)
- Each user has exactly one role
- Each role can be assigned to multiple users
- Relationship implemented via `users.role_id` → `roles._id`
