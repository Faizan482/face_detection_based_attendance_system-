import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography, Button, Box, Paper, GlobalStyles } from '@mui/material';
import { School as StudentIcon, AdminPanelSettings as AdminIcon } from '@mui/icons-material';

const LandingPage = () => {
  const navigate = useNavigate();

  // Background Image URL
  const bgImage = "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop";

  return (
    <>
      {/* Isse browser ki default margin/padding khatam ho jayegi */}
      <GlobalStyles styles={{ body: { margin: 0, padding: 0, overflow: 'hidden' } }} />

      <Box
        sx={{
          height: '100vh',
          width: '100vw',
          margin: 0,
          padding: 0,
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7)), url(${bgImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'fixed', // Fixed taake scroll na ho
          top: 0,
          left: 0,
        }}
      >
        <Paper 
          elevation={10} 
          sx={{ 
            p: { xs: 3, md: 6 }, 
            textAlign: 'center',
            borderRadius: 5,
            backgroundColor: 'rgba(255, 255, 255, 0.15)', // Transparent look
            backdropFilter: 'blur(15px)', // Glass effect
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#fff',
            maxWidth: '500px',
            mx: 2
          }}
        >
          <Typography variant="h3" gutterBottom sx={{ fontWeight: 'bold', letterSpacing: 1 }}>
            Face Attendance
          </Typography>
          <Typography variant="h6" sx={{ opacity: 0.8, mb: 4 }}>
            Secure & Smart Recognition System
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Button
              variant="contained"
              size="large"
              startIcon={<StudentIcon />}
              onClick={() => navigate('/enroll')}
              sx={{ 
                py: 2, 
                borderRadius: 3, 
                bgcolor: '#3f51b5',
                fontSize: '1.1rem',
                textTransform: 'none',
                '&:hover': { bgcolor: '#303f9f', transform: 'scale(1.02)' },
                transition: '0.3s'
              }}
            >
              Continue as Student
            </Button>
            
            <Button
              variant="outlined"
              size="large"
              startIcon={<AdminIcon />}
              onClick={() => navigate('/login')}
              sx={{ 
                py: 2, 
                borderRadius: 3, 
                color: '#fff',
                borderColor: '#fff',
                fontSize: '1.1rem',
                textTransform: 'none',
                borderWidth: 2,
                '&:hover': { borderWidth: 2, bgcolor: 'rgba(255,255,255,0.1)' },
                transition: '0.3s'
              }}
            >
              Admin Dashboard
            </Button>
          </Box>
        </Paper>
      </Box>
    </>
  );
};

export default LandingPage;