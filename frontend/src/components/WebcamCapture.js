import React, { useRef } from 'react';
import Webcam from 'react-webcam';
import { Button, Box, Paper } from '@mui/material';
import { CameraAlt as CameraIcon } from '@mui/icons-material';

const WebcamCapture = ({ onCapture }) => {
  const webcamRef = useRef(null);
  const capture = () => onCapture(webcamRef.current.getScreenshot());

  return (
    <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
      <Webcam
        audio={false}
        ref={webcamRef}
        screenshotFormat="image/jpeg"
        width="100%"
        videoConstraints={{ facingMode: 'user' }}
        style={{ borderRadius: '8px', maxWidth: '400px' }}
      />
      <Box sx={{ mt: 2 }}>
        <Button variant="contained" startIcon={<CameraIcon />} onClick={capture}>
          Capture Image
        </Button>
      </Box>
    </Paper>
  );
};

export default WebcamCapture;