import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  Box,
  Button,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Search as SearchIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import useAuthStore from '../store/authStore';

// API function for admin (filtered attendance)
const getFilteredAttendance = async (params, token) => {
  const query = new URLSearchParams(params).toString();
  const response = await fetch(`http://localhost:5000/api/attendance/filter?${query}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Failed to fetch');
  return response.json();
};

// API function for student (my attendance)
const getMyAttendance = async (token) => {
  const response = await fetch('http://localhost:5000/api/attendance/me', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Failed to fetch');
  return response.json();
};

const Attendance = () => {
  const { token, user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');

  useEffect(() => {
    fetchData();
  }, [appliedSearch]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      let data;
      if (isAdmin) {
        const params = {};
        if (appliedSearch) params.search = appliedSearch;
        data = await getFilteredAttendance(params, token);
        setAttendance(data);
      } else {
        data = await getMyAttendance(token);
        // Student data mein name aur enrollment_id add karo (user object se)
        const formattedData = data.map(rec => ({
          id: rec.id,
          name: user.name,
          enrollment_id: user.enrollment_id,
          timestamp: rec.timestamp
        }));
        setAttendance(formattedData);
      }
    } catch (err) {
      setError('Failed to load attendance data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApplySearch = () => setAppliedSearch(search);
  const handleClearSearch = () => { setSearch(''); setAppliedSearch(''); };

  // Admin ke liye dummy fields (agar real data na ho to)
  const formattedAdminData = attendance.map((item) => ({
    ...item,
    estimation_date: '24 - 25 July',
    duration: '24 Hours',
    permission_details: 'Sick leave',
    status: 'Present'
  }));

  const getStatusChip = (status) => {
    const colors = {
      Present: 'success', Late: 'warning', Absent: 'error', Leave: 'info'
    };
    return <Chip label={status} color={colors[status] || 'default'} size="small" />;
  };

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" gutterBottom>
        {isAdmin ? 'All Attendance Records' : 'My Attendance Records'}
      </Typography>

      {/* Search Section – only for admin */}
      {isAdmin && (
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>Search Attendance</Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField
              label="Search by name or ID"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              fullWidth
              InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon /></InputAdornment>) }}
            />
            <Button variant="contained" onClick={handleApplySearch} startIcon={<SearchIcon />}>Search</Button>
            <Button variant="outlined" onClick={handleClearSearch}>Clear</Button>
          </Box>
        </Paper>
      )}

      {/* Attendance Table */}
      <Paper elevation={3} sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          {isAdmin ? 'Student Schedule & Attendance' : 'Your Attendance History'}
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  {isAdmin ? (
                    // Admin columns
                    <>
                      <TableCell><strong>ID</strong></TableCell>
                      <TableCell><strong>Student</strong></TableCell>
                      <TableCell><strong>Estimation date</strong></TableCell>
                      <TableCell><strong>Duration</strong></TableCell>
                      <TableCell><strong>Permission details</strong></TableCell>
                      <TableCell><strong>Status</strong></TableCell>
                      <TableCell><strong>Action</strong></TableCell>
                    </>
                  ) : (
                    // Student columns – ab name aur enrollment ID bhi dikhenge
                    <>
                      <TableCell><strong>Name</strong></TableCell>
                      <TableCell><strong>Enrollment ID</strong></TableCell>
                      <TableCell><strong>Date & Time</strong></TableCell>
                    </>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {attendance.length > 0 ? (
                  isAdmin ? (
                    formattedAdminData.map((rec) => (
                      <TableRow key={rec.id}>
                        <TableCell>{rec.enrollment_id || 'N/A'}</TableCell>
                        <TableCell>
                          <Typography variant="body1">{rec.name}</Typography>
                          <Typography variant="caption" color="textSecondary">Student</Typography>
                        </TableCell>
                        <TableCell>{rec.estimation_date}</TableCell>
                        <TableCell>{rec.duration}</TableCell>
                        <TableCell>{rec.permission_details}</TableCell>
                        <TableCell>{getStatusChip(rec.status)}</TableCell>
                        <TableCell>
                          <IconButton size="small" color="primary" title="Approve"><ApproveIcon /></IconButton>
                          <IconButton size="small" color="error" title="Reject"><RejectIcon /></IconButton>
                          <IconButton size="small" color="info" title="View"><ViewIcon /></IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    // Student rows – name, enrollment_id, timestamp
                    attendance.map((rec) => (
                      <TableRow key={rec.id}>
                        <TableCell>{rec.name}</TableCell>
                        <TableCell>{rec.enrollment_id}</TableCell>
                        <TableCell>{rec.timestamp}</TableCell>
                      </TableRow>
                    ))
                  )
                ) : (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 7 : 3} align="center">
                      No attendance records found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Container>
  );
};

export default Attendance;