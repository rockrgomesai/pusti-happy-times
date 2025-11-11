/**
 * ImageViewer Component
 * 
 * A modal popup for viewing images with zoom, rotate, and pan controls.
 * Features:
 * - Zoom in/out with buttons or mouse wheel
 * - Rotate left/right
 * - Pan/drag image when zoomed
 * - Fit to screen
 * - Keyboard shortcuts (ESC to close, +/- for zoom, R for rotate)
 */

"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  IconButton,
  Box,
  Typography,
  Tooltip,
  Stack,
} from "@mui/material";
import {
  Close as CloseIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  RotateLeft as RotateLeftIcon,
  RotateRight as RotateRightIcon,
  FitScreen as FitScreenIcon,
  Download as DownloadIcon,
} from "@mui/icons-material";

interface ImageViewerProps {
  open: boolean;
  onClose: () => void;
  imageUrl: string;
  imageName?: string;
  imageType?: string;
}

export default function ImageViewer({
  open,
  onClose,
  imageUrl,
  imageName = "Image",
  imageType = "image",
}: ImageViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setZoom(1);
      setRotation(0);
      setPosition({ x: 0, y: 0 });
      setIsDragging(false);
    }
  }, [open]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "+":
        case "=":
          handleZoomIn();
          break;
        case "-":
        case "_":
          handleZoomOut();
          break;
        case "r":
        case "R":
          handleRotateRight();
          break;
        case "0":
          handleFitScreen();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, zoom, rotation]);

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.25, 5));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.25, 0.25));
  };

  const handleRotateLeft = () => {
    setRotation((prev) => (prev - 90) % 360);
  };

  const handleRotateRight = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleFitScreen = () => {
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = imageName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isPDF = imageType === "application/pdf" || imageName.toLowerCase().endsWith(".pdf");

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      fullWidth
      PaperProps={{
        sx: {
          width: "90vw",
          height: "90vh",
          maxWidth: "none",
          maxHeight: "none",
          bgcolor: "rgba(0, 0, 0, 0.95)",
        },
      }}
    >
      {/* Header with controls */}
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1,
          bgcolor: "rgba(0, 0, 0, 0.8)",
          backdropFilter: "blur(10px)",
          p: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Typography
          variant="subtitle1"
          sx={{ color: "white", ml: 1, fontWeight: 500 }}
        >
          {imageName}
        </Typography>

        <Stack direction="row" spacing={1}>
          {!isPDF && (
            <>
              <Tooltip title="Zoom Out (-)">
                <IconButton
                  onClick={handleZoomOut}
                  disabled={zoom <= 0.25}
                  sx={{ color: "white" }}
                >
                  <ZoomOutIcon />
                </IconButton>
              </Tooltip>

              <Typography
                variant="body2"
                sx={{
                  color: "white",
                  alignSelf: "center",
                  minWidth: 60,
                  textAlign: "center",
                }}
              >
                {Math.round(zoom * 100)}%
              </Typography>

              <Tooltip title="Zoom In (+)">
                <IconButton
                  onClick={handleZoomIn}
                  disabled={zoom >= 5}
                  sx={{ color: "white" }}
                >
                  <ZoomInIcon />
                </IconButton>
              </Tooltip>

              <Tooltip title="Rotate Left">
                <IconButton onClick={handleRotateLeft} sx={{ color: "white" }}>
                  <RotateLeftIcon />
                </IconButton>
              </Tooltip>

              <Tooltip title="Rotate Right (R)">
                <IconButton onClick={handleRotateRight} sx={{ color: "white" }}>
                  <RotateRightIcon />
                </IconButton>
              </Tooltip>

              <Tooltip title="Fit to Screen (0)">
                <IconButton onClick={handleFitScreen} sx={{ color: "white" }}>
                  <FitScreenIcon />
                </IconButton>
              </Tooltip>
            </>
          )}

          <Tooltip title="Download">
            <IconButton onClick={handleDownload} sx={{ color: "white" }}>
              <DownloadIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Close (ESC)">
            <IconButton onClick={onClose} sx={{ color: "white" }}>
              <CloseIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {/* Image container */}
      <DialogContent
        ref={containerRef}
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          cursor: zoom > 1 && !isPDF ? (isDragging ? "grabbing" : "grab") : "default",
          bgcolor: "rgba(0, 0, 0, 0.95)",
          p: 0,
          mt: 7,
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        {isPDF ? (
          <Box
            component="iframe"
            src={imageUrl}
            title={imageName}
            sx={{
              width: "100%",
              height: "100%",
              border: "none",
            }}
          />
        ) : (
          <Box
            component="img"
            ref={imageRef}
            src={imageUrl}
            alt={imageName}
            draggable={false}
            sx={{
              maxWidth: "100%",
              maxHeight: "100%",
              width: "auto",
              height: "auto",
              transform: `translate(${position.x}px, ${position.y}px) rotate(${rotation}deg) scale(${zoom})`,
              transformOrigin: "center center",
              transition: isDragging ? "none" : "transform 0.3s ease",
              userSelect: "none",
              pointerEvents: "none",
            }}
          />
        )}
      </DialogContent>

      {/* Help text */}
      {!isPDF && (
        <Box
          sx={{
            position: "absolute",
            bottom: 10,
            left: "50%",
            transform: "translateX(-50%)",
            color: "rgba(255, 255, 255, 0.6)",
            fontSize: 12,
            textAlign: "center",
            pointerEvents: "none",
          }}
        >
          Use mouse wheel to zoom • Drag to pan when zoomed • Press R to rotate
        </Box>
      )}
    </Dialog>
  );
}
