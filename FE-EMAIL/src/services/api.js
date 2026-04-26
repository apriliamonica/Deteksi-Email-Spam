import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Auth token interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// === Email API ===
export const emailAPI = {
  classify: (data) => api.post('/email/classify', data),
  list: (params) => api.get('/email/list', { params }),
  stats: () => api.get('/email/stats'),
  getById: (id) => api.get(`/email/${id}`),
};

// === Model API ===
export const modelAPI = {
  status: () => api.get('/model/status'),
  train: (params) => api.post('/model/train', params),
  uploadDataset: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/model/upload-dataset', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  load: () => api.post('/model/load'),
};

// === Auth API ===
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
};

export default api;
