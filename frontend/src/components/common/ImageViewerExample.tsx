/**
 * Example: How to use ImageViewer in Collections
 * 
 * This demonstrates integrating the ImageViewer component
 * with collection image/receipt display.
 */

"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  Visibility as VisibilityIcon,
  PictureAsPdf as PdfIcon,
  Image as ImageIcon,
} from "@mui/icons-material";
import ImageViewer from "@/components/common/ImageViewer";

// Example collection data structure
interface Collection {
  transaction_id: string;
  payment_method: string;
  deposit_amount: string;
  image?: {
    file_name: string;
    file_path: string;
    file_size: number;
    mime_type: string;
  };
}

export default function CollectionImageExample() {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{
    url: string;
    name: string;
    type: string;
  } | null>(null);

  // Example collection with image
  const collection: Collection = {
    transaction_id: "COL-20250108-00001",
    payment_method: "Bank",
    deposit_amount: "5000.00",
    image: {
      file_name: "receipt-20250108.jpg",
      file_path: "/uploads/collections/collection-1704707445123-123456789.jpg",
      file_size: 245678,
      mime_type: "image/jpeg",
    },
  };

  const handleImageClick = (image: Collection["image"]) => {
    if (!image) return;

    // Construct full URL (adjust based on your API base URL)
    // Static files are served from root /uploads, not /api/v1/uploads
    const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';
    const baseUrl = isLocalhost ? 'http://localhost:5000' : '';
    const imageUrl = `${baseUrl}${image.file_path}`;

    setSelectedImage({
      url: imageUrl,
      name: image.file_name,
      type: image.mime_type,
    });
    setViewerOpen(true);
  };

  const handleCloseViewer = () => {
    setViewerOpen(false);
    setSelectedImage(null);
  };

  const isPDF = (mimeType: string) => mimeType === "application/pdf";
  const isImage = (mimeType: string) => mimeType.startsWith("image/");

  return (
    <Card sx={{ maxWidth: 600, mx: "auto", mt: 4 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Collection: {collection.transaction_id}
        </Typography>

        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Payment Method: {collection.payment_method}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Amount: BDT {collection.deposit_amount}
          </Typography>
        </Box>

        {collection.image && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Receipt/Slip:
            </Typography>

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                p: 2,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
                bgcolor: "background.paper",
              }}
            >
              {/* Icon based on file type */}
              {isPDF(collection.image.mime_type) ? (
                <PdfIcon sx={{ fontSize: 40, color: "error.main" }} />
              ) : (
                <ImageIcon sx={{ fontSize: 40, color: "primary.main" }} />
              )}

              {/* File info */}
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" fontWeight={500}>
                  {collection.image.file_name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {(collection.image.file_size / 1024).toFixed(0)} KB •{" "}
                  {isPDF(collection.image.mime_type) ? "PDF" : "Image"}
                </Typography>
              </Box>

              {/* View button */}
              <Tooltip title="View">
                <IconButton
                  color="primary"
                  onClick={() => handleImageClick(collection.image)}
                >
                  <VisibilityIcon />
                </IconButton>
              </Tooltip>
            </Box>

            {/* Alternative: Thumbnail with click to view */}
            {isImage(collection.image.mime_type) && (
              <Box
                sx={{
                  mt: 2,
                  cursor: "pointer",
                  borderRadius: 1,
                  overflow: "hidden",
                  border: "2px solid",
                  borderColor: "divider",
                  transition: "border-color 0.2s",
                  "&:hover": {
                    borderColor: "primary.main",
                  },
                }}
                onClick={() => handleImageClick(collection.image)}
              >
                <Box
                  component="img"
                  src={`${typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:5000' : ''}${collection.image.file_path}`}
                  alt={collection.image.file_name}
                  sx={{
                    width: "100%",
                    maxHeight: 200,
                    objectFit: "contain",
                    display: "block",
                  }}
                />
                <Typography
                  variant="caption"
                  sx={{
                    display: "block",
                    textAlign: "center",
                    py: 0.5,
                    bgcolor: "action.hover",
                  }}
                >
                  Click to view full size
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </CardContent>

      {/* Image Viewer Modal */}
      {selectedImage && (
        <ImageViewer
          open={viewerOpen}
          onClose={handleCloseViewer}
          imageUrl={selectedImage.url}
          imageName={selectedImage.name}
          imageType={selectedImage.type}
        />
      )}
    </Card>
  );
}

/**
 * Usage in Collection List/Details:
 * 
 * 1. Import the ImageViewer component
 * 2. Add state for viewer:
 *    const [viewerOpen, setViewerOpen] = useState(false);
 *    const [selectedImage, setSelectedImage] = useState(null);
 * 
 * 3. Handle image click:
 *    const handleImageClick = (image) => {
 *      setSelectedImage({
 *        url: `${API_URL}${image.file_path}`,
 *        name: image.file_name,
 *        type: image.mime_type,
 *      });
 *      setViewerOpen(true);
 *    };
 * 
 * 4. Render the viewer:
 *    <ImageViewer
 *      open={viewerOpen}
 *      onClose={() => setViewerOpen(false)}
 *      imageUrl={selectedImage?.url}
 *      imageName={selectedImage?.name}
 *      imageType={selectedImage?.type}
 *    />
 * 
 * 5. Make image clickable:
 *    <img
 *      src={imageUrl}
 *      onClick={() => handleImageClick(collection.image)}
 *      style={{ cursor: 'pointer' }}
 *    />
 */
