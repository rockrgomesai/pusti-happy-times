'use client';

import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Container,
  Card,
  CardContent,
  Alert,
} from '@mui/material';

export default function DebugLoginPage() {
  const [username, setUsername] = useState('SuperAdmin');
  const [password, setPassword] = useState('sadmin123');
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testDirectApiCall = async () => {
    setLoading(true);
    try {
      console.log('Testing direct API call...');
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password
        }),
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      setResult(`Direct API Call Result:\nStatus: ${response.status}\nData: ${JSON.stringify(data, null, 2)}`);
    } catch (error) {
      console.error('Direct API call error:', error);
      setResult(`Direct API Call Error: ${error}`);
    }
    setLoading(false);
  };

  const testAuthContextLogin = async () => {
    setLoading(true);
    try {
      console.log('Testing AuthContext login...');
      setResult('AuthContext login test - use the actual login page to test this');
    } catch (error) {
      console.error('AuthContext login error:', error);
      setResult(`AuthContext Login Error: ${error}`);
    }
    setLoading(false);
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Login Debug Page
      </Typography>
      
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Credentials
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              size="small"
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              size="small"
            />
          </Box>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button 
              variant="contained" 
              onClick={testDirectApiCall}
              disabled={loading}
            >
              Test Direct API Call
            </Button>
            <Button 
              variant="outlined" 
              onClick={testAuthContextLogin}
              disabled={loading}
            >
              Test AuthContext Login
            </Button>
          </Box>
        </CardContent>
      </Card>

      {result && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography component="pre" sx={{ fontSize: '12px', whiteSpace: 'pre-wrap' }}>
            {result}
          </Typography>
        </Alert>
      )}
    </Container>
  );
}
