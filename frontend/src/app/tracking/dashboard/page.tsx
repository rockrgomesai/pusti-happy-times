'use client';

/**
 * GPS Tracking Dashboard
 * Real-time monitoring of 1800 field officers
 * 
 * Features:
 * - Live map with field officer locations
 * - Session list with filters
 * - Fraud detection indicators
 * - Real-time updates via WebSocket
 * - Export functionality
 */

import 'leaflet/dist/leaflet.css';
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  TextField,
  MenuItem,
  Button,
  Chip,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
} from '@mui/material';
import { apiClient } from '@/lib/api';
import {
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  Download as DownloadIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  LocationOn as LocationOnIcon,
} from '@mui/icons-material';
import dynamic from 'next/dynamic';
import { format } from 'date-fns';

// Dynamically import Leaflet map (client-side only)
const TrackingMap = dynamic(() => import('./components/TrackingMap'), {
  ssr: false,
  loading: () => (
    <Box display="flex" justifyContent="center" alignItems="center" height={500}>
      <CircularProgress />
    </Box>
  ),
});

interface TrackingSession {
  _id: string;
  session_id: string;
  employee_id: {
    _id: string;
    name: string;
    employee_type: string;
  };
  status: 'active' | 'paused' | 'completed' | 'flagged';
  start_time: string;
  end_time?: string;
  total_distance_km: number;
  total_duration_seconds: number;
  fraud_score: number;
  fraud_flags: string[];
  current_location?: {
    latitude: number;
    longitude: number;
  };
}

interface FilterParams {
  status: string;
  dateFrom: string;
  dateTo: string;
  employeeId: string;
  fraudOnly: boolean;
}

export default function TrackingDashboardPage() {
  const [sessions, setSessions] = useState<TrackingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [routeData, setRouteData] = useState<any[]>([]);
  const [filters, setFilters] = useState<FilterParams>({
    status: 'all',
    dateFrom: format(new Date(), 'yyyy-MM-dd'),
    dateTo: format(new Date(), 'yyyy-MM-dd'),
    employeeId: '',
    fraudOnly: false,
  });
  const [stats, setStats] = useState({
    total_active: 0,
    total_completed_today: 0,
    flagged_sessions: 0,
    average_distance: 0,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0,
  });

  // Fetch sessions from API
  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filters.status !== 'all') params.status = filters.status;
      if (filters.dateFrom) params.date_from = filters.dateFrom;
      if (filters.dateTo) params.date_to = filters.dateTo;
      if (filters.employeeId) params.employee_id = filters.employeeId;
      if (filters.fraudOnly) params.fraud_only = 'true';
      params.page = pagination.page.toString();
      params.limit = pagination.limit.toString();

      const data: any = await apiClient.get('/tracking/dashboard/sessions', params);

      if (data.success) {
        setSessions(data.data.sessions);
        setStats(data.data.stats);
        setPagination(data.data.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination.limit]);

  // Only fetch on mount
  useEffect(() => {
    fetchSessions();
  }, []);

  // Auto-refresh disabled - manual refresh only
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     fetchSessions();
  //   }, 30000);

  //   return () => clearInterval(interval);
  // }, [filters]);

  const handleFilterChange = (field: keyof FilterParams, value: any) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
    fetchSessions();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      fetchSessions();
    }
  };

  const handleViewDetails = async (sessionId: string) => {
    try {
      setSelectedSessionId(sessionId);
      const data: any = await apiClient.get(`/tracking/dashboard/sessions/${sessionId}/route`);
      if (data.success) {
        setRouteData(data.data.points || []);
      }
    } catch (error) {
      console.error('Failed to fetch route:', error);
      setRouteData([]);
    }
  };

  const handleExport = async () => {
    // TODO: Implement CSV export
    console.log('Exporting sessions...');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'paused': return 'warning';
      case 'completed': return 'default';
      case 'flagged': return 'error';
      default: return 'default';
    }
  };

  const getFraudScoreColor = (score: number) => {
    if (score === 0) return 'success';
    if (score < 30) return 'warning';
    return 'error';
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">
          📍 GPS Tracking Dashboard
        </Typography>
        <Box display="flex" gap={1}>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchSessions} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            startIcon={<DownloadIcon />}
            variant="outlined"
            onClick={handleExport}
          >
            Export
          </Button>
        </Box>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Active Sessions
              </Typography>
              <Typography variant="h4" color="success.main">
                {stats.total_active}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Completed Today
              </Typography>
              <Typography variant="h4">
                {stats.total_completed_today}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Flagged Sessions
              </Typography>
              <Typography variant="h4" color="error.main">
                {stats.flagged_sessions}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Avg Distance (km)
              </Typography>
              <Typography variant="h4">
                {stats.average_distance.toFixed(1)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              select
              fullWidth
              label="Status"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              size="small"
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="flagged">Flagged</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              type="date"
              fullWidth
              label="From Date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              size="small"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              type="date"
              fullWidth
              label="To Date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              size="small"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Employee ID"
              value={filters.employeeId}
              onChange={(e) => handleFilterChange('employeeId', e.target.value)}
              onKeyPress={handleKeyPress}
              size="small"
              placeholder="Enter employee ID..."
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Button
              fullWidth
              variant={filters.fraudOnly ? 'contained' : 'outlined'}
              color="error"
              startIcon={<WarningIcon />}
              onClick={() => handleFilterChange('fraudOnly', !filters.fraudOnly)}
            >
              Fraud Only
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={1}>
            <Button
              fullWidth
              variant="contained"
              onClick={handleSearch}
              disabled={loading}
              sx={{ height: '40px' }}
            >
              Search
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Map */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Live Field Officer Locations
        </Typography>
        <TrackingMap 
          sessions={sessions.filter(s => s.status === 'active')} 
          routeData={routeData}
        />
      </Paper>

      {/* Sessions List */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Tracking Sessions
        </Typography>
        
        {loading ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : sessions.length === 0 ? (
          <Alert severity="info">No sessions found for the selected filters</Alert>
        ) : (
          <Box sx={{ maxHeight: 600, overflow: 'auto' }}>
            {sessions.map((session) => (
              <Card key={session._id} sx={{ mb: 2 }}>
                <CardContent>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={3}>
                      <Typography variant="subtitle2" color="textSecondary">
                        Employee
                      </Typography>
                      <Typography variant="body1" fontWeight="bold">
                        {session.employee_id.name}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {session.session_id}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={6} md={2}>
                      <Typography variant="subtitle2" color="textSecondary">
                        Status
                      </Typography>
                      <Chip
                        label={session.status.toUpperCase()}
                        color={getStatusColor(session.status) as any}
                        size="small"
                      />
                    </Grid>
                    
                    <Grid item xs={6} md={2}>
                      <Typography variant="subtitle2" color="textSecondary">
                        Start Time
                      </Typography>
                      <Typography variant="body2">
                        {format(new Date(session.start_time), 'HH:mm')}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={6} md={2}>
                      <Typography variant="subtitle2" color="textSecondary">
                        Distance
                      </Typography>
                      <Typography variant="body2">
                        {session.total_distance_km.toFixed(2)} km
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={6} md={2}>
                      <Typography variant="subtitle2" color="textSecondary">
                        Fraud Score
                      </Typography>
                      <Chip
                        label={session.fraud_score}
                        color={getFraudScoreColor(session.fraud_score) as any}
                        size="small"
                        icon={session.fraud_score > 50 ? <WarningIcon /> : <CheckCircleIcon />}
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={1}>
                      <Tooltip title="View Details">
                        <IconButton 
                          size="small" 
                          color={selectedSessionId === session.session_id ? "secondary" : "primary"}
                          onClick={() => handleViewDetails(session.session_id)}
                        >
                          <LocationOnIcon />
                        </IconButton>
                      </Tooltip>
                    </Grid>
                  </Grid>
                  
                  {session.fraud_flags.length > 0 && (
                    <Box mt={2}>
                      <Typography variant="caption" color="error">
                        Fraud Flags:
                      </Typography>
                      <Box display="flex" gap={0.5} mt={0.5} flexWrap="wrap">
                        {session.fraud_flags.map((flag, idx) => (
                          <Chip
                            key={idx}
                            label={flag.replace(/_/g, ' ')}
                            size="small"
                            color="error"
                            variant="outlined"
                          />
                        ))}
                      </Box>
                    </Box>
                  )}
                </CardContent>
              </Card>
            ))}
          </Box>
        )}

        {/* Pagination Controls */}
        {!loading && sessions.length > 0 && (
          <Box display="flex" justifyContent="space-between" alignItems="center" mt={3} pt={2} borderTop="1px solid #e0e0e0">
            <Typography variant="body2" color="textSecondary">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} sessions
            </Typography>
            <Box display="flex" gap={1} alignItems="center">
              <Button
                size="small"
                variant="outlined"
                disabled={pagination.page === 1}
                onClick={() => setPagination(prev => ({ ...prev, page: 1 }))}
              >
                First
              </Button>
              <Button
                size="small"
                variant="outlined"
                disabled={pagination.page === 1}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              >
                Previous
              </Button>
              <Typography variant="body2" sx={{ mx: 2 }}>
                Page {pagination.page} of {pagination.pages}
              </Typography>
              <Button
                size="small"
                variant="outlined"
                disabled={pagination.page === pagination.pages}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              >
                Next
              </Button>
              <Button
                size="small"
                variant="outlined"
                disabled={pagination.page === pagination.pages}
                onClick={() => setPagination(prev => ({ ...prev, page: pagination.pages }))}
              >
                Last
              </Button>
              <TextField
                select
                size="small"
                value={pagination.limit}
                onChange={(e) => setPagination(prev => ({ ...prev, limit: parseInt(e.target.value), page: 1 }))}
                sx={{ ml: 2, minWidth: 100 }}
              >
                <MenuItem value={10}>10 / page</MenuItem>
                <MenuItem value={25}>25 / page</MenuItem>
                <MenuItem value={50}>50 / page</MenuItem>
                <MenuItem value={100}>100 / page</MenuItem>
              </TextField>
            </Box>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
