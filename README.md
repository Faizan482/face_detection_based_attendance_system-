# Face Attendance System

Face recognition based attendance system with liveness detection (eye‑blink).  
Students enroll with face, mark attendance (blink required). Admin gets dashboard, reports, manual override.

## Tech Stack
- **Backend:** Flask, face_recognition, dlib, OpenCV, SQLite, JWT
- **Frontend:** React, Material‑UI, Recharts, react‑webcam, Zustand

## Features
- Student: enroll, mark attendance (liveness), own history
- Admin: login, dashboard (charts), manage students, manual attendance, PDF export, delete student
- Duplicate prevention (ID & face), role‑based access, responsive UI

## Setup (Local)

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate   # or venv\Scripts\activate on Windows
pip install -r requirements.txt
# Download shape_predictor_68_face_landmarks.dat and place in backend/
cp config.example.py config.py   # edit with your secret keys
python app.py

cd frontend
npm install
npm start
config.py: SECRET_KEY, ADMIN_SECRET_KEY (admin signup secret) //ADMIN2025// key
