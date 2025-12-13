"use client";

import React, { useEffect } from "react";
import { Box, Button, Container, Typography } from "@mui/material";

export default function Error(
  props: {
    error: Error & { digest?: string };
    reset: () => void;
  }
) {
  const { error, reset } = props;

  useEffect(() => {
    // Always log so we can see the real runtime error in production.
    console.error("[schedule-requisitions] route error:", error);
  }, [error]);

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ p: 2, border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
        <Typography variant="h6" gutterBottom>
          Something went wrong on this page
        </Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Please try again. If it keeps happening, share the console error log.
        </Typography>
        <Button variant="contained" onClick={reset}>
          Try again
        </Button>
      </Box>
    </Container>
  );
}
