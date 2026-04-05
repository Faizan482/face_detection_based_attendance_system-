import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Typography, TextField, Button, Box, Alert, Paper, 
  GlobalStyles, InputAdornment, IconButton, Link
} from '@mui/material';
import { 
  Visibility, VisibilityOff, 
  Lock as LockIcon, 
  Person as PersonIcon,
  Fingerprint as EnrollIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import axios from 'axios';

const AdminSignup = () => {
  const [form, setForm] = useState({
    name: '',
    enrollment_id: '',
    password: '',
    secret_code: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const navigate = useNavigate();

  // Background Image - Same as Login for consistency
  const bgImage = "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070";

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await axios.post('http://localhost:5000/api/admin/signup', form);
      if (response.data.success) {
        setMessage({ type: 'success', text: 'Admin created! Redirecting to login...' });
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setMessage({ type: 'error', text: response.data.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Signup failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
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
            p: { xs: 3, md: 5 }, 
            textAlign: 'center',
            borderRadius: 6,
            backgroundColor: 'rgba(255, 255, 255, 0.1)', 
            backdropFilter: 'blur(15px)', 
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#fff',
            maxWidth: '500px',
            width: '95%',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.5)',
            maxHeight: '90vh',
            overflowY: 'auto' // Mobile users ke liye scroll support
          }}
        >
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', mb: 1, letterSpacing: 1 }}>
            Admin Signup
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.7, mb: 3 }}>
            Create an administrator account to manage the system
          </Typography>

          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            
            <TextField
              label="Full Name"
              name="name"
              fullWidth
              variant="outlined"
              value={form.name}
              onChange={handleChange}
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonIcon sx={{ color: 'rgba(255,255,255,0.7)' }} />
                  </InputAdornment>
                ),
              }}
              sx={inputStyles}
            />

            <TextField
              label="Enrollment ID"
              name="enrollment_id"
              fullWidth
              variant="outlined"
              value={form.enrollment_id}
              onChange={handleChange}
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
              name="password"
              type={showPassword ? 'text' : 'password'}
              fullWidth
              variant="outlined"
              value={form.password}
              onChange={handleChange}
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

            <TextField
              label="Admin Secret Code"
              name="secret_code"
              type="password"
              fullWidth
              variant="outlined"
              value={form.secret_code}
              onChange={handleChange}
              required
              helperText="Enter the secret code for admin registration"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SecurityIcon sx={{ color: 'rgba(255,255,255,0.7)' }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                ...inputStyles,
                '& .MuiFormHelperText-root': { color: 'rgba(255,255,255,0.5)' }
              }}
            />

            {message.text && (
              <Alert 
                severity={message.type} 
                sx={{ 
                  mt: 1, 
                  borderRadius: 2, 
                  bgcolor: message.type === 'error' ? 'rgba(211, 47, 47, 0.2)' : 'rgba(76, 175, 80, 0.2)',
                  color: message.type === 'error' ? '#ffcdd2' : '#c8e6c9'
                }}
              >
                {message.text}
              </Alert>
            )}

            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={loading}
              sx={{ 
                mt: 1, 
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
              {loading ? 'Creating Account...' : 'Sign Up as Admin'}
            </Button>
          </Box>

          <Box sx={{ mt: 3 }}>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              Already have an account?{' '}
              <Link 
                component={RouterLink} 
                to="/login" 
                sx={{ color: '#90caf9', fontWeight: 'bold', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
              >
                Login here
              </Link>
            </Typography>
          </Box>
        </Paper>
      </Box>
    </>
  );
};

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

export default AdminSignup;