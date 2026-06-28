// client/src/api.js
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:5000",   // 👈 Flask server URL
});

// Student Management API calls
export const studentApi = {
  // Get all students (admin only)
  getAllStudents: () => api.get('/api/students'),

  // Create a new student (admin only)
  createStudent: (data: {
    username: string;
    password: string;
    name?: string;
    email?: string;
    department?: string;
    student_id?: string;
    phone_number?: string;
  }) => api.post('/api/students', data),

  // Get current student profile
  getStudentProfile: () => api.get('/api/students/me'),

  // Student requests verification
  requestVerification: (data: {
    student_id: string;
    name?: string;
    email?: string;
    department?: string;
    phone_number?: string;
  }) => api.post('/api/students/request-verification', data),

  // Admin approves student
  approveStudent: (studentId: number) => api.post(`/api/students/${studentId}/approve`),

  // Admin rejects student
  rejectStudent: (studentId: number) => api.post(`/api/students/${studentId}/reject`),

  // Admin deletes student
  deleteStudent: (studentId: number) => api.delete(`/api/students/${studentId}`),
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  // console.log("API Interceptor Token:", token ? "Exists" : "Missing"); // Commented out to avoid clutter, enable if needed
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
