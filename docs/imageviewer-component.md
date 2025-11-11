# ImageViewer Component Documentation

## Overview

A reusable Material-UI modal component for viewing images and PDFs with advanced controls including zoom, rotate, pan, and download capabilities.

## Location

`frontend/src/components/common/ImageViewer.tsx`

---

## Features

### ✅ Core Features

- **Modal Dialog**: Full-screen popup with dark background
- **Image Support**: JPG, JPEG, PNG
- **PDF Support**: Inline PDF viewer using iframe
- **Responsive**: Adapts to different screen sizes

### ✅ Image Controls

- **Zoom In/Out**:

  - Buttons in toolbar
  - Mouse wheel scroll
  - Keyboard shortcuts: `+` (zoom in), `-` (zoom out)
  - Zoom range: 25% to 500%
  - Current zoom percentage displayed

- **Rotate**:

  - Rotate left/right buttons
  - Keyboard shortcut: `R` (rotate right)
  - 90-degree increments

- **Pan/Drag**:

  - Click and drag when zoomed > 100%
  - Cursor changes to grab/grabbing
  - Smooth dragging experience

- **Fit to Screen**:

  - Reset zoom to 100%, rotation to 0°, position to center
  - Keyboard shortcut: `0`
  - Button in toolbar

- **Download**:
  - Download button in toolbar
  - Downloads with original filename

### ✅ User Experience

- **Keyboard Shortcuts**:

  - `ESC` - Close viewer
  - `+` or `=` - Zoom in
  - `-` or `_` - Zoom out
  - `R` - Rotate right
  - `0` - Fit to screen

- **Visual Feedback**:

  - Disabled buttons when at limits (min/max zoom)
  - Cursor changes (pointer on controls, grab/grabbing when panning)
  - Smooth transitions (except when dragging)
  - Help text at bottom for guidance

- **Accessibility**:
  - Tooltips on all buttons
  - Alt text for images
  - Keyboard navigation support

---

## Props Interface

```typescript
interface ImageViewerProps {
  open: boolean; // Controls dialog visibility
  onClose: () => void; // Callback when dialog closes
  imageUrl: string; // Full URL to image/PDF
  imageName?: string; // Display name (optional, default: "Image")
  imageType?: string; // MIME type (optional, default: "image")
}
```

---

## Usage Examples

### Basic Usage

```tsx
import ImageViewer from "@/components/common/ImageViewer";
import { useState } from "react";

function MyComponent() {
  const [viewerOpen, setViewerOpen] = useState(false);

  return (
    <>
      <button onClick={() => setViewerOpen(true)}>View Image</button>

      <ImageViewer
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
        imageUrl="https://example.com/image.jpg"
        imageName="Receipt.jpg"
        imageType="image/jpeg"
      />
    </>
  );
}
```

### Collection Receipt Viewer

```tsx
import ImageViewer from "@/components/common/ImageViewer";
import { useState } from "react";

interface Collection {
  transaction_id: string;
  image?: {
    file_name: string;
    file_path: string;
    mime_type: string;
  };
}

function CollectionDetails({ collection }: { collection: Collection }) {
  const [viewerOpen, setViewerOpen] = useState(false);

  const handleViewReceipt = () => {
    if (!collection.image) return;
    setViewerOpen(true);
  };

  return (
    <div>
      {collection.image && (
        <>
          <img
            src={`${process.env.NEXT_PUBLIC_API_URL}${collection.image.file_path}`}
            alt="Receipt thumbnail"
            onClick={handleViewReceipt}
            style={{ cursor: "pointer", width: 100, height: 100 }}
          />

          <ImageViewer
            open={viewerOpen}
            onClose={() => setViewerOpen(false)}
            imageUrl={`${process.env.NEXT_PUBLIC_API_URL}${collection.image.file_path}`}
            imageName={collection.image.file_name}
            imageType={collection.image.mime_type}
          />
        </>
      )}
    </div>
  );
}
```

### Dynamic Image Selection

```tsx
import ImageViewer from "@/components/common/ImageViewer";
import { useState } from "react";

function ImageGallery({ images }: { images: Array<{ url: string; name: string }> }) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ url: string; name: string } | null>(null);

  const handleImageClick = (image: (typeof images)[0]) => {
    setSelectedImage(image);
    setViewerOpen(true);
  };

  const handleClose = () => {
    setViewerOpen(false);
    setSelectedImage(null);
  };

  return (
    <div>
      {images.map((image, index) => (
        <img
          key={index}
          src={image.url}
          alt={image.name}
          onClick={() => handleImageClick(image)}
          style={{ cursor: "pointer", width: 100, margin: 10 }}
        />
      ))}

      {selectedImage && (
        <ImageViewer
          open={viewerOpen}
          onClose={handleClose}
          imageUrl={selectedImage.url}
          imageName={selectedImage.name}
        />
      )}
    </div>
  );
}
```

---

## Integration with Collections Module

### 1. Collection List - Thumbnail View

```tsx
<Box
  component="img"
  src={`${API_URL}${collection.image.file_path}`}
  alt="Receipt"
  onClick={() => handleViewImage(collection.image)}
  sx={{
    width: 80,
    height: 80,
    objectFit: "cover",
    cursor: "pointer",
    borderRadius: 1,
    border: "2px solid transparent",
    transition: "border-color 0.2s",
    "&:hover": {
      borderColor: "primary.main",
    },
  }}
/>
```

### 2. Collection Details - Full Image Display

```tsx
{
  collection.image && (
    <Box>
      <Typography variant="subtitle2">Receipt/Slip:</Typography>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          p: 2,
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 1,
        }}
      >
        <PictureAsPdf sx={{ fontSize: 40, color: "error.main" }} />
        <Box sx={{ flex: 1 }}>
          <Typography>{collection.image.file_name}</Typography>
          <Typography variant="caption" color="text.secondary">
            {(collection.image.file_size / 1024).toFixed(0)} KB
          </Typography>
        </Box>
        <IconButton color="primary" onClick={() => handleViewImage(collection.image)}>
          <Visibility />
        </IconButton>
      </Box>
    </Box>
  );
}
```

---

## Technical Details

### State Management

The component manages four pieces of state:

- `zoom`: Current zoom level (0.25 to 5.0)
- `rotation`: Current rotation angle (0, 90, 180, 270)
- `position`: Current pan position {x, y}
- `isDragging`: Whether user is currently dragging

### Performance Considerations

1. **Smooth Transitions**: CSS transitions for zoom/rotate, disabled during drag
2. **Event Cleanup**: Keyboard listeners removed on unmount
3. **State Reset**: All state reset when dialog opens/closes
4. **Optimized Rendering**: Uses refs to avoid unnecessary re-renders

### Browser Compatibility

- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari
- ✅ Mobile browsers (touch events supported)

### Accessibility

- ✅ Keyboard navigation
- ✅ Screen reader support (aria labels)
- ✅ Focus management
- ✅ ESC key to close

---

## Customization

### Styling

The component uses Material-UI's `sx` prop for styling. Key customization points:

```tsx
// Dialog size
PaperProps={{
  sx: {
    width: "90vw",      // Change dialog width
    height: "90vh",     // Change dialog height
  }
}}

// Background color
sx={{
  bgcolor: "rgba(0, 0, 0, 0.95)",  // Change background darkness
}}

// Toolbar background
sx={{
  bgcolor: "rgba(0, 0, 0, 0.8)",   // Change toolbar darkness
  backdropFilter: "blur(10px)",     // Change blur effect
}}
```

### Zoom Range

Modify zoom limits in the component:

```tsx
const handleZoomIn = () => {
  setZoom((prev) => Math.min(prev + 0.25, 5)); // Max zoom: 5x
};

const handleZoomOut = () => {
  setZoom((prev) => Math.max(prev - 0.25, 0.25)); // Min zoom: 0.25x
};
```

### Keyboard Shortcuts

Customize shortcuts in the `handleKeyDown` function:

```tsx
case "r":  // Change to different key
case "R":
  handleRotateRight();
  break;
```

---

## Common Issues & Solutions

### Issue: Image not displaying

**Solution**: Verify the `imageUrl` is accessible and CORS is configured properly on the API server.

### Issue: PDF not loading

**Solution**: Ensure the server sends correct Content-Type header (`application/pdf`) and CORS allows iframe embedding.

### Issue: Slow performance with large images

**Solution**: Consider implementing image optimization/resizing on the backend before serving.

### Issue: Drag not working

**Solution**: Ensure zoom is > 1. Pan/drag is only enabled when zoomed in.

---

## Future Enhancements (Not Implemented)

- [ ] Pinch-to-zoom on mobile devices
- [ ] Image comparison (side-by-side view)
- [ ] Annotation tools (draw, highlight)
- [ ] Image filters (brightness, contrast)
- [ ] Full-screen mode
- [ ] Image gallery navigation (prev/next)
- [ ] Touch gestures on mobile
- [ ] Image metadata display (EXIF)

---

## Dependencies

Required packages (already in package.json):

- `@mui/material`: ^7.3.2
- `@mui/icons-material`: ^7.3.2
- `react`: 19.1.0

No additional dependencies needed!

---

## Example Component Reference

See `frontend/src/components/common/ImageViewerExample.tsx` for a complete working example with:

- File type detection (PDF vs Image)
- Thumbnail display
- Click-to-view functionality
- Integration with collection data structure

---

## Summary

The ImageViewer component provides a professional, user-friendly way to view images and PDFs with advanced controls. It's:

- ✅ Easy to integrate (just 3 props required)
- ✅ Feature-rich (zoom, rotate, pan, download)
- ✅ Accessible (keyboard shortcuts, screen readers)
- ✅ Performant (smooth transitions, optimized rendering)
- ✅ Flexible (works with images and PDFs)
- ✅ Production-ready (error handling, edge cases covered)

Perfect for viewing collection receipts, documents, and any other uploaded images in your application!
