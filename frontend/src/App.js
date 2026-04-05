import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  Navigate,
  useNavigate,
} from "react-router-dom";
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
  Avatar,
} from "@mui/material";
import {
  Dashboard as DashboardIcon,
  Face as FaceIcon,
  HowToReg as EnrollIcon,
  People as PeopleIcon,
  Logout as LogoutIcon,
} from "@mui/icons-material";

// Import pages
import LandingPage from "./pages/LandingPage";
import Dashboard from "./pages/Dashboard";
import Enroll from "./pages/Enroll";
import Recognition from "./pages/Recognition";
import Attendance from "./pages/Attendance";
import Login from "./pages/Login";
import AdminSignup from "./pages/AdminSignup";

// Import auth store and protected route
import useAuthStore from "./store/authStore";
import ProtectedRoute from "./components/ProtectedRoute";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#1976d2", // your primary blue
    },
    secondary: {
      main: "#dc004e",
    },
    background: {
      default: "#f4f6f8",
      paper: "#ffffff",
    },
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", sans-serif',
    h4: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 500,
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
          transition: "transform 0.2s, box-shadow 0.2s",
          "&:hover": {
            transform: "translateY(-4px)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 500,
        },
      },
    },
  },
});

const drawerWidth = 280;

// Separate component for logout button to use useNavigate inside Router context
const LogoutListItem = () => {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = () => {
    logout();
    navigate("/"); // redirect to landing page
  };

  return (
    <ListItem
      button
      onClick={handleLogout}
      sx={{
        "&:hover": { backgroundColor: "#334155" },
        borderRadius: 2,
        mb: 0.5,
        color: "#ffffff",
        cursor: "pointer",
      }}
    >
      <ListItemIcon sx={{ color: "#ffffff" }}>
        <LogoutIcon />
      </ListItemIcon>
      <ListItemText primary="Logout" />
    </ListItem>
  );
};

function App() {
  const { token, user } = useAuthStore();
  const isAuthenticated = !!token;
  const isAdmin = user?.role === "admin";

  const drawer = (
    <div>
      <Toolbar /> {/* Spacer for AppBar */}
      <List sx={{px:'6px'}}>
        {/* Dashboard link sirf admin ko dikhega, ab /dashboard par */}
        {isAdmin && (
          <ListItem
            button
            component={Link}
            to="/dashboard"
            sx={{
              "&:hover": { backgroundColor: "#334155" },
              borderRadius: 2,
              mb: 0.5,
              color: "#ffffff",
            }}
          >
            <ListItemIcon sx={{ color: "#ffffff" }}>
              <DashboardIcon />
            </ListItemIcon>
            <ListItemText primary="Dashboard" />
          </ListItem>
        )}
        <ListItem
          button
          component={Link}
          to="/enroll"
          sx={{
            "&:hover": { backgroundColor: "#334155" },
            borderRadius: 2,
            mb: 0.5,
            color: "#ffffff",
          }}
        >
          <ListItemIcon sx={{ color: "#ffffff" }}>
            <EnrollIcon />
          </ListItemIcon>
          <ListItemText primary="Enroll" />
        </ListItem>
        <ListItem
          button
          component={Link}
          to="/recognition"
          sx={{
            "&:hover": { backgroundColor: "#334155" },
            borderRadius: 2,
            mb: 0.5,
            color: "#ffffff",
          }}
        >
          <ListItemIcon sx={{ color: "#ffffff" }}>
            <FaceIcon />
          </ListItemIcon>
          <ListItemText primary="Mark Attendance" />
        </ListItem>
        <ListItem
          button
          component={Link}
          to="/attendance"
          sx={{
            "&:hover": { backgroundColor: "#334155" },
            borderRadius: 2,
            mb: 0.5,
            color: "#ffffff",
          }}
        >
          <ListItemIcon sx={{ color: "#ffffff" }}>
            <PeopleIcon />
          </ListItemIcon>
          <ListItemText primary="Attendance Records" />
        </ListItem>
      </List>
      <Divider />
      <List sx={{px:1}}>
        <LogoutListItem />
      </List>
    </div>
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Box sx={{ display: "flex" }}>
          {/* Top App Bar */}
          <AppBar
            position="fixed"
            sx={{
              zIndex: (theme) => theme.zIndex.drawer + 1,
              backgroundColor: theme.palette.primary.main,
              boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
            }}
          >
            <Toolbar>
              <Typography
                variant="h6"
                sx={{
                  flexGrow: 1,
                  fontWeight: 500,
                  textDecoration: "none",
                  color: "inherit",
                }}
                component={Link}
                to="/"
                noWrap
              >
                Face Attendance System
              </Typography>
              {isAuthenticated && (
                <Box display="flex" alignItems="center">
                  <Avatar
                    sx={{
                      bgcolor: "#ffffff",
                      color: theme.palette.primary.main,
                      width: 32,
                      height: 32,
                      mr: 1,
                    }}
                  >
                    {user?.name?.[0]}
                  </Avatar>
                  <Typography variant="body2">
                    {user?.name} ({user?.role})
                  </Typography>
                </Box>
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
                [`& .MuiDrawer-paper`]: {
                  width: drawerWidth,
                  boxSizing: "border-box",
                  backgroundColor: "#1e293b",
                  color: "#ffffff",
                },
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
              // ml: isAuthenticated ? `${drawerWidth}px` : 0,
              width: { sm: `calc(100% - ${drawerWidth}px)` },
            }}
          >
            <Toolbar /> {/* Spacer for AppBar */}
            <Container maxWidth={false}>
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
                      isAdmin ? (
                        <Navigate to="/dashboard" replace />
                      ) : (
                        <Navigate to="/attendance" replace />
                      )
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
