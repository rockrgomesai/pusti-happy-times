'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent,
  Chip,
  Stack,
  Avatar,
  Alert,
  CircularProgress,
  Button,
  Divider,
  Grid
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Send as SubmitIcon,
  Forward as ForwardIcon,
  Edit as ModifyIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import { useRouter, useParams } from 'next/navigation';
import { format } from 'date-fns';
import api from '@/lib/api';

interface HistoryEntry {
  action: string;
  performed_by: {
    username: string;
    full_name: string;
    role: string;
  };
  performed_by_role: string;
  from_status: string;
  to_status: string;
  comments: string;
  timestamp: string;
  changes: Array<{
    field: string;
    old_value: any;
    new_value: any;
  }>;
}

interface DOHistory {
  order_number: string;
  current_status: string;
  distributor: {
    name: string;
    erp_id: string;
  };
  created_by: {
    username: string;
    full_name: string;
  };
  created_at: string;
  timeline: HistoryEntry[];
  metadata: {
    submitted_at?: string;
    approved_at?: string;
    approved_by?: {
      username: string;
      full_name: string;
    };
    rejected_at?: string;
    rejected_by?: {
      username: string;
      full_name: string;
    };
    rejection_reason?: string;
  };
}

export default function DOHistoryPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<DOHistory | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      loadHistory();
    }
  }, [id]);

  const loadHistory = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await api.get(`/demandorders/do-list/${id}/history`);

      if (response.data.success) {
        setHistory(response.data.data);
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to load DO history');
      console.error('Failed to load DO history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    const icons: { [key: string]: JSX.Element } = {
      submit: <SubmitIcon />,
      forward: <ForwardIcon />,
      approve: <ApproveIcon />,
      reject: <RejectIcon />,
      modify: <ModifyIcon />,
      schedule: <ScheduleIcon />,
      partial_scheduling: <ScheduleIcon />,
      scheduling_completed: <ApproveIcon />
    };
    return icons[action] || <SubmitIcon />;
  };

  const getActionColor = (action: string) => {
    const colors: { [key: string]: 'primary' | 'success' | 'error' | 'warning' | 'info' | 'grey' } = {
      submit: 'info',
      forward: 'primary',
      approve: 'success',
      reject: 'error',
      modify: 'warning',
      schedule: 'primary',
      partial_scheduling: 'warning',
      scheduling_completed: 'success'
    };
    return colors[action] || 'grey';
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: 'default' | 'primary' | 'success' | 'error' | 'warning' | 'info' } = {
      draft: 'default',
      submitted: 'info',
      approved: 'success',
      rejected: 'error',
      cancelled: 'default',
      forwarded_to_distribution: 'primary',
      scheduling_in_progress: 'warning',
      scheduling_completed: 'success'
    };
    return colors[status] || 'default';
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !history) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error || 'DO not found'}</Alert>
        <Button startIcon={<BackIcon />} onClick={() => router.back()} sx={{ mt: 2 }}>
          Go Back
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Button startIcon={<BackIcon />} onClick={() => router.back()} sx={{ mb: 2 }}>
        Back to List
      </Button>

      <Typography variant="h4" gutterBottom>
        DO History
      </Typography>

      {/* DO Summary Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="overline" color="text.secondary">
                DO Number
              </Typography>
              <Typography variant="h6" gutterBottom>
                {history.order_number}
              </Typography>

              <Typography variant="overline" color="text.secondary">
                Distributor
              </Typography>
              <Typography variant="body1" gutterBottom>
                {history.distributor.name} ({history.distributor.erp_id})
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="overline" color="text.secondary">
                Current Status
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Chip
                  label={history.current_status.replace(/_/g, ' ').toUpperCase()}
                  color={getStatusColor(history.current_status)}
                />
              </Box>

              <Typography variant="overline" color="text.secondary">
                Created By
              </Typography>
              <Typography variant="body1">
                {history.created_by.full_name} ({history.created_by.username})
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {format(new Date(history.created_at), 'dd/MM/yyyy HH:mm')}
              </Typography>
            </Grid>
          </Grid>

          {/* Metadata */}
          {(history.metadata.approved_at || history.metadata.rejected_at) && (
            <>
              <Divider sx={{ my: 2 }} />
              <Grid container spacing={2}>
                {history.metadata.approved_at && (
                  <Grid item xs={12} md={6}>
                    <Typography variant="overline" color="text.secondary">
                      Approved
                    </Typography>
                    <Typography variant="body2">
                      {history.metadata.approved_by?.full_name || '-'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {format(new Date(history.metadata.approved_at), 'dd/MM/yyyy HH:mm')}
                    </Typography>
                  </Grid>
                )}
                {history.metadata.rejected_at && (
                  <Grid item xs={12} md={6}>
                    <Typography variant="overline" color="text.secondary">
                      Rejected
                    </Typography>
                    <Typography variant="body2">
                      {history.metadata.rejected_by?.full_name || '-'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {format(new Date(history.metadata.rejected_at), 'dd/MM/yyyy HH:mm')}
                    </Typography>
                    {history.metadata.rejection_reason && (
                      <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                        Reason: {history.metadata.rejection_reason}
                      </Typography>
                    )}
                  </Grid>
                )}
              </Grid>
            </>
          )}
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Approval Timeline
          </Typography>

          <Timeline position="right">
            {history.timeline.map((entry, index) => (
              <TimelineItem key={index}>
                <TimelineOppositeContent color="text.secondary" sx={{ flex: 0.3 }}>
                  <Typography variant="caption">
                    {format(new Date(entry.timestamp), 'dd/MM/yyyy')}
                  </Typography>
                  <br />
                  <Typography variant="caption">
                    {format(new Date(entry.timestamp), 'HH:mm')}
                  </Typography>
                </TimelineOppositeContent>

                <TimelineSeparator>
                  <TimelineDot color={getActionColor(entry.action)}>
                    {getActionIcon(entry.action)}
                  </TimelineDot>
                  {index < history.timeline.length - 1 && <TimelineConnector />}
                </TimelineSeparator>

                <TimelineContent>
                  <Card variant="outlined" sx={{ p: 2 }}>
                    <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1 }}>
                      <Avatar sx={{ width: 32, height: 32, bgcolor: getActionColor(entry.action) + '.main' }}>
                        {entry.performed_by.full_name.charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle2">
                          {entry.action.replace(/_/g, ' ').toUpperCase()}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {entry.performed_by.full_name} ({entry.performed_by_role})
                        </Typography>
                      </Box>
                    </Stack>

                    {entry.from_status && entry.to_status && (
                      <Box sx={{ mb: 1 }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Chip
                            label={entry.from_status.replace(/_/g, ' ')}
                            size="small"
                            variant="outlined"
                          />
                          <Typography variant="caption">→</Typography>
                          <Chip
                            label={entry.to_status.replace(/_/g, ' ')}
                            size="small"
                            color={getStatusColor(entry.to_status)}
                          />
                        </Stack>
                      </Box>
                    )}

                    {entry.comments && (
                      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        "{entry.comments}"
                      </Typography>
                    )}

                    {entry.changes && entry.changes.length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          Changes:
                        </Typography>
                        {entry.changes.map((change, i) => (
                          <Typography key={i} variant="caption" display="block">
                            • {change.field}: {JSON.stringify(change.old_value)} → {JSON.stringify(change.new_value)}
                          </Typography>
                        ))}
                      </Box>
                    )}
                  </Card>
                </TimelineContent>
              </TimelineItem>
            ))}
          </Timeline>
        </CardContent>
      </Card>
    </Box>
  );
}
