import React, { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Typography, TextField, Button, Box, Alert, Paper, 
  GlobalStyles, InputAdornment, IconButton, Link
} from '@mui/material';
import { 
  Visibility, VisibilityOff, 
  Lock as LockIcon, 
  Fingerprint as EnrollIcon 
} from '@mui/icons-material';
import axios from 'axios';
import useAuthStore from '../store/authStore';

const Login = () => {
  const [enrollmentId, setEnrollmentId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  // Background Image - Digital/Security Theme
  const bgImage = "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post('http://localhost:5000/api/login', {
        enrollment_id: enrollmentId,
        password
      });

      if (response.data.success) {
        login(response.data.token, response.data.user);
        navigate('/');
      } else {
        setError(response.data.message || 'Login failed');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Page resets to remove any scrollbars or white spaces */}
      <GlobalStyles styles={{ body: { margin: 0, padding: 0, overflow: 'hidden' } }} />

      <Box
        sx={{
          height: '100vh',
          width: '100vw',
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7)), url(${bgImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'fixed',
          top: 0,
          left: 0,
        }}
      >
        <Paper 
          elevation={10} 
          sx={{ 
            p: { xs: 4, md: 6 }, 
            textAlign: 'center',
            borderRadius: 6,
            backgroundColor: 'rgba(255, 255, 255, 0.1)', 
            backdropFilter: 'blur(15px)', 
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#fff',
            maxWidth: '450px',
            width: '90%',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.5)'
          }}
        >
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', mb: 1, letterSpacing: 1 }}>
            Admin Login
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.7, mb: 4 }}>
            Enter your credentials to access the dashboard
          </Typography>

          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            
            <TextField
              label="Enrollment ID"
              fullWidth
              variant="outlined"
              value={enrollmentId}
              onChange={(e) => setEnrollmentId(e.target.value)}
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EnrollIcon sx={{ color: 'rgba(255,255,255,0.7)' }} />
                  </InputAdornment>
                ),
              }}
              sx={inputStyles}
            />

            <TextField
              label="Password"
              type={showPassword ? 'text' : 'password'}
              fullWidth
              variant="outlined"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon sx={{ color: 'rgba(255,255,255,0.7)' }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      sx={{ color: 'rgba(255,255,255,0.7)' }}
                    >
                      {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={inputStyles}
            />

            {error && (
              <Alert severity="error" sx={{ mt: 1, borderRadius: 2, bgcolor: 'rgba(211, 47, 47, 0.2)', color: '#ffcdd2' }}>
                {error}
              </Alert>
            )}

            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={loading}
              sx={{ 
                mt: 2, 
                py: 1.8, 
                borderRadius: 3, 
                fontWeight: 'bold',
                fontSize: '1rem',
                textTransform: 'none',
                bgcolor: '#1976d2',
                '&:hover': { bgcolor: '#1565c0' },
                transition: '0.3s'
              }}
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </Button>
          </Box>

          <Box sx={{ mt: 4 }}>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              Don't have an admin account?{' '}
              <Link 
                component={RouterLink} 
                to="/admin/signup" 
                sx={{ color: '#90caf9', fontWeight: 'bold', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
              >
                Sign up here
              </Link>
            </Typography>
          </Box>
        </Paper>
      </Box>
    </>
  );
};

// Reusable custom styles for the transparent inputs
const inputStyles = {
  '& .MuiOutlinedInput-root': {
    color: '#fff',
    borderRadius: 3,
    '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
    '&.Mui-focused fieldset': { borderColor: '#fff' },
  },
  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.6)' },
  '& .MuiInputLabel-root.Mui-focused': { color: '#fff' },
};

export default Login;