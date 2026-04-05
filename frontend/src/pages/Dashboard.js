import React, { useEffect, useState } from "react";
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
  TablePagination,
  CircularProgress,
  Alert,
  Avatar,
  Chip,
  useTheme,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  People as PeopleIcon,
  Face as FaceIcon,
  HowToReg as EnrollIcon,
  Event as EventIcon,
  TrendingUp as TrendingUpIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import { getAttendance } from "../services/api";
import useAuthStore from "../store/authStore";
import axios from "axios";
import StudentAttendanceModal from "../components/StudentAttendanceModal";
import { formatPKTime } from "../utils/dateUtils";

// Colors for charts
const PIE_COLORS = ["#4caf50", "#f44336"];

const Dashboard = () => {
  const theme = useTheme();
  const [attendance, setAttendance] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [enrollModalOpen, setEnrollModalOpen] = useState(false); // modal for recent enrollments
  // Delete confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState(null);
  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [refreshKey, setRefreshKey] = useState(0);
  const { token } = useAuthStore();

  useEffect(() => {
    fetchData();
  }, [refreshKey]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const attData = await getAttendance();
      setAttendance(attData);

      const userRes = await axios.get("http://localhost:5000/api/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(userRes.data);
    } catch (err) {
      setError("Failed to load data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleNameClick = (student) => {
    setSelectedStudent(student);
    setModalOpen(true);
  };

  const refreshAttendance = () => setRefreshKey((prev) => prev + 1);

  // Delete handlers
  const handleDeleteClick = (student) => {
    setStudentToDelete(student);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!studentToDelete) return;
    try {
      await axios.delete(`http://localhost:5000/api/users/${studentToDelete.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDeleteConfirmOpen(false);
      setEnrollModalOpen(false); // close enrollment modal
      refreshAttendance(); // refresh dashboard data
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Failed to delete student. Check console.");
    }
  };

  // Stats – only count students for total enrollments
  const totalRecords = attendance.length;
  const uniqueStudents = new Set(attendance.map((r) => r.enrollment_id)).size;
  const today = new Date().toISOString().split("T")[0];
  const presentToday = attendance.filter((r) =>
    r.timestamp?.startsWith(today),
  ).length;
  const totalEnrollments = users.filter((u) => u.role === "student").length; // students only
  const absentToday = totalEnrollments - presentToday;

  // Pie chart data
  const pieData = [
    { name: "Present", value: presentToday },
    { name: "Absent", value: absentToday < 0 ? 0 : absentToday },
  ];

  // Weekly trend (last 7 days)
  const getWeeklyData = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const count = attendance.filter((r) =>
        r.timestamp?.startsWith(dateStr),
      ).length;
      days.push({
        date: dateStr.slice(5),
        count,
      });
    }
    return days;
  };
  const weeklyData = getWeeklyData();

  // Monthly trend (last 6 months)
  const getMonthlyData = () => {
    const months = {};
    attendance.forEach((rec) => {
      const date = rec.timestamp.split(" ")[0];
      const yearMonth = date.slice(0, 7);
      months[yearMonth] = (months[yearMonth] || 0) + 1;
    });
    const result = [];
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      result.push({
        month: yearMonth,
        count: months[yearMonth] || 0,
      });
    }
    return result;
  };
  const monthlyData = getMonthlyData();

  // Stats cards
  const stats = [
    {
      title: "Total Records",
      value: totalRecords,
      icon: <EventIcon />,
      color: theme.palette.primary.main,
    },
    {
      title: "Unique Students",
      value: uniqueStudents,
      icon: <PeopleIcon />,
      color: theme.palette.success.main,
    },
    {
      title: "Present Today",
      value: presentToday,
      icon: <FaceIcon />,
      color: theme.palette.warning.main,
    },
    {
      title: "Total Enrollments",
      value: totalEnrollments,
      icon: <EnrollIcon />,
      color: theme.palette.secondary.main,
    },
  ];

  // Pagination handlers
  const handleChangePage = (event, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  const paginatedData = attendance.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage,
  );

  // Recent enrollments (last 5 students) – sorted by ID descending
  const recentUsers = [...users]
    .filter((u) => u.role === "student")
    .sort((a, b) => b.id - a.id)
    .slice(0, 5);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
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
      <Typography variant="h4" gutterBottom sx={{ fontWeight: "bold", mb: 3 }}>
        Dashboard
      </Typography>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {stats.map((stat, idx) => (
          <Grid item xs={12} sm={6} md={3} key={idx}>
            <Card
              elevation={3}
              sx={{
                borderRadius: 2,
                transition: "0.2s",
                "&:hover": { transform: "scale(1.02)" },
              }}
            >
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                  <Avatar sx={{ bgcolor: stat.color, mr: 2 }}>
                    {stat.icon}
                  </Avatar>
                  <Typography variant="h6" color="textSecondary">
                    {stat.title}
                  </Typography>
                </Box>
                <Typography
                  variant="h3"
                  sx={{ fontWeight: "bold", textAlign: "center" }}
                >
                  {stat.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Charts Row */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Donut Chart */}
        <Grid item xs={12} md={6}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 4,
              width: 500,
              height: 450,
              border: "1px solid",
              borderColor: "divider",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontWeight: "bold",
                mb: 3,
                display: "flex",
                alignItems: "center",
              }}
            >
              <EventIcon sx={{ mr: 1, color: theme.palette.primary.main }} />{" "}
              Today's Attendance
            </Typography>

            <Box sx={{ flexGrow: 1, width: "100%" }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={8}
                    cornerRadius={8}
                    dataKey="value"
                    cx="50%"
                    cy="50%"
                  >
                    {pieData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <RechartsTooltip cornerRadius={8} />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                  />
                </PieChart>
              </ResponsiveContainer>
            </Box>

            {/* Stats row inside card */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-around",
                mt: 2,
                pt: 2,
                borderTop: "1px solid #eee",
              }}
            >
              <Typography variant="caption" sx={{ textAlign: "center" }}>
                Total
                <br />
                <strong>{totalEnrollments}</strong>
              </Typography>
              <Typography
                variant="caption"
                sx={{ textAlign: "center", color: "#4caf50" }}
              >
                Present
                <br />
                <strong>{presentToday}</strong>
              </Typography>
              <Typography
                variant="caption"
                sx={{ textAlign: "center", color: "#f44336" }}
              >
                Absent
                <br />
                <strong>{absentToday}</strong>
              </Typography>
            </Box>
          </Paper>
        </Grid>

        {/* Weekly Trend Line Chart */}
        <Grid item xs={12} md={6}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 4,
              width: 500,
              height: 450,
              border: "1px solid",
              borderColor: "divider",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontWeight: "bold",
                mb: 3,
                display: "flex",
                alignItems: "center",
              }}
            >
              <TrendingUpIcon
                sx={{ mr: 1, color: theme.palette.success.main }}
              />{" "}
              Weekly Trend
            </Typography>

            <Box sx={{ flexGrow: 1, width: "100%" }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={weeklyData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#f5f5f5"
                  />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "#999" }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "#999" }}
                  />
                  <RechartsTooltip />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke={theme.palette.primary.main}
                    strokeWidth={4}
                    dot={{
                      r: 6,
                      fill: theme.palette.primary.main,
                      strokeWidth: 3,
                      stroke: "#fff",
                    }}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        {/* Monthly Trend Bar Chart */}
        <Grid item xs={12} md={6}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 4,
              width: 500,
              height: 450,
              border: "1px solid",
              borderColor: "divider",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontWeight: "bold",
                mb: 3,
                display: "flex",
                alignItems: "center",
              }}
            >
              <TrendingUpIcon sx={{ mr: 1, color: theme.palette.info.main }} />
              Monthly Attendance (Last 6 Months)
            </Typography>
            <Box sx={{ height: 300, width: "100%" }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor={theme.palette.info.main}
                        stopOpacity={0.8}
                      />
                      <stop
                        offset="95%"
                        stopColor={theme.palette.info.main}
                        stopOpacity={0.2}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#f5f5f5"
                  />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "#999" }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "#999" }}
                  />
                  <RechartsTooltip />
                  <Bar dataKey="count" fill="url(#colorCount)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Recent Attendance Table */}
      <Paper elevation={3} sx={{ p: 3, borderRadius: 2, mb: 4 }}>
        <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
          Recent Attendance Records
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: theme.palette.action.hover }}>
                <TableCell><strong>ID</strong></TableCell>
                <TableCell><strong>Name</strong></TableCell>
                <TableCell><strong>Enrollment ID</strong></TableCell>
                <TableCell><strong>Date & Time</strong></TableCell>
                <TableCell><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedData.length ? (
                paginatedData.map((rec) => (
                  <TableRow key={rec.id} hover>
                    <TableCell>{rec.id}</TableCell>
                    <TableCell>{rec.name}</TableCell>
                    <TableCell>{rec.enrollment_id}</TableCell>
                    <TableCell>{formatPKTime(rec.timestamp)}</TableCell>
                    <TableCell>
                      <Button
                        variant="text"
                        onClick={() =>
                          handleNameClick({
                            user_id: rec.user_id,
                            name: rec.name,
                            enrollment_id: rec.enrollment_id,
                          })
                        }
                        sx={{ textTransform: "none", p: 0, minWidth: "auto" }}
                      >
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    No records
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={attendance.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />

        {/* Button to open modal for recent enrollments */}
        <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
          <Button variant="contained" onClick={() => setEnrollModalOpen(true)}>
            View Recent Enrollments
          </Button>
        </Box>

        {/* Student Attendance Modal */}
        <StudentAttendanceModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          student={selectedStudent}
          onUserDeleted={refreshAttendance}
        />
      </Paper>

      {/* Modal for Recent Enrollments with Delete */}
      <Dialog open={enrollModalOpen} onClose={() => setEnrollModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Recent Student Enrollments</DialogTitle>
        <DialogContent dividers>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: theme.palette.action.hover }}>
                  <TableCell><strong>ID</strong></TableCell>
                  <TableCell><strong>Name</strong></TableCell>
                  <TableCell><strong>Enrollment ID</strong></TableCell>
                  <TableCell><strong>Role</strong></TableCell>
                  <TableCell><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recentUsers.length ? (
                  recentUsers.map((user) => (
                    <TableRow key={user.id} hover>
                      <TableCell>{user.id}</TableCell>
                      <TableCell>{user.name}</TableCell>
                      <TableCell>{user.enrollment_id}</TableCell>
                      <TableCell>
                        <Chip label={user.role} color="default" size="small" />
                      </TableCell>
                      <TableCell>
                        <Tooltip title="Delete Student">
                          <IconButton color="error" onClick={() => handleDeleteClick(user)}>
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      No students enrolled.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEnrollModalOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          Are you sure you want to delete <strong>{studentToDelete?.name}</strong> ({studentToDelete?.enrollment_id})?<br />
          This will permanently remove the student and all their attendance records. This action cannot be undone.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button onClick={confirmDelete} color="error">Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Dashboard;