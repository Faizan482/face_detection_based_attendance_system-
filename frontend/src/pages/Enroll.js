import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Paper,
  Typography,
  TextField,
  Button,
  Snackbar,
  Alert,
  Card,
  CardMedia,
  Grid,
  Box,
  Divider
} from '@mui/material';
import {
  PhotoCamera as PhotoCameraIcon,
  PersonAdd as PersonAddIcon
} from '@mui/icons-material';
import WebcamCapture from '../components/WebcamCapture';
import { enrollUser } from '../services/api';

const Enroll = () => {
  const [name, setName] = useState('');
  const [enrollmentId, setEnrollmentId] = useState('');
  const [image, setImage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Toast State
  const [toast, setToast] = useState({ open: false, type: 'success', text: '' });

  const navigate = useNavigate();
  const timeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleCapture = (imageSrc) => {
    setImage(imageSrc);
  };

  const handleCloseToast = () => {
    setToast({ ...toast, open: false });
  };

  const handleSubmit = async () => {
    if (!name || !enrollmentId || !image) {
      setToast({ open: true, type: 'error', text: 'Please fill all fields and capture an image.' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await enrollUser(name, enrollmentId, image);
      setSubmitting(false);

      if (res.success) {
        setToast({ open: true, type: 'success', text: 'User enrolled successfully! Redirecting to Mark Attendance...' });

        // Reset form
        setName('');
        setEnrollmentId('');
        setImage(null);

        // Redirect after 2 seconds
        timeoutRef.current = setTimeout(() => {
          navigate('/recognition');
        }, 2000);
      } else {
        // Check if it's a duplicate enrollment error
        if (res.message && res.message.toLowerCase().includes('already exists')) {
          setToast({ 
            open: true, 
            type: 'warning', 
            text: res.message + ' Redirecting to Mark Attendance...' 
          });
          // Redirect to recognition page (don't reset form)
          timeoutRef.current = setTimeout(() => {
            navigate('/recognition');
          }, 2000);
        } else {
          setToast({ open: true, type: 'error', text: 'Error: ' + res.message });
        }
      }
    } catch (error) {
      setSubmitting(false);
      // Check if error has response data from backend
      if (error.response && error.response.data) {
        const res = error.response.data;
        if (res.message && res.message.toLowerCase().includes('already exists')) {
          setToast({ 
            open: true, 
            type: 'warning', 
            text: res.message + ' Redirecting to Mark Attendance...' 
          });
          timeoutRef.current = setTimeout(() => {
            navigate('/recognition');
          }, 2000);
        } else {
          setToast({ open: true, type: 'error', text: 'Error: ' + (res.message || 'Unknown error') });
        }
      } else {
        setToast({ 
          open: true, 
          type: 'error', 
          text: 'Network error. Please try again.' 
        });
      }
      console.error('Enroll error:', error);
    }
  };

  return (
    <Box sx={{ width: '100%', p: 2 }}>
      {/* Toast (Snackbar) Implementation */}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={handleCloseToast}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseToast} severity={toast.type} variant="filled" sx={{ width: '100%' }}>
          {toast.text}
        </Alert>
      </Snackbar>

      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
        Student Enrollment
      </Typography>

      <Paper elevation={2} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Grid container>
          {/* Left Side: Form Fields */}
          <Grid item xs={12} md={5} sx={{ p: 4, borderRight: { md: '1px solid #eee' } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <PersonAddIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">Personal Details</Typography>
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Full Name"
                  size="small"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={submitting}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Enrollment ID"
                  size="small"
                  value={enrollmentId}
                  onChange={(e) => setEnrollmentId(e.target.value)}
                  disabled={submitting}
                />
              </Grid>

              <Grid item xs={12}>
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  startIcon={<PhotoCameraIcon />}
                  onClick={handleSubmit}
                  disabled={!image || !name || !enrollmentId || submitting}
                  sx={{ py: 1.2, textTransform: 'none', fontWeight: 'bold' }}
                >
                  {submitting ? 'Enrolling...' : 'Confirm & Enroll'}
                </Button>
              </Grid>
            </Grid>
          </Grid>

          {/* Right Side: Webcam & Preview */}
          <Grid item xs={12} md={7} sx={{ bgcolor: '#fafafa', p: 4 }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 500 }}>
              Face Verification
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <Box sx={{ width: '100%', maxWidth: 450, borderRadius: 2, overflow: 'hidden', boxShadow: 1, bgcolor: '#000' }}>
                <WebcamCapture onCapture={handleCapture} />
              </Box>

              {image && (
                <Box sx={{ textAlign: 'center', width: '100%' }}>
                  <Divider sx={{ my: 2 }}>Captured Preview</Divider>
                  <Card sx={{ maxWidth: 160, mx: 'auto', border: '3px solid #4caf50', borderRadius: 2 }}>
                    <CardMedia component="img" image={image} alt="Preview" />
                  </Card>
                </Box>
              )}
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default Enroll;