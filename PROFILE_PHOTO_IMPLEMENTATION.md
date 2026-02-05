# Profile Photo Upload Feature Implementation

## Overview

Added profile photo upload functionality for Distributors, DSRs, and Employees in the mobile app.

## Backend Implementation

### 1. Database Schema Updates

#### Employee Model (`backend/src/models/Employee.js`)

```javascript
profile_photo: {
  type: String,
  trim: true,
  default: null
}
```

#### Distributor Model (`backend/src/models/Distributor.js`)

```javascript
profile_photo: {
  type: String,
  trim: true,
  default: null
}
```

**Note:** DSR model already had `profile_picture_url` field.

### 2. Profile Upload Routes (`backend/src/routes/profile.js`)

Created new profile routes with two endpoints:

#### POST `/api/v1/profile/upload-photo`

- **Purpose:** Upload profile photo
- **Authentication:** Required (JWT token)
- **File Upload:**
  - Max size: 5MB
  - Formats: JPG, PNG, WEBP
  - Storage: `backend/public/images/profiles/`
  - Naming: `profile-{timestamp}-{random}.{ext}`
- **Features:**
  - Deletes old photo when uploading new one
  - Handles Employee, Distributor, and DSR types
  - Returns photo URL in response

#### GET `/api/v1/profile/me`

- **Purpose:** Get user profile with photo
- **Authentication:** Required (JWT token)
- **Returns:** User data with profile_photo field

### 3. Auth Route Updates (`backend/src/routes/auth.js`)

Updated login response to include `profile_photo` field:

- For Employees: Uses `employee_id.profile_photo`
- For Distributors: Uses `distributor_id.profile_photo`
- For DSRs: Uses `dsr_id.profile_picture_url`

### 4. Route Registration (`backend/src/routes/index.js`)

Registered profile routes:

```javascript
router.use("/profile", authenticate, profileRoutes);
```

## Mobile App Implementation

### 1. Home Screen Updates (`mobile/src/screens/HomeScreen.tsx`)

Added profile photo display:

- Shows uploaded photo if available
- Shows placeholder with first letter of name if no photo
- Avatar is clickable to navigate to profile screen
- Added "Edit Profile" button

### 2. Profile Screen (`mobile/src/screens/ProfileScreen.tsx`)

New screen for profile management:

- Displays current profile photo or placeholder
- "Upload Photo" button with options:
  - Take Photo (Camera)
  - Pick from Gallery
- Shows user name and email
- Updates photo in AsyncStorage after upload

### 3. Navigation (`mobile/src/navigation/AppNavigator.tsx`)

Added Profile screen to navigation:

```javascript
<Stack.Screen
  name="Profile"
  component={ProfileScreen}
  options={{ headerShown: true, title: "Profile" }}
/>
```

### 4. Dependencies

Added `react-native-image-picker`:

```bash
npm install react-native-image-picker
```

### 5. Android Permissions (`mobile/android/app/src/main/AndroidManifest.xml`)

Added permissions for camera and gallery:

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
```

## Testing Instructions

### 1. Start Backend

```bash
cd c:\tkg\pusti-ht-mern
node backend/server.js
```

### 2. Start Metro Bundler

```bash
cd c:\tkg\pusti-ht-mern\mobile
npx react-native start --port 8088 --reset-cache
```

### 3. Build and Run Mobile App

```bash
cd c:\tkg\pusti-ht-mern\mobile
npx react-native run-android
```

### 4. Test Flow

1. Login with credentials (e.g., superadmin/admin123)
2. On Home screen, you'll see:
   - Avatar placeholder with first letter of name
   - Username
   - "Edit Profile" button
3. Click avatar or "Edit Profile" button
4. On Profile screen:
   - Click "Upload Photo"
   - Choose "Camera" or "Gallery"
   - Select/take a photo
   - Photo will upload and display
5. Navigate back to Home screen
6. Avatar should now show the uploaded photo

## API Endpoints Summary

| Endpoint                       | Method | Auth | Purpose                       |
| ------------------------------ | ------ | ---- | ----------------------------- |
| `/api/v1/profile/upload-photo` | POST   | Yes  | Upload profile photo          |
| `/api/v1/profile/me`           | GET    | Yes  | Get user profile              |
| `/api/v1/auth/login`           | POST   | No   | Login (returns profile_photo) |

## File Storage

- **Directory:** `backend/public/images/profiles/`
- **URL Format:** `/images/profiles/profile-{timestamp}-{random}.{ext}`
- **Access:** Static files served by Express

## Features

✅ Photo upload from camera or gallery
✅ Profile photo display on home screen
✅ Profile photo in login response
✅ Old photo deletion on new upload
✅ 5MB file size limit
✅ Support for JPG, PNG, WEBP formats
✅ Placeholder avatar with user's first letter
✅ Profile management screen

## Notes

- Photos are stored in backend public directory
- Image URLs are relative paths (e.g., `/images/profiles/profile-123.jpg`)
- In mobile app, full URL is constructed: `http://10.0.2.2:8080{photoUrl}`
- DSR model uses `profile_picture_url` field (existing)
- Employee and Distributor models use new `profile_photo` field
- User data in AsyncStorage is updated after photo upload

## Security

- JWT authentication required for all profile endpoints
- File type validation (only images allowed)
- File size validation (max 5MB)
- User can only upload their own photo (userId from JWT token)

## Future Enhancements

- Image compression before upload
- Image cropping functionality
- Multiple photo sizes (thumbnail, medium, full)
- Photo upload progress indicator
- Delete photo functionality
- Change photo from profile settings
