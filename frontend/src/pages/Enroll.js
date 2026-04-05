import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Paper, Typography, TextField, Button, Snackbar, Alert,
  Card, CardMedia, Grid, Box, Divider, InputAdornment, Container
} from "@mui/material";
import {
  PhotoCamera as PhotoCameraIcon,
  PersonAdd as PersonAddIcon,
  Fingerprint as IDIcon,
  Badge as BadgeIcon,
  CameraAlt as CameraAltIcon
} from "@mui/icons-material";
import WebcamCapture from "../components/WebcamCapture";
import { enrollUser } from "../services/api";

const Enroll = () => {
  const [name, setName] = useState("");
  const [enrollmentId, setEnrollmentId] = useState("");
  const [image, setImage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [toast, setToast] = useState({ open: false, type: "success", text: "" });
  const navigate = useNavigate();
  const timeoutRef = useRef(null);

  useEffect(() => {
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, []);

  const formatEnrollmentId = (value) => {
    const nums = value.replace("GC-", "").replace(/\D/g, '');
    if (nums.length === 0) return "";
    if (nums.length <= 3) return `GC-${nums}`;
    const firstPart = nums.slice(0, 3);
    const secondPart = nums.slice(3, 8);
    return `GC-${firstPart}-${secondPart}`;
  };

  const handleCapture = (imageSrc) => setImage(imageSrc);
  const handleCloseToast = () => setToast({ ...toast, open: false });

  const handleSubmit = async () => {
    if (!name || !enrollmentId || !image) {
      setToast({ open: true, type: "error", text: "Please fill all fields and capture an image." });
      return;
    }

    setSubmitting(true);
    try {
      const res = await enrollUser(name, enrollmentId, image);
      setSubmitting(false);

      if (res.success) {
        setToast({ open: true, type: "success", text: "User enrolled successfully! Redirecting..." });
        setName(""); setEnrollmentId(""); setImage(null);
        timeoutRef.current = setTimeout(() => navigate("/recognition"), 2000);
      } else {
        const isDuplicate = res.message?.toLowerCase().includes("already exists");
        setToast({ 
          open: true, 
          type: isDuplicate ? "warning" : "error", 
          text: res.message + (isDuplicate ? " Redirecting..." : "") 
        });
        if (isDuplicate) timeoutRef.current = setTimeout(() => navigate("/recognition"), 2000);
      }
    } catch (error) {
      setSubmitting(false);
      const errorMsg = error.response?.data?.message || "Network error. Please try again.";
      const isDuplicate = errorMsg.toLowerCase().includes("already exists");
      if (isDuplicate) {
        setToast({ open: true, type: "warning", text: errorMsg + " Redirecting..." });
        timeoutRef.current = setTimeout(() => navigate("/recognition"), 2000);
      } else {
        setToast({ open: true, type: "error", text: errorMsg });
      }
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Snackbar open={toast.open} autoHideDuration={4000} onClose={handleCloseToast} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert onClose={handleCloseToast} severity={toast.type} variant="filled" sx={{ width: '100%' }}>{toast.text}</Alert>
      </Snackbar>

      {/* Header Section */}
      <Box sx={{ mb: 4, textAlign: { xs: "center", md: "left" } }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: "#1a237e", display: 'flex', alignItems: 'center', gap: 2, justifyContent: { xs: 'center', md: 'flex-start' } }}>
          <PersonAddIcon fontSize="large" /> Student Enrollment
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
          Register new students into the facial recognition database.
        </Typography>
      </Box>

      <Paper elevation={6} sx={{ borderRadius: 4, overflow: "hidden", border: "1px solid #e0e0e0" }}>
        <Grid container>
          {/* Form Side */}
          <Grid item xs={12} md={5} sx={{ p: { xs: 3, md: 5 }, bgcolor: "#fff" }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 3, color: "#333" }}>
              Personal Details
            </Typography>
            
            <Box component="form" sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <TextField
                fullWidth
                label="Full Name"
                variant="outlined"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={submitting}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <BadgeIcon color="primary" />
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                fullWidth
                label="Enrollment ID"
                placeholder="GC-000-00000"
                variant="outlined"
                value={enrollmentId}
                onChange={(e) => setEnrollmentId(formatEnrollmentId(e.target.value))}
                disabled={submitting}
                helperText="Format: GC-XXX-XXXXX"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <IDIcon color="primary" />
                    </InputAdornment>
                  ),
                }}
                inputProps={{ maxLength: 12, inputMode: 'numeric' }} 
              />

              <Divider sx={{ my: 1 }} />

              <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={handleSubmit}
                disabled={!image || !name || !enrollmentId || submitting}
                sx={{ 
                  py: 2, 
                  borderRadius: 3, 
                  textTransform: "none", 
                  fontWeight: "bold",
                  fontSize: "1.1rem",
                  boxShadow: "0 4px 12px rgba(25, 118, 210, 0.3)"
                }}
              >
                {submitting ? "Processing..." : "Confirm & Enroll Student"}
              </Button>
            </Box>
          </Grid>

          {/* Camera Side */}
          <Grid item xs={12} md={7} sx={{ bgcolor: "#f8f9fa", p: { xs: 3, md: 5 }, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <Box sx={{ width: "100%", textAlign: "left", mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: "#333", display: 'flex', alignItems: 'center', gap: 1 }}>
                <CameraAltIcon color="secondary" /> Face Verification
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Ensure proper lighting and face the camera directly.
              </Typography>
            </Box>

            <Box sx={{ 
              width: "100%", 
              maxWidth: 480, 
              borderRadius: 4, 
              overflow: "hidden", 
              boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
              border: "4px solid #fff",
              bgcolor: "#000"
            }}>
              <WebcamCapture onCapture={handleCapture} />
            </Box>

            {/* Preview Section */}
            <Box sx={{ mt: 3, width: "100%", textAlign: "center" }}>
              {image ? (
                <Box sx={{ animate: 'fadeIn 0.5s' }}>
                  <Typography variant="caption" sx={{ display: 'block', mb: 1, fontWeight: 'bold', color: '#4caf50' }}>
                    ✅ Face Captured Successfully
                  </Typography>
                  <Card sx={{ 
                    maxWidth: 140, 
                    mx: "auto", 
                    border: "3px solid #4caf50", 
                    borderRadius: 3,
                    overflow: 'hidden',
                    transform: 'rotate(-2deg)',
                    boxShadow: "0 4px 10px rgba(0,0,0,0.1)"
                  }}>
                    <CardMedia component="img" image={image} alt="Preview" />
                  </Card>
                </Box>
              ) : (
                <Box sx={{ p: 3, border: '2px dashed #ccc', borderRadius: 3, color: '#999' }}>
                  <PhotoCameraIcon sx={{ fontSize: 40, mb: 1, opacity: 0.5 }} />
                  <Typography variant="body2">Waiting for capture...</Typography>
                </Box>
              )}
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

export default Enroll;