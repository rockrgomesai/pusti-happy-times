'use client';

import React, { useState } from 'react';
import { Box, Button, Typography, Alert } from '@mui/material';

export default function SimpleLoginTest() {
  const [result, setResult] = useState<string>('');
  const [status, setStatus] = useState<'success' | 'error' | 'info'>('info');

  const testRawFetch = async () => {
    try {
      setResult('Testing raw fetch...');
      setStatus('info');
      
      console.log('🔍 Current window location:', window.location.href);
      console.log('🔍 Current origin:', window.location.origin);
      
      // Use exact same code that works in the HTML test
      const requestData = {
        username: 'SuperAdmin',
        password: 'sadmin123'
      };
      
      console.log('🔍 Request data:', requestData);
      console.log('🔍 JSON stringified:', JSON.stringify(requestData));
      
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': window.location.origin
        },
        credentials: 'include',
        body: JSON.stringify(requestData),
      });

      console.log('🔍 Response status:', response.status);
      console.log('🔍 Response headers:', Object.fromEntries(response.headers.entries()));
      
      const data = await response.json();
      console.log('🔍 Response data:', data);
      
      if (response.ok) {
        setResult(`✅ RAW FETCH SUCCESS: ${data.message}`);
        setStatus('success');
        
        // Store tokens manually
        if (data.data?.tokens) {
          const { accessToken, refreshToken } = data.data.tokens;
          document.cookie = `accessToken=${accessToken}; path=/; max-age=86400`;
          document.cookie = `refreshToken=${refreshToken}; path=/; max-age=604800`;
          console.log('✅ Tokens stored in cookies');
        }
      } else {
        setResult(`❌ RAW FETCH FAILED: ${data.message}`);
        setStatus('error');
      }
    } catch (error) {
      setResult(`❌ RAW FETCH ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setStatus('error');
      console.error('❌ Raw fetch error:', error);
    }
  };

  const testAxiosImport = async () => {
    try {
      setResult('Testing axios import...');
      setStatus('info');
      
      // Dynamic import to avoid SSR issues
      const axios = (await import('axios')).default;
      
      const response = await axios.post('http://localhost:5000/api/auth/login', {
        username: 'SuperAdmin',
        password: 'sadmin123'
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
        withCredentials: true,
      });

      setResult(`✅ AXIOS SUCCESS: ${response.data.message}`);
      setStatus('success');
      console.log('Axios success:', response.data);
    } catch (error: any) {
      if (error.response) {
        setResult(`❌ AXIOS FAILED: ${error.response.data?.message || 'Unknown error'}`);
        console.log('Axios error response:', error.response.data);
      } else {
        setResult(`❌ AXIOS ERROR: ${error.message}`);
      }
      setStatus('error');
      console.error('Axios error:', error);
    }
  };

  const testOurAPI = async () => {
    try {
      setResult('Testing our API wrapper...');
      setStatus('info');
      
      // Import our API
      const { authAPI } = await import('@/lib/api');
      
      const response = await authAPI.login({
        username: 'SuperAdmin',
        password: 'sadmin123'
      });

      setResult(`✅ OUR API SUCCESS: ${response.message}`);
      setStatus('success');
      console.log('Our API success:', response);
    } catch (error: any) {
      if (error.response) {
        setResult(`❌ OUR API FAILED: ${error.response.data?.message || 'Unknown error'}`);
        console.log('Our API error response:', error.response.data);
      } else {
        setResult(`❌ OUR API ERROR: ${error.message}`);
      }
      setStatus('error');
      console.error('Our API error:', error);
    }
  };

  const redirectToDashboard = () => {
    window.location.href = '/dashboard';
  };

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" gutterBottom>
        React Login Test
      </Typography>
      <Typography variant="body1" gutterBottom>
        Testing different methods within the React app.
      </Typography>
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 3, maxWidth: 400 }}>
        <Button variant="contained" onClick={testRawFetch}>
          1. Test Raw Fetch (Same as HTML)
        </Button>
        <Button variant="contained" onClick={testAxiosImport}>
          2. Test Axios Import
        </Button>
        <Button variant="contained" onClick={testOurAPI}>
          3. Test Our API Wrapper
        </Button>
        <Button variant="outlined" onClick={redirectToDashboard}>
          Go to Dashboard (Test Auth)
        </Button>
      </Box>

      {result && (
        <Alert severity={status} sx={{ mt: 3 }}>
          {result}
        </Alert>
      )}
    </Box>
  );
}
