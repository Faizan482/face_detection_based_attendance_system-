import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Typography, Button, Box, Paper } from '@mui/material';
import { School as StudentIcon, AdminPanelSettings as AdminIcon } from '@mui/icons-material';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <Container maxWidth="md" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ p: 5, textAlign: 'center' }}>
        <Typography variant="h3" gutterBottom>
          Face Attendance System
        </Typography>
        <Typography variant="h6" color="textSecondary" paragraph>
          Please select your role to continue
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 4, mt: 4 }}>
          <Button
            variant="contained"
            size="large"
            startIcon={<StudentIcon />}
            onClick={() => navigate('/enroll')}
            sx={{ minWidth: 200, py: 2 }}
          >
            Student
          </Button>
          <Button
            variant="outlined"
            size="large"
            startIcon={<AdminIcon />}
            onClick={() => navigate('/login')}
            sx={{ minWidth: 200, py: 2 }}
          >
            Admin
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default LandingPage;