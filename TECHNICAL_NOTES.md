# Technical Notes & Best Practices

This document contains important technical notes, common issues, and best practices discovered during the development of the Pusti HT MERN application.

## Table of Contents
- [Frontend Framework Issues](#frontend-framework-issues)
- [Backend Best Practices](#backend-best-practices)
- [Database Considerations](#database-considerations)

---

## Frontend Framework Issues

### Material-UI Grid Component

#### ⚠️ CRITICAL: Do NOT Use Grid-v2

**Issue**: Material-UI's Grid-v2 component creates compatibility problems with Next.js and causes TypeScript errors.

**Symptoms**:
- TypeScript compile errors about missing `component` property
- Property conflicts (e.g., `item` property not existing on type)
- Runtime errors in Next.js applications

**Solution**: Always use the standard Grid component from Material-UI, NOT Grid-v2.

```tsx
// ❌ DO NOT USE
import Grid from '@mui/material/Unstable_Grid2';

// ✅ CORRECT
import Grid from '@mui/material/Grid';
```

**Date Noted**: January 8, 2026

---

## Backend Best Practices

### Mongoose Population Field Names

**Issue**: Always verify actual field names in Mongoose models before using `.populate()`.

**Common Mistake**: Assuming field names without checking the model schema, leading to null/undefined values in populated fields.

**Example**:
```javascript
// ❌ WRONG - Assuming field names
.populate("distributor_id", "distributor_name distributor_code")

// ✅ CORRECT - Using actual model field names
.populate("distributor_id", "name erp_id")
```

**Best Practice**: Always check the target model's schema definition before writing populate statements.

---

## Database Considerations

### MongoDB Enum Values

**Issue**: Enum values in Mongoose schemas are case-sensitive.

**Example**:
```javascript
// Schema definition
gender: { type: String, enum: ["male", "female", "other"] }

// ❌ Frontend sending wrong case
formData.gender = "Male"  // Will fail validation

// ✅ Correct case
formData.gender = "male"  // Will succeed
```

**Best Practice**: 
- Backend: Use lowercase for enum values
- Frontend: Transform display values for UI but send lowercase to backend
- Always sync enum definitions between frontend schemas (Zod) and backend schemas (Mongoose)

---

## Notes
- This document should be updated whenever new technical issues or best practices are discovered
- Include date and context for each note to help future developers understand when and why certain decisions were made
