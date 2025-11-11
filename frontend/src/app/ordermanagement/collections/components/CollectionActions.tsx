"use client";

import React, { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  CircularProgress,
  Typography,
} from "@mui/material";
import {
  Forward as ForwardIcon,
  Undo as ReturnIcon,
  Cancel as CancelIcon,
  CheckCircle as ApproveIcon,
  Edit as EditIcon,
} from "@mui/icons-material";
import collectionsApi, { Collection } from "@/services/collectionsApi";
import toast from "react-hot-toast";

interface CollectionActionsProps {
  collection: Collection;
  userRole: string;
  onActionComplete: () => void;
}

export default function CollectionActions({
  collection,
  userRole,
  onActionComplete,
}: CollectionActionsProps) {
  const [actionDialog, setActionDialog] = useState<{
    type: "forward" | "return" | "cancel" | "approve" | null;
    open: boolean;
  }>({ type: null, open: false });
  const [actionInput, setActionInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);

  // Determine which actions are available
  const canForward =
    ["ASM", "RSM", "Sales Admin", "Order Management"].includes(userRole) &&
    !["approved", "cancelled"].includes(collection.approval_status);

  const canReturn =
    (userRole === "Order Management" &&
      collection.approval_status === "forwarded_to_order_management") ||
    (userRole === "Finance" && collection.approval_status === "forwarded_to_finance");

  const canApprove =
    userRole === "Finance" && collection.approval_status === "forwarded_to_finance";

  const canCancel =
    !["approved", "cancelled"].includes(collection.approval_status) &&
    ["ASM", "RSM", "Sales Admin", "Order Management", "Finance"].includes(userRole);

  const canEdit =
    !["approved", "cancelled"].includes(collection.approval_status) &&
    ["ASM", "RSM", "Sales Admin", "Order Management", "Finance"].includes(userRole);

  const getNextRole = (): string => {
    const nextRoles: Record<string, string> = {
      pending: "RSM",
      forwarded_to_area_manager: "RSM",
      forwarded_to_regional_manager: "Sales Admin",
      forwarded_to_zonal_manager_and_sales_admin: "Order Management",
      returned_to_sales_admin: "Order Management",
      forwarded_to_order_management: "Finance",
    };
    return nextRoles[collection.approval_status] || "Next Approver";
  };

  const openActionDialog = (type: "forward" | "return" | "cancel" | "approve") => {
    setActionDialog({ type, open: true });
    setActionInput("");
  };

  const closeActionDialog = () => {
    setActionDialog({ type: null, open: false });
    setActionInput("");
  };

  const handleAction = async () => {
    if (!actionDialog.type) return;

    // Validate required fields
    if (
      (actionDialog.type === "return" || actionDialog.type === "cancel") &&
      !actionInput.trim()
    ) {
      toast.error(`${actionDialog.type === "return" ? "Return reason" : "Cancellation reason"} is required`);
      return;
    }

    // Show confirmation dialog for cancel action
    if (actionDialog.type === "cancel") {
      setConfirmCancelOpen(true);
      return;
    }

    setLoading(true);
    try {
      switch (actionDialog.type) {
        case "forward":
          await collectionsApi.forward(collection._id, actionInput);
          toast.success(`Payment forwarded to ${getNextRole()}`);
          break;
        case "return":
          await collectionsApi.returnToSalesAdmin(collection._id, actionInput);
          toast.success("Payment returned to Sales Admin");
          break;
        case "approve":
          await collectionsApi.approve(collection._id, actionInput);
          toast.success("Payment approved successfully");
          break;
      }
      closeActionDialog();
      onActionComplete();
    } catch (error: any) {
      console.error(`Error ${actionDialog.type}ing collection:`, error);
      toast.error(error.response?.data?.message || `Failed to ${actionDialog.type} payment`);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCancel = async () => {
    setLoading(true);
    try {
      await collectionsApi.cancel(collection._id, actionInput);
      toast.success("Payment cancelled");
      setConfirmCancelOpen(false);
      closeActionDialog();
      onActionComplete();
    } catch (error: any) {
      console.error("Error cancelling collection:", error);
      toast.error(error.response?.data?.message || "Failed to cancel payment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
        {canForward && (
          <Button
            variant="contained"
            startIcon={<ForwardIcon />}
            onClick={() => openActionDialog("forward")}
          >
            Forward to {getNextRole()}
          </Button>
        )}

        {canReturn && (
          <Button
            variant="outlined"
            color="warning"
            startIcon={<ReturnIcon />}
            onClick={() => openActionDialog("return")}
          >
            Return to Sales Admin
          </Button>
        )}

        {canApprove && (
          <Button
            variant="contained"
            color="success"
            startIcon={<ApproveIcon />}
            onClick={() => openActionDialog("approve")}
          >
            Approve Payment
          </Button>
        )}

        {canCancel && (
          <Button
            variant="outlined"
            color="error"
            startIcon={<CancelIcon />}
            onClick={() => openActionDialog("cancel")}
          >
            Cancel Payment
          </Button>
        )}
      </Stack>

      {/* Action Dialog */}
      <Dialog
        open={actionDialog.open}
        onClose={closeActionDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {actionDialog.type === "forward" && `Forward to ${getNextRole()}`}
          {actionDialog.type === "return" && "Return to Sales Admin"}
          {actionDialog.type === "cancel" && "Cancel Payment"}
          {actionDialog.type === "approve" && "Approve Payment"}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              multiline
              rows={4}
              label={
                actionDialog.type === "return"
                  ? "Return Reason *"
                  : actionDialog.type === "cancel"
                  ? "Cancellation Reason *"
                  : "Comments (Optional)"
              }
              value={actionInput}
              onChange={(e) => setActionInput(e.target.value)}
              placeholder={
                actionDialog.type === "return"
                  ? "Please provide reason for returning (e.g., Missing DO number, Bank account mismatch)"
                  : actionDialog.type === "cancel"
                  ? "Please provide reason for cancellation"
                  : "Add any comments or notes"
              }
              required={actionDialog.type === "return" || actionDialog.type === "cancel"}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeActionDialog} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleAction}
            variant="contained"
            disabled={loading}
            color={
              actionDialog.type === "approve"
                ? "success"
                : actionDialog.type === "cancel"
                ? "error"
                : actionDialog.type === "return"
                ? "warning"
                : "primary"
            }
          >
            {loading ? <CircularProgress size={24} /> : "Confirm"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog for Cancel Payment */}
      <Dialog open={confirmCancelOpen} onClose={() => setConfirmCancelOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: "error.main" }}>
          ⚠️ Confirm Payment Cancellation
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body1" gutterBottom fontWeight={500}>
              Are you absolutely sure you want to cancel this payment?
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              This action is <strong>permanent</strong> and cannot be undone. The payment record will be marked as cancelled.
            </Typography>
            {actionInput && (
              <Box sx={{ mt: 2, p: 2, bgcolor: "grey.100", borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Cancellation Reason:
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  {actionInput}
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmCancelOpen(false)} disabled={loading}>
            Go Back
          </Button>
          <Button
            onClick={handleConfirmCancel}
            variant="contained"
            color="error"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : "Yes, Cancel Payment"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
