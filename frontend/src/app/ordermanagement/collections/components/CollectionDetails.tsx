"use client";

import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Stack,
  Chip,
  Divider,
  IconButton,
  Paper,
} from "@mui/material";
import {
  Visibility as VisibilityIcon,
  PictureAsPdf as PdfIcon,
  Image as ImageIcon,
} from "@mui/icons-material";
import { format } from "date-fns";
import { Collection } from "@/services/collectionsApi";
import { useAuth } from "@/contexts/AuthContext";
import CollectionActions from "./CollectionActions";
import ApprovalHistory from "./ApprovalHistory";

interface CollectionDetailsProps {
  open: boolean;
  onClose: () => void;
  collection: Collection;
  onViewImage?: (image: Collection["image"]) => void;
  onActionComplete?: () => void;
}

export default function CollectionDetails({
  open,
  onClose,
  collection,
  onViewImage,
  onActionComplete,
}: CollectionDetailsProps) {
  const { user } = useAuth();

  const formatAmount = (amount: string | number | undefined): string => {
    if (amount === undefined || amount === null || amount === "") {
      return "0.00";
    }
    const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
    if (isNaN(numAmount)) {
      return "0.00";
    }
    return numAmount.toLocaleString("en-BD", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      pending: "Pending Review",
      forwarded_to_area_manager: "With ASM",
      forwarded_to_regional_manager: "With RSM",
      forwarded_to_zonal_manager_and_sales_admin: "With ZSM & Sales Admin",
      returned_to_sales_admin: "Returned for Rework",
      forwarded_to_order_management: "With Order Management",
      forwarded_to_finance: "With Finance",
      approved: "Approved",
      cancelled: "Cancelled",
    };
    return labels[status] || status;
  };

  const getStatusColor = (
    status: string
  ): "default" | "primary" | "success" | "error" | "warning" => {
    if (status === "approved") return "success";
    if (status === "cancelled") return "error";
    if (status === "returned_to_sales_admin") return "warning";
    if (status === "pending") return "default";
    return "primary";
  };

  const handleActionComplete = () => {
    if (onActionComplete) {
      onActionComplete();
    }
  };

  const DetailRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <Box sx={{ display: "flex", py: 1 }}>
      <Typography variant="body2" color="text.secondary" sx={{ width: 180 }}>
        {label}:
      </Typography>
      <Typography variant="body2" component="div" fontWeight={500} sx={{ flex: 1 }}>
        {value}
      </Typography>
    </Box>
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <span>Payment Details</span>
          <Stack direction="row" spacing={1}>
            <Chip
              label={getStatusLabel(collection.approval_status)}
              color={getStatusColor(collection.approval_status)}
              size="small"
            />
            <Chip
              label={collection.payment_method}
              color={collection.payment_method === "Bank" ? "primary" : "success"}
              size="small"
            />
          </Stack>
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3}>
          {/* Approval Actions */}
          {user && !["approved", "cancelled"].includes(collection.approval_status) && (
            <Box>
              <CollectionActions
                collection={collection}
                userRole={user.role?.role || ""}
                onActionComplete={handleActionComplete}
              />
            </Box>
          )}

          {/* Basic Info */}
          <Box>
            <Typography variant="subtitle2" gutterBottom color="primary">
              Transaction Information
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <DetailRow label="Transaction ID" value={collection.transaction_id} />
            <DetailRow
              label="Status"
              value={
                <Chip
                  label={getStatusLabel(collection.approval_status)}
                  color={getStatusColor(collection.approval_status)}
                  size="small"
                />
              }
            />
            <DetailRow
              label="Deposit Amount"
              value={
                <Typography variant="h6" color="success.main">
                  BDT {formatAmount(collection.deposit_amount)}
                </Typography>
              }
            />
            <DetailRow
              label="Deposit Date"
              value={format(new Date(collection.deposit_date), "dd MMMM yyyy")}
            />
            <DetailRow
              label="Demand Order"
              value={
                collection.do_no || (
                  <Typography variant="body2" color="text.secondary">
                    Not linked to any order
                  </Typography>
                )
              }
            />
          </Box>

          {/* Bank Payment Details */}
          {collection.payment_method === "Bank" && (
            <Box>
              <Typography variant="subtitle2" gutterBottom color="primary">
                Bank Payment Details
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <DetailRow
                label="Company Bank"
                value={collection.company_bank?.name || "-"}
              />
              <DetailRow
                label="Company Account No"
                value={collection.company_bank_account_no || "-"}
              />
              <DetailRow
                label="Depositor Bank"
                value={collection.depositor_bank?.name || "-"}
              />
              <DetailRow
                label="Depositor Branch"
                value={collection.depositor_branch || "-"}
              />
            </Box>
          )}

          {/* Cash Payment Details */}
          {collection.payment_method === "Cash" && (
            <Box>
              <Typography variant="subtitle2" gutterBottom color="primary">
                Cash Payment Details
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <DetailRow label="Cash Method" value={collection.cash_method || "-"} />
            </Box>
          )}

          {/* Common Details */}
          <Box>
            <Typography variant="subtitle2" gutterBottom color="primary">
              Additional Information
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <DetailRow label="Depositor Mobile" value={collection.depositor_mobile} />
            {collection.note && <DetailRow label="Note" value={collection.note} />}
          </Box>

          {/* Receipt/Slip */}
          {collection.image && (
            <Box>
              <Typography variant="subtitle2" gutterBottom color="primary">
                Receipt/Slip
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                }}
              >
                {collection.image.mime_type === "application/pdf" ? (
                  <PdfIcon sx={{ fontSize: 40, color: "error.main" }} />
                ) : (
                  <ImageIcon sx={{ fontSize: 40, color: "primary.main" }} />
                )}
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" fontWeight={500}>
                    {collection.image.file_name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {(collection.image.file_size / 1024).toFixed(0)} KB •{" "}
                    {collection.image.mime_type === "application/pdf" ? "PDF" : "Image"}
                  </Typography>
                </Box>
                {onViewImage && (
                  <IconButton
                    color="primary"
                    onClick={() => onViewImage(collection.image)}
                  >
                    <VisibilityIcon />
                  </IconButton>
                )}
              </Paper>
            </Box>
          )}

          {/* Audit Info */}
          <Box>
            <Typography variant="subtitle2" gutterBottom color="primary">
              Audit Information
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <DetailRow
              label="Created By"
              value={collection.created_by?.username || "-"}
            />
            <DetailRow
              label="Created At"
              value={format(new Date(collection.created_at), "dd MMM yyyy, hh:mm a")}
            />
          </Box>

          {/* Approval History */}
          {collection.approval_chain && collection.approval_chain.length > 0 && (
            <ApprovalHistory approvalChain={collection.approval_chain} />
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
