// services/api.js
import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// ─── Auth token interceptor ─────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Response interceptor (optional, untuk handle 401 global) ─
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired - hapus dan redirect ke login
      localStorage.removeItem("token");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

// === Email API ===
export const emailAPI = {
  classify: (data) => api.post("/email/classify", data),
  previewColumns: (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post("/email/preview-columns", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  classifyBatch: (formData) =>
    api.post("/email/classify-batch", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  list: (params) => api.get("/email/list", { params }),
  stats: (dataset_id = null) =>
    api.get("/email/stats", { params: { dataset_id } }),
  getById: (id) => api.get(`/email/${id}`),

  // Riwayat Klasifikasi — bisa difilter per user
  getClassifyHistory: (params = {}) =>
    api.get("/email/classify-history", { params }),
  // Riwayat Batch (terkelompok per upload file)
  getBatchHistory: (params = {}) =>
    api.get("/email/classify-history/batches", { params }),
  deleteBatchHistory: (batchId) => 
    api.delete(`/email/classify-history/batches/${batchId}`),
  deleteClassifyItem: (id) => api.delete(`/email/classify-history/${id}`),
  deleteAllClassifyHistory: () => api.delete("/email/classify-history"),
};

// Helper: ambil user dari localStorage
export const getCurrentUser = () => {
  try {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};


// === Model API ===
export const modelAPI = {
  // Status & Progress
  getStatus: () => api.get("/model/status"),
  getProgress: () => api.get("/model/progress"),
  cancelTrain: () => api.post("/model/cancel-train"),
  load: () => api.post("/model/load"),

  // Dataset Management
  listDatasets: () => api.get("/model/datasets"),
  deleteDataset: (id) => api.delete(`/model/datasets/${id}`),
  getDatasetRows: (datasetId, limit = 50, offset = 0) =>
    api.get(`/model/datasets/${datasetId}/rows`, {
      params: { limit, offset },
    }),

  // Dataset Upload & Preview
  previewDataset: (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post("/model/preview-dataset", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  uploadDataset: (file, dataset_name, onUploadProgress) => {
    const formData = new FormData();
    formData.append("file", file);
    if (dataset_name) formData.append("dataset_name", dataset_name);
    return api.post("/model/upload-dataset", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress,
    });
  },
  seedLocal: () => api.post("/model/seed-local"),

  // Preprocessing
  startPreprocess: (dataset_id = null, force = false) =>
    api.post("/model/preprocess", { dataset_id, force }),
  cancelPreprocess: () => api.post("/model/cancel-preprocess"),
  getPreprocessStatus: () => api.get("/model/preprocess-status"),

  // Training
  train: (params) =>
    api.post("/model/train", {
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
      gat_weight_decay: params.gat_weight_decay || 1e-4,
    }),

  // History & Active Model
  getHistory: () => api.get("/model/history"),
  getHistoryDetail: (id) => api.get(`/model/history/${id}`),

  // ✅ Hapus Riwayat Model (untuk fitur hapus)
  deleteHistory: (id) => api.delete(`/model/history/${id}`),

  // ✅ Unduh ZIP Model
  downloadHistory: (id) => api.get(`/model/history/${id}/download`, { responseType: 'blob' }),

  activateModel: (id) => api.post(`/model/activate/${id}`),
  getActiveModel: () => api.get("/model/active"),
};

// === Auth API ===
export const authAPI = {
  login: (data) => api.post("/auth/login", data),
  logout: () => api.post("/auth/logout"),
  me: () => api.get("/auth/me"),
};

// === Users API ===
export const usersAPI = {
  list: () => api.get("/users"),
  create: (data) => api.post("/users", data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
};

export default api;
