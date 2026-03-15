import React, { useState } from 'react';
import {
  Container,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  Box
} from '@mui/material';
import WebcamCapture from '../components/WebcamCapture';
import { recognizeFace } from '../services/api';
import useAuthStore from '../store/authStore';
import { useNavigate } from 'react-router-dom';

const Recognition = () => {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  const handleCapture = async (imageSrc) => {
    setLoading(true);
    const res = await recognizeFace(imageSrc);
    setLoading(false);

    if (res.success) {
      // Store token and user info in Zustand
      login(res.token, {
        name: res.name,
        enrollment_id: res.enrollment_id,
        role: res.role
      });
      
      setResult({
        type: 'success',
        message: `Welcome ${res.name} (${res.enrollment_id})`
      });

      // Optional: Redirect to dashboard after 2 seconds
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } else {
      // Check if it's a duplicate message
      if (res.message && res.message.toLowerCase().includes('already marked')) {
        setResult({ type: 'warning', message: res.message });
      } else {
        setResult({ type: 'error', message: res.message || 'Face not recognized' });
      }
    }
  };

  return (
    <Container maxWidth="md">
      <Typography variant="h4" gutterBottom>Mark Attendance</Typography>
      <Paper elevation={3} sx={{ p: 3 }}>
        <WebcamCapture onCapture={handleCapture} />
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <CircularProgress />
          </Box>
        )}
        {result && !loading && (
          <Alert severity={result.type} sx={{ mt: 3 }}>
            {result.message}
          </Alert>
        )}
      </Paper>
    </Container>
  );
};

export default Recognition;