import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import { 
  ThemeProvider, 
  createTheme, 
  CssBaseline,
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  Container,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Face as FaceIcon,
  HowToReg as EnrollIcon,
  People as PeopleIcon,
  Logout as LogoutIcon
} from '@mui/icons-material';

// Import pages
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import Enroll from './pages/Enroll';
import Recognition from './pages/Recognition';
import Attendance from './pages/Attendance';
import Login from './pages/Login';
import AdminSignup from './pages/AdminSignup';
// import UserManagement from './pages/UserManagement'; // optional admin page

// Import auth store and protected route
import useAuthStore from './store/authStore';
import ProtectedRoute from './components/ProtectedRoute';

const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    secondary: { main: '#dc004e' },
  },
});

const drawerWidth = 260;

// Separate component for logout button to use useNavigate inside Router context
const LogoutListItem = () => {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = () => {
    logout();
    navigate('/'); // redirect to landing page
  };

  return (
    <ListItem button onClick={handleLogout}>
      <ListItemIcon><LogoutIcon /></ListItemIcon>
      <ListItemText primary="Logout" />
    </ListItem>
  );
};

function App() {
  const { token, user } = useAuthStore();
  const isAuthenticated = !!token;
  const isAdmin = user?.role === 'admin';

  const drawer = (
    <div>
      <Toolbar /> {/* Spacer for AppBar */}
      <List>
        {/* Dashboard link sirf admin ko dikhega, ab /dashboard par */}
        {isAdmin && (
          <ListItem button component={Link} to="/dashboard">
            <ListItemIcon><DashboardIcon /></ListItemIcon>
            <ListItemText primary="Dashboard" />
          </ListItem>
        )}
        <ListItem button component={Link} to="/enroll">
          <ListItemIcon><EnrollIcon /></ListItemIcon>
          <ListItemText primary="Enroll" />
        </ListItem>
        <ListItem button component={Link} to="/recognition">
          <ListItemIcon><FaceIcon /></ListItemIcon>
          <ListItemText primary="Mark Attendance" />
        </ListItem>
        <ListItem button component={Link} to="/attendance">
          <ListItemIcon><PeopleIcon /></ListItemIcon>
          <ListItemText primary="Attendance Records" />
        </ListItem>
      </List>
      {isAdmin && (
        <>
          <Divider />
          <List>
            <ListItem button component={Link} to="/admin/users">
              <ListItemIcon><PeopleIcon /></ListItemIcon>
              <ListItemText primary="User Management" />
            </ListItem>
          </List>
        </>
      )}
      <Divider />
      <List>
        <LogoutListItem /> {/* Use the separate component */}
      </List>
    </div>
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Box sx={{ display: 'flex' }}>
          {/* Top App Bar */}
          <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
            <Toolbar>
              <Typography 
                variant="h6" 
                component={Link} 
                to="/" 
                noWrap 
                sx={{ flexGrow: 1, textDecoration: 'none', color: 'inherit' }}
              >
                Face Attendance System
              </Typography>
              {isAuthenticated && (
                <Typography variant="body2">
                  {user?.name} ({user?.role})
                </Typography>
              )}
            </Toolbar>
          </AppBar>

          {/* Sidebar – only shown when authenticated */}
          {isAuthenticated && (
            <Drawer
              variant="permanent"
              sx={{
                width: drawerWidth,
                flexShrink: 0,
                [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box' },
              }}
            >
              {drawer}
            </Drawer>
          )}

          {/* Main Content */}
          <Box
            component="main"
            sx={{
              flexGrow: 1,
              p: 3,
              ml: isAuthenticated ? `${drawerWidth}px` : 0,
              width: { sm: `calc(100% - ${drawerWidth}px)` },
              transition: 'margin 0.2s',
            }}
          >
            <Toolbar /> {/* Spacer for AppBar */}
            <Container maxWidth={false} sx={{ px: 3, py: 3 }}>
              <Routes>
                {/* Public routes – no token required */}
                <Route path="/admin/signup" element={<AdminSignup />} />
                <Route path="/login" element={<Login />} />
                <Route path="/enroll" element={<Enroll />} />
                <Route path="/recognition" element={<Recognition />} />

                {/* Root route – conditional redirect based on auth */}
                <Route 
                  path="/" 
                  element={
                    isAuthenticated ? (
                      isAdmin ? <Navigate to="/dashboard" replace /> : <Navigate to="/attendance" replace />
                    ) : (
                      <LandingPage />
                    )
                  } 
                />

                {/* Protected routes */}
                {/* Admin dashboard */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute requireAdmin>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                {/* Attendance page – accessible to all authenticated users (students & admin) */}
                <Route
                  path="/attendance"
                  element={
                    <ProtectedRoute>
                      <Attendance />
                    </ProtectedRoute>
                  }
                />
                {/* Admin-only user management (if uncommented) */}
                {/* {isAdmin && (
                  <Route
                    path="/admin/users"
                    element={
                      <ProtectedRoute requireAdmin>
                        <UserManagement />
                      </ProtectedRoute>
                    }
                  />
                )} */}

                {/* Redirect any unknown route to landing page */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Container>
          </Box>
        </Box>
      </Router>
    </ThemeProvider>
  );
}

export default App;