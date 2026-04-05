import React, { useEffect, useState } from 'react';
import {
  Container, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, IconButton,
  TextField, InputAdornment, Box, Button, CircularProgress, Alert,
  Avatar, Tooltip, Stack, Dialog, DialogTitle, DialogContent,
  DialogActions, Divider, Tab, Tabs, Autocomplete
} from '@mui/material';
import {
  Search as SearchIcon,
  Visibility as ViewIcon,
  History as HistoryIcon,
  FilterList as FilterIcon,
  CheckCircle as SuccessIcon,
  Fingerprint as BiometricIcon,
  AccessTime as TimeIcon,
  Close as CloseIcon,
  Today as TodayIcon,
  AddCircle as AddCircleIcon,
  PictureAsPdf as PdfIcon
} from '@mui/icons-material';
import useAuthStore from '../store/authStore';
import { formatPKTime } from '../utils/dateUtils';
import axios from 'axios';

// API Functions
const getFilteredAttendance = async (params, token) => {
  const query = new URLSearchParams(params).toString();
  const response = await fetch(`http://localhost:5000/api/attendance/filter?${query}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Failed to fetch');
  return response.json();
};

const getMyAttendance = async (token) => {
  const response = await fetch('http://localhost:5000/api/attendance/me', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Failed to fetch');
  return response.json();
};

const getDailyAttendance = async (token) => {
  const response = await fetch('http://localhost:5000/api/attendance/daily', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Failed to fetch');
  return response.json();
};

const Attendance = () => {
  const { token, user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  // Tab state
  const [tabValue, setTabValue] = useState(0);

  // Logs state
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');

  // Daily state
  const [dailyStudents, setDailyStudents] = useState([]);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [dailyError, setDailyError] = useState(null);

  // Modal State
  const [openModal, setOpenModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Manual attendance state
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [students, setStudents] = useState([]);
  const [exportLoading, setExportLoading] = useState(false);

  // Fetch logs when tab is 0 and search changes
  useEffect(() => {
    if (tabValue === 0) {
      fetchLogs();
    }
  }, [tabValue, appliedSearch]);

  // Fetch daily when tab is 1
  useEffect(() => {
    if (tabValue === 1) {
      fetchDaily();
    }
  }, [tabValue]);

  // Fetch students for manual attendance (admin only)
  useEffect(() => {
    if (isAdmin) {
      fetchStudents();
    }
  }, [isAdmin]);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      let data;
      if (isAdmin) {
        const params = appliedSearch ? { search: appliedSearch } : {};
        data = await getFilteredAttendance(params, token);
        setAttendance(data);
      } else {
        data = await getMyAttendance(token);
        const formattedData = data.map(rec => ({
          ...rec,
          name: user.name,
          enrollment_id: user.enrollment_id,
        }));
        setAttendance(formattedData);
      }
    } catch (err) {
      setError('Failed to load attendance data.');
    } finally {
      setLoading(false);
    }
  };

  const fetchDaily = async () => {
    setDailyLoading(true);
    setDailyError(null);
    try {
      const data = await getDailyAttendance(token);
      setDailyStudents(data);
    } catch (err) {
      setDailyError('Failed to load daily attendance.');
    } finally {
      setDailyLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const studentList = response.data.filter(u => u.role === 'student');
      setStudents(studentList);
    } catch (err) {
      console.error('Failed to fetch students');
    }
  };

  const handleOpenDetails = (record) => {
    setSelectedRecord(record);
    setOpenModal(true);
  };

  const getStatusChip = (status) => {
    const isPresent = status === 'Present' || !status;
    return (
      <Chip
        label={isPresent ? "Present" : "Absent"}
        size="small"
        sx={{
          fontWeight: 'bold',
          borderRadius: '6px',
          backgroundColor: isPresent ? 'rgba(76, 175, 80, 0.12)' : 'rgba(244, 67, 54, 0.12)',
          color: isPresent ? '#2e7d32' : '#d32f2f',
          border: `1px solid ${isPresent ? '#2e7d32' : '#d32f2f'}`
        }}
      />
    );
  };

  const handleApplySearch = () => setAppliedSearch(search);
  const handleClearSearch = () => { setSearch(''); setAppliedSearch(''); };

  // Manual Attendance Handler
  const handleManualAttendance = async () => {
    if (!selectedStudent) {
      alert('Please select a student');
      return;
    }
    try {
      const response = await fetch('http://localhost:5000/api/attendance/manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ enrollment_id: selectedStudent.enrollment_id })
      });
      const data = await response.json();
      if (data.success) {
        alert(data.message);
        setManualModalOpen(false);
        fetchLogs(); // refresh attendance logs
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert('Failed to mark attendance');
    }
  };

  // PDF Export Handler
  const exportPDF = async () => {
    setExportLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/attendance/export/pdf', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'attendance_report.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('PDF export failed');
    } finally {
      setExportLoading(false);
    }
  };

  // Tab panel helper
  function TabPanel(props) {
    const { children, value, index, ...other } = props;
    return (
      <div role="tabpanel" hidden={value !== index} {...other}>
        {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
      </div>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header Section */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#1976d2', display: 'flex', alignItems: 'center', gap: 2 }}>
            <HistoryIcon fontSize="large" />
            {isAdmin ? 'Attendance Management' : 'My Attendance History'}
          </Typography>
        </Box>
        {!loading && tabValue === 0 && (
          <Paper variant="outlined" sx={{ px: 3, py: 1, borderRadius: 3, bgcolor: '#f8f9fa', border: '1px solid #1976d2' }}>
            <Typography variant="caption" sx={{ fontWeight: 'semi-bold', color: '#1976d2' }}>TOTAL LOGS</Typography>
            <Typography variant="h6" sx={{ fontWeight: 900, textAlign: 'center' }}>{attendance.length}</Typography>
          </Paper>
        )}
      </Box>

      {/* Tabs for Admin only */}
      {isAdmin && (
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
            <Tab label="Attendance Logs" icon={<HistoryIcon />} iconPosition="start" />
            <Tab label="Today's Status" icon={<TodayIcon />} iconPosition="start" />
          </Tabs>
        </Box>
      )}

      {/* ---------- TAB 0: Attendance Logs ---------- */}
      <TabPanel value={tabValue} index={0}>
        {/* Admin Search Card + New Buttons */}
        {isAdmin && (
          <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 3, border: '1px solid #e0e0e0', bgcolor: '#fff' }}>
            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap sx={{ gap: 1 }}>
              <TextField
                placeholder="Search by Name or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                fullWidth
                size="small"
                InputProps={{
                  startAdornment: (<InputAdornment position="start"><SearchIcon color="action" /></InputAdornment>),
                  sx: { borderRadius: 2 }
                }}
                sx={{ flex: 2, minWidth: 200 }}
              />
              <Button
                variant="contained"
                onClick={handleApplySearch}
                startIcon={<FilterIcon />}
                sx={{ px: 4, borderRadius: 2, textTransform: 'none', fontWeight: 'bold', bgcolor: '#1976d2' }}
              >
                Filter
              </Button>
              <Button variant="outlined" onClick={handleClearSearch} sx={{ px: 3, borderRadius: 2, textTransform: 'none' }}>
                Reset
              </Button>
              <Button
                variant="contained"
                startIcon={<AddCircleIcon />}
                onClick={() => setManualModalOpen(true)}
                sx={{ bgcolor: '#2e7d32', '&:hover': { bgcolor: '#1b5e20' }, textTransform: 'none' }}
              >
                Manual Attendance
              </Button>
              <Button
                variant="contained"
                startIcon={<PdfIcon />}
                onClick={exportPDF}
                disabled={exportLoading}
                sx={{ bgcolor: '#d32f2f', '&:hover': { bgcolor: '#b71c1c' }, textTransform: 'none' }}
              >
                {exportLoading ? 'Generating...' : 'Export PDF'}
              </Button>
            </Stack>
          </Paper>
        )}

        {/* Main Table Container */}
        <Paper elevation={4} sx={{ borderRadius: 4, overflow: 'hidden', border: '1px solid #eee' }}>
          <TableContainer>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ bgcolor: '#1976d2', color: '#fff', fontWeight: 'bold' }}>ENROLLMENT ID</TableCell>
                  <TableCell sx={{ bgcolor: '#1976d2', color: '#fff', fontWeight: 'bold' }}>STUDENT IDENTITY</TableCell>
                  <TableCell sx={{ bgcolor: '#1976d2', color: '#fff', fontWeight: 'bold' }}>LOG TIME (PKT)</TableCell>
                  <TableCell sx={{ bgcolor: '#1976d2', color: '#fff', fontWeight: 'bold' }}>STATUS</TableCell>
                  <TableCell sx={{ bgcolor: '#1976d2', color: '#fff', fontWeight: 'bold' }} align="center">ACTION</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} align="center" sx={{ py: 8 }}><CircularProgress /></TableCell></TableRow>
                ) : attendance.length > 0 ? (
                  attendance.map((rec) => (
                    <TableRow key={rec.id} hover>
                      <TableCell sx={{ fontWeight: 'bold', color: '#555' }}>{rec.enrollment_id || 'N/A'}</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={2} alignItems="center">
                          <Avatar sx={{ width: 32, height: 32, bgcolor: '#1976d2', fontSize: '0.9rem', fontWeight: 'bold' }}>
                            {rec.name?.charAt(0).toUpperCase()}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{rec.name}</Typography>
                            <Typography variant="caption" color="textSecondary">Verified via FaceID</Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ color: '#444' }}>{formatPKTime(rec.timestamp)}</TableCell>
                      <TableCell>{getStatusChip(rec.status)}</TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={1} justifyContent="center">
                          <Tooltip title="View Details">
                            <IconButton size="small" sx={{ color: '#1976d2' }} onClick={() => handleOpenDetails(rec)}>
                              <ViewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 10 }}>
                      <Typography color="textSecondary">No records found.</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </TabPanel>

      {/* ---------- TAB 1: Today's Status ---------- */}
      <TabPanel value={tabValue} index={1}>
        <Paper elevation={4} sx={{ borderRadius: 4, overflow: 'hidden' }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#1976d2' }}>
                  <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Enrollment ID</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Student Name</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Status</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Time (if present)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {dailyLoading ? (
                  <TableRow><TableCell colSpan={4} align="center" sx={{ py: 8 }}><CircularProgress /></TableCell></TableRow>
                ) : dailyError ? (
                  <TableRow><TableCell colSpan={4} align="center"><Alert severity="error">{dailyError}</Alert></TableCell></TableRow>
                ) : dailyStudents.length === 0 ? (
                  <TableRow><TableCell colSpan={4} align="center">No students enrolled.</TableCell></TableRow>
                ) : (
                  dailyStudents.map((student) => (
                    <TableRow key={student.id} hover>
                      <TableCell>{student.enrollment_id}</TableCell>
                      <TableCell>{student.name}</TableCell>
                      <TableCell>
                        <Chip
                          label={student.present ? 'Present' : 'Absent'}
                          size="small"
                          sx={{
                            bgcolor: student.present ? 'rgba(76, 175, 80, 0.12)' : 'rgba(244, 67, 54, 0.12)',
                            color: student.present ? '#2e7d32' : '#d32f2f',
                            fontWeight: 'bold',
                          }}
                        />
                      </TableCell>
                      <TableCell>{student.present ? formatPKTime(student.timestamp) : '—'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </TabPanel>

      {/* Details Modal (unchanged) */}
      <Dialog
        open={openModal}
        onClose={() => setOpenModal(false)}
        PaperProps={{ sx: { borderRadius: 4, width: '100%', maxWidth: 400 } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#1976d2', color: '#fff' }}>
          Attendance Details
          <IconButton onClick={() => setOpenModal(false)} sx={{ color: '#fff' }}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center', pt: 4 }}>
          <SuccessIcon sx={{ fontSize: 60, color: '#4caf50', mb: 1 }} />
          <Typography variant="h6" sx={{ fontWeight: 800 }}>Identity Verified</Typography>
          <Box sx={{ mt: 3, p: 2, bgcolor: '#f8f9fa', borderRadius: 3, textAlign: 'left' }}>
            <Stack spacing={2}>
              <Box>
                <Typography variant="caption" color="textSecondary">STUDENT NAME</Typography>
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{selectedRecord?.name}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="textSecondary">ENROLLMENT ID</Typography>
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{selectedRecord?.enrollment_id}</Typography>
              </Box>
              <Divider />
              <Stack direction="row" justifyContent="space-between">
                <Box>
                  <Typography variant="caption" color="textSecondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <TimeIcon fontSize="inherit" /> LOG TIME
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{selectedRecord ? formatPKTime(selectedRecord.timestamp) : ''}</Typography>
                </Box>
                <Box textAlign="right">
                  <Typography variant="caption" color="textSecondary" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                    <BiometricIcon fontSize="inherit" /> METHOD
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Facial Scan</Typography>
                </Box>
              </Stack>
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, justifyContent: 'center' }}>
          <Button fullWidth onClick={() => setOpenModal(false)} variant="outlined" sx={{ borderRadius: 2, textTransform: 'none' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Manual Attendance Modal */}
      <Dialog open={manualModalOpen} onClose={() => setManualModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Manual Attendance Override</DialogTitle>
        <DialogContent>
          <Autocomplete
            options={students}
            getOptionLabel={(option) => `${option.name} (${option.enrollment_id})`}
            onChange={(event, newValue) => setSelectedStudent(newValue)}
            renderInput={(params) => <TextField {...params} label="Select Student" margin="normal" fullWidth />}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setManualModalOpen(false)}>Cancel</Button>
          <Button onClick={handleManualAttendance} variant="contained" color="primary">Mark Present</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Attendance;