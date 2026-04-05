import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Button,
  Chip,
  Divider,
  Paper
} from '@mui/material';
import { Event as EventIcon, CalendarToday as CalendarIcon, Delete as DeleteIcon } from '@mui/icons-material';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import axios from 'axios';
import useAuthStore from '../store/authStore';

const formatDate = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp + 'Z');
  return date.toLocaleString('en-PK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

const toDateStr = (date) => date.toISOString().split('T')[0];

const StudentAttendanceModal = ({ open, onClose, student, onUserDeleted }) => {
  const { token } = useAuthStore();
  const [attendance, setAttendance] = useState([]);
  const [enrollmentDate, setEnrollmentDate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Delete confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (open && student?.enrollment_id) {
      fetchAttendance();
    }
  }, [open, student]);

  const fetchAttendance = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(
        `http://localhost:5000/api/attendance/student/${student.enrollment_id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAttendance(response.data.attendance || []);
      setEnrollmentDate(response.data.enrollment_date);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load attendance');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!student.user_id) {
      setError('Missing user ID');
      return;
    }
    setDeleting(true);
    try {
      await axios.delete(`http://localhost:5000/api/users/${student.user_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDeleteConfirmOpen(false);
      onClose();               // close the modal
      if (onUserDeleted) onUserDeleted(); // refresh parent data
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete user');
    } finally {
      setDeleting(false);
    }
  };

  const presentDates = new Set(attendance.map(rec => rec.timestamp.split(' ')[0]));
  const totalPresent = attendance.length;
  let daysSinceEnrollment = 0;
  if (enrollmentDate) {
    const start = new Date(enrollmentDate);
    const today = new Date();
    daysSinceEnrollment = Math.floor((today - start) / (1000 * 60 * 60 * 24)) + 1;
  }
  const absentDays = Math.max(0, daysSinceEnrollment - totalPresent);

  const tileClassName = ({ date, view }) => {
    if (view === 'month') {
      const dateStr = toDateStr(date);
      if (presentDates.has(dateStr)) return 'present-day';
    }
    return null;
  };

  if (!student) return null;

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <EventIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">Attendance History</Typography>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {/* Student Info */}
          <Box mb={2}>
            <Typography variant="subtitle1" fontWeight="bold">{student.name}</Typography>
            <Typography variant="body2" color="textSecondary">Enrollment ID: {student.enrollment_id}</Typography>
            <Chip label={student.role || 'student'} size="small" color={student.role === 'admin' ? 'secondary' : 'default'} sx={{ mt: 1 }} />
          </Box>
          <Divider sx={{ my: 2 }} />

          {/* Stats Cards */}
          <Box display="flex" gap={2} flexWrap="wrap" mb={3}>
            <Paper elevation={2} sx={{ p: 2, flex: 1, minWidth: 120, textAlign: 'center' }}>
              <Typography variant="body2" color="textSecondary">Total Present</Typography>
              <Typography variant="h5" color="primary">{totalPresent}</Typography>
            </Paper>
            <Paper elevation={2} sx={{ p: 2, flex: 1, minWidth: 120, textAlign: 'center' }}>
              <Typography variant="body2" color="textSecondary">Days Enrolled</Typography>
              <Typography variant="h5" color="secondary">{daysSinceEnrollment}</Typography>
            </Paper>
            <Paper elevation={2} sx={{ p: 2, flex: 1, minWidth: 120, textAlign: 'center' }}>
              <Typography variant="body2" color="textSecondary">Estimated Absent</Typography>
              <Typography variant="h5" color="error">{absentDays}</Typography>
            </Paper>
          </Box>

          {/* Calendar */}
          <Typography variant="subtitle2" gutterBottom>
            <CalendarIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
            Present Days Highlighted
          </Typography>
          {loading ? (
            <Box display="flex" justifyContent="center" py={2}><CircularProgress size={24} /></Box>
          ) : error ? (
            <Alert severity="error">{error}</Alert>
          ) : (
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
              <Calendar tileClassName={tileClassName} maxDate={new Date()} calendarType="gregory" />
            </Box>
          )}

          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" gutterBottom>All Attendance Records</Typography>
          {attendance.length === 0 ? (
            <Typography color="textSecondary" align="center" py={2}>No attendance records found.</Typography>
          ) : (
            <Box sx={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #eee', borderRadius: 1, p: 1 }}>
              {attendance.map((rec) => (
                <Typography key={rec.id} variant="body2">{formatDate(rec.timestamp)}</Typography>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(true)} color="error" variant="contained" startIcon={<DeleteIcon />} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete Student'}
          </Button>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          Are you sure you want to delete <strong>{student.name}</strong> ({student.enrollment_id})?<br />
          This will permanently remove the student and all their attendance records. This action cannot be undone.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error">Delete</Button>
        </DialogActions>
      </Dialog>

      {/* Calendar styling */}
      <style jsx global>{`
        .react-calendar { border: none; width: 100%; max-width: 350px; font-family: inherit; }
        .present-day { background-color: #4caf50 !important; color: white !important; border-radius: 50%; }
        .present-day abbr { color: white; }
        .react-calendar__tile { text-align: center; }
      `}</style>
    </>
  );
};

export default StudentAttendanceModal;