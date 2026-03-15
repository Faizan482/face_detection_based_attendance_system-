import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

export const enrollUser = async (name, enrollmentId, image) => {
    const response = await axios.post(`${API_BASE}/enroll`, {
        name,
        enrollment_id: enrollmentId,
        image
    });
    return response.data;
};

export const recognizeFace = async (image) => {
    const response = await axios.post(`${API_BASE}/recognize`, { image });
    return response.data;
};

export const getAttendance = async () => {
    const response = await axios.get(`${API_BASE}/attendance`);
    return response.data;
};