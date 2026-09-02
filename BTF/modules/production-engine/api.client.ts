import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000',
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

export const batchApi = {
  getAll: (params?: any) => api.get('/batches', { params }),
  getById: (id: string) => api.get(`/batches/${id}`),
  create: (data: any) => api.post('/batches', data),
  update: (id: string, data: any) => api.patch(`/batches/${id}`, data),
  delete: (id: string) => api.delete(`/batches/${id}`),
  getTimeline: (id: string) => api.get(`/batches/${id}/timeline`),
  getTraceability: (id: string) => api.get(`/batches/${id}/traceability`),
  split: (id: string, data: any) => api.post(`/batches/${id}/split`, data),
  merge: (data: any) => api.post('/batches/merge', data),
};

export const dailyLogApi = {
  create: (data: any) => api.post('/daily-logs', data),
  getByBatch: (batchId: string) => api.get(`/daily-logs/batch/${batchId}`),
  getByDay: (batchId: string, dayNumber: number) => 
    api.get(`/daily-logs/batch/${batchId}/day/${dayNumber}`),
};

export const transferApi = {
  create: (data: any) => api.post('/transfers', data),
  getByBatch: (batchId: string) => api.get(`/transfers/batch/${batchId}`),
  getByFarm: (farmId: string) => api.get(`/transfers/farm/${farmId}`),
};

export const farmApi = {
  getAll: () => api.get('/farms'),
  getById: (id: string) => api.get(`/farms/${id}`),
  getHouses: (farmId: string) => api.get(`/farms/${farmId}/houses`),
  getSectors: (houseId: string) => api.get(`/houses/${houseId}/sectors`),
};
