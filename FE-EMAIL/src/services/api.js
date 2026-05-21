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
  classifyBatch: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/email/classify-batch', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  list: (params) => api.get('/email/list', { params }),
  stats: (dataset_id = null) => api.get('/email/stats', { params: { dataset_id } }),
  getById: (id) => api.get(`/email/${id}`),
};

// === Model API ===
export const modelAPI = {
  getStatus: () => api.get('/model/status'),
  getProgress: () => api.get('/model/progress'),
  cancelTrain: () => api.post('/model/cancel-train'),
  listDatasets: () => api.get('/model/datasets'),
  deleteDataset: (id) => api.delete(`/model/datasets/${id}`),
  train: (params) => api.post('/model/train', {
    dataset_id: params.dataset_id,
    model_name: params.model_name,
    test_split: params.test_split || 0.2,
    val_split: params.val_split || 0.1,
    finetune_epochs: params.finetune_epochs || 2,
    finetune_lr: params.finetune_lr || 2e-5,
    finetune_batch_size: params.finetune_batch_size || 16,
    weight_decay: params.weight_decay || 0.01,
    gat_epochs: params.gat_epochs || 100,
    gat_lr: params.gat_lr || 0.001,
    gat_weight_decay: params.gat_weight_decay || 1e-4
  }),
  uploadDataset: (file, onUploadProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/model/upload-dataset', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress
    });
  },
  seedLocal: () => api.post('/model/seed-local'),
  startPreprocess: (dataset_id = null, force = false) => api.post('/model/preprocess', { dataset_id, force }),
  cancelPreprocess: () => api.post('/model/cancel-preprocess'),
  getPreprocessStatus: () => api.get('/model/preprocess-status'),
  load: () => api.post('/model/load'),
  getHistory: () => api.get('/model/history'),
  getHistoryDetail: (id) => api.get(`/model/history/${id}`),
  activateModel: (id) => api.post(`/model/activate/${id}`),
  getActiveModel: () => api.get('/model/active'),
};

// === Auth API ===
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
};

export default api;
