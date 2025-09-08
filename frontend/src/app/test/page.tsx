'use client';

import React, { useState } from 'react';
import { Box, Button, Typography, Card, CardContent } from '@mui/material';
import { authAPI } from '@/lib/api';

export default function TestPage() {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testBackendConnection = async () => {
    setLoading(true);
    try {
      // Test health endpoint
      const response = await fetch('http://localhost:5000/api/health');
      const data = await response.json();
      setResult(`Health Check Success: ${JSON.stringify(data, null, 2)}`);
    } catch (error) {
      setResult(`Health Check Failed: ${error}`);
    }
    setLoading(false);
  };

  const testLogin = async () => {
    setLoading(true);
    try {
      const result = await authAPI.login({
        username: 'SuperAdmin',
        password: 'bcrypthashadmin123'
      });
      setResult(`Login Success: ${JSON.stringify(result, null, 2)}`);
    } catch (error) {
      setResult(`Login Failed: ${error}`);
    }
    setLoading(false);
  };

  return (
    <Box sx={{ p: 4, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        Frontend-Backend Connection Test
      </Typography>
      
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Button 
          variant="contained" 
          onClick={testBackendConnection}
          disabled={loading}
        >
          Test Health Check
        </Button>
        <Button 
          variant="contained" 
          onClick={testLogin}
          disabled={loading}
        >
          Test Login
        </Button>
      </Box>

      {result && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Result:
            </Typography>
            <Box 
              component="pre" 
              sx={{ 
                fontSize: '12px', 
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                backgroundColor: '#f5f5f5',
                p: 2,
                borderRadius: 1
              }}
            >
              {result}
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
