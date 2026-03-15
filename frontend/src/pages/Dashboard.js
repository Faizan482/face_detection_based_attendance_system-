import React, { useEffect, useState } from 'react';
import { 
  Grid, 
  Paper, 
  Typography, 
  Card, 
  CardContent,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  People as PeopleIcon,
  Face as FaceIcon,
  HowToReg as EnrollIcon,
  Event as EventIcon
} from '@mui/icons-material';
import { getAttendance } from '../services/api';

const Dashboard = () => {
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAttendance();
  }, []);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const data = await getAttendance();
      setAttendance(data);
      setError(null);
    } catch (err) {
      setError('Failed to load attendance data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats from real data
  const totalRecords = attendance.length;
  
  // Get unique stu count
  const uniqueStudents = new Set(attendance.map(rec => rec.enrollment_id)).size;
  
  // Get today's date
  const today = new Date().toISOString().split('T')[0];
  
  // Count present today (records with today's date)
  const presentToday = attendance.filter(rec => 
    rec.timestamp?.startsWith(today)
  ).length;

  // Stats cards data from real API
  const stats = [
    { 
      title: 'Total Attendance Records', 
      value: totalRecords.toString(), 
      icon: <EventIcon />, 
      color: '#1976d2' 
    },
    { 
      title: 'Unique Students', 
      value: uniqueStudents.toString(), 
      icon: <PeopleIcon />, 
      color: '#2e7d32' 
    },
    { 
      title: 'Present Today', 
      value: presentToday.toString(), 
      icon: <FaceIcon />, 
      color: '#ed6c02' 
    },
    { 
      title: 'Total Enrollments', 
      value: uniqueStudents.toString(), 
      icon: <EnrollIcon />, 
      color: '#9c27b0' 
    },
  ];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      
      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 5, width: '100%' }}>
        {stats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box sx={{ 
                    bgcolor: stat.color, 
                    borderRadius: '50%', 
                    p: 1, 
                    mr: 2,
                    color: 'white',
                    display: 'flex'
                  }}>
                    {stat.icon}
                  </Box>
                  <Typography variant="h6" component="div">
                    {stat.title}
                  </Typography>
                </Box>
                <Typography variant="h3" component="div" sx={{ fontWeight: 'bold', textAlign: 'center' }}>
                  {stat.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Recent Attendance Records Table */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom sx={{mb:'8px'}}>
          Recent Attendance Records
        </Typography>
        
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell><strong>ID</strong></TableCell>
                <TableCell><strong>Name</strong></TableCell>
                <TableCell><strong>Enrollment ID</strong></TableCell>
                <TableCell><strong>Timestamp</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {attendance.length > 0 ? (
                attendance.slice(0, 10).map((rec) => ( // Show only last 10 records
                  <TableRow key={rec.id}>
                    <TableCell>{rec.id}</TableCell>
                    <TableCell>{rec.name}</TableCell>
                    <TableCell>{rec.enrollment_id}</TableCell>
                    <TableCell>{rec.timestamp}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    No attendance records found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {attendance.length > 10 && (
          <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 2 }}>
            Showing last 10 records. Total records: {attendance.length}
          </Typography>
        )}
      </Paper>
    </Box>
  );
};

export default Dashboard;