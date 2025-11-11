"use client";

import React from "react";
import {
  Box,
  Typography,
  Paper,
  Chip,
  Stack,
} from "@mui/material";
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent,
} from "@mui/lab";
import {
  Send as SendIcon,
  Forward as ForwardIcon,
  Undo as ReturnIcon,
  Edit as EditIcon,
  CheckCircle as ApproveIcon,
  Cancel as CancelIcon,
} from "@mui/icons-material";
import { format } from "date-fns";

interface ApprovalAction {
  action: string;
  from_role: string;
  to_role: string;
  performed_by: string;
  performed_by_name: string;
  comments: string;
  timestamp: string;
}

interface ApprovalHistoryProps {
  approvalChain: ApprovalAction[];
}

export default function ApprovalHistory({ approvalChain }: ApprovalHistoryProps) {
  const getActionIcon = (action: string) => {
    switch (action) {
      case "submit":
        return <SendIcon fontSize="small" />;
      case "forward":
        return <ForwardIcon fontSize="small" />;
      case "return":
        return <ReturnIcon fontSize="small" />;
      case "edit":
        return <EditIcon fontSize="small" />;
      case "approve":
        return <ApproveIcon fontSize="small" />;
      case "cancel":
        return <CancelIcon fontSize="small" />;
      default:
        return null;
    }
  };

  const getActionColor = (
    action: string
  ): "primary" | "warning" | "error" | "success" | "info" | "grey" => {
    switch (action) {
      case "submit":
        return "info";
      case "forward":
        return "primary";
      case "return":
        return "warning";
      case "edit":
        return "grey";
      case "approve":
        return "success";
      case "cancel":
        return "error";
      default:
        return "grey";
    }
  };

  const getActionLabel = (action: string): string => {
    switch (action) {
      case "submit":
        return "Submitted";
      case "forward":
        return "Forwarded";
      case "return":
        return "Returned";
      case "edit":
        return "Edited";
      case "approve":
        return "Approved";
      case "cancel":
        return "Cancelled";
      default:
        return action;
    }
  };

  if (!approvalChain || approvalChain.length === 0) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography color="text.secondary">No approval history available</Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Approval History
      </Typography>

      <Timeline position="right">
        {approvalChain.slice().reverse().map((action, index) => (
          <TimelineItem key={index}>
            <TimelineOppositeContent color="text.secondary" sx={{ flex: 0.3 }}>
              <Typography variant="caption">
                {format(new Date(action.timestamp), "MMM dd, yyyy")}
              </Typography>
              <Typography variant="caption" display="block">
                {format(new Date(action.timestamp), "hh:mm a")}
              </Typography>
            </TimelineOppositeContent>

            <TimelineSeparator>
              <TimelineDot color={getActionColor(action.action)}>
                {getActionIcon(action.action)}
              </TimelineDot>
              {index < approvalChain.length - 1 && <TimelineConnector />}
            </TimelineSeparator>

            <TimelineContent>
              <Paper elevation={0} sx={{ p: 2, bgcolor: "grey.50" }}>
                <Stack spacing={1}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip
                      label={getActionLabel(action.action)}
                      color={getActionColor(action.action)}
                      size="small"
                    />
                    <Typography variant="body2" fontWeight={500}>
                      {action.from_role} → {action.to_role}
                    </Typography>
                  </Stack>

                  <Typography variant="body2" color="text.secondary">
                    By: <strong>{action.performed_by_name}</strong>
                  </Typography>

                  {action.comments && (
                    <Typography variant="body2" sx={{ fontStyle: "italic" }}>
                      "{action.comments}"
                    </Typography>
                  )}
                </Stack>
              </Paper>
            </TimelineContent>
          </TimelineItem>
        ))}
      </Timeline>
    </Paper>
  );
}
