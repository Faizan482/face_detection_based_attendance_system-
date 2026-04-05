import React, { useState, useRef, useCallback } from 'react';
import {
  Container, Typography, Paper, Alert, CircularProgress,
  Box, Button, Divider, LinearProgress, Fade
} from '@mui/material';
import Webcam from 'react-webcam';
import { 
  Face as FaceIcon, 
  RadioButtonChecked as RecordIcon,
  Security as SecurityIcon 
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

const Recognition = () => {
  const webcamRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0); // For visual feedback
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const captureFrames = useCallback(async () => {
    setResult(null);
    setError(null);
    setLoading(true);
    setProgress(0);

    const frames = [];
    const totalFrames = 30;
    const intervalMs = 100;

    for (let i = 0; i < totalFrames; i++) {
      const imageSrc = webcamRef.current?.getScreenshot();
      if (imageSrc) frames.push(imageSrc);
      
      // Update progress bar visually
      setProgress(Math.round(((i + 1) / totalFrames) * 100));
      
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }

    if (frames.length === 0) {
      setError('No frames captured. Please ensure camera is working.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/recognize_liveness', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frames })
      });

      const res = await response.json();

      if (res.success) {
        login(res.token, {
          name: res.name,
          enrollment_id: res.enrollment_id,
          role: res.role
        });
        setResult({ type: 'success', message: `Identity Verified: Welcome ${res.name}` });
        setTimeout(() => navigate('/'), 2000); // Redirect to dashboard
      } else {
        if (res.message && res.message.toLowerCase().includes('already marked')) {
          setResult({ type: 'warning', message: res.message });
        } else {
          setResult({ type: 'error', message: res.message || 'Face not recognized' });
        }
      }
    } catch (err) {
      setError('Network error. System could not reach the server.');
    } finally {
      setLoading(false);
    }
  }, [login, navigate]);

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      {/* Header with Icon */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: '#1a237e', mb: 1 }}>
          Smart Attendance
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Liveness detection enabled for secure verification
        </Typography>
      </Box>

      <Paper 
        elevation={10} 
        sx={{ 
          p: 4, 
          borderRadius: 5, 
          textAlign: 'center', 
          position: 'relative',
          overflow: 'hidden',
          border: '1px solid #e0e0e0'
        }}
      >
        {/* Verification Status Badge */}
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1 }}>
          <SecurityIcon color={loading ? "primary" : "action"} />
          <Typography variant="overline" sx={{ fontWeight: 'bold', letterSpacing: 2 }}>
            {loading ? "System Scanning..." : "Ready for Scan"}
          </Typography>
        </Box>

        {/* Webcam Container with "Scanner" Overlay */}
        <Box sx={{ 
          position: 'relative', 
          width: '100%', 
          maxWidth: 400, 
          mx: 'auto',
          borderRadius: 4,
          overflow: 'hidden',
          boxShadow: '0 0 20px rgba(0,0,0,0.1)',
          border: loading ? '3px solid #1976d2' : '3px solid #f5f5f5',
          transition: '0.3s'
        }}>
          <Webcam
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            width="100%"
            videoConstraints={{ facingMode: 'user' }}
            style={{ display: 'block' }}
          />
          
          {/* Animated Scanning Line during loading */}
          {loading && (
            <Box className="scanner-line" sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '2px',
              background: 'rgba(25, 118, 210, 0.8)',
              boxShadow: '0 0 15px #1976d2',
              animation: 'scan 2s infinite linear'
            }} />
          )}
        </Box>

        {/* Progress Bar for Frame Capture */}
        <Box sx={{ mt: 3, px: 2 }}>
          {loading && (
            <>
              <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: 5, mb: 1 }} />
              <Typography variant="caption" color="textSecondary">
                Processing biometric data... {progress}%
              </Typography>
            </>
          )}
        </Box>

        <Box sx={{ mt: 4 }}>
          <Button
            variant="contained"
            fullWidth
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <FaceIcon />}
            onClick={captureFrames}
            disabled={loading}
            size="large"
            sx={{ 
              py: 2, 
              borderRadius: 3, 
              fontWeight: 'bold', 
              fontSize: '1.1rem',
              textTransform: 'none',
              boxShadow: '0 4px 14px rgba(0,0,0,0.2)'
            }}
          >
            {loading ? 'Analyzing Face...' : 'Verify My Identity'}
          </Button>
        </Box>

        {/* Alerts for results */}
        <Box sx={{ mt: 3 }}>
          <Fade in={!!error}>
            <Box>{error && <Alert severity="error" variant="outlined" sx={{ borderRadius: 2 }}>{error}</Alert>}</Box>
          </Fade>
          
          <Fade in={!!result}>
            <Box>
              {result && (
                <Alert severity={result.type} variant="filled" sx={{ borderRadius: 2, fontWeight: 'medium' }}>
                  {result.message}
                </Alert>
              )}
            </Box>
          </Fade>
        </Box>

        <Divider sx={{ my: 3 }} />
        <Typography variant="caption" color="textSecondary">
          Tip: Blink naturally and stay within the frame for better accuracy.
        </Typography>
      </Paper>

      {/* Adding a small CSS animation for the scanner line */}
      <style>
        {`
          @keyframes scan {
            0% { top: 0%; }
            50% { top: 100%; }
            100% { top: 0%; }
          }
        `}
      </style>
    </Container>
  );
};

export default Recognition;