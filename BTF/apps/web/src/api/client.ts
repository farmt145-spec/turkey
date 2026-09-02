import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => Promise.reject(error?.response?.data || error),
);

export default api;

export const workflowApi = {
  getAll: (params?: { page?: number; limit?: number; isActive?: boolean }) =>
    api.get('/workflows', { params }),
  getById: (id: string) => api.get(`/workflows/${id}`),
  create: (data: unknown) => api.post('/workflows', data),
  update: (id: string, data: unknown) => api.patch(`/workflows/${id}`, data),
  delete: (id: string) => api.delete(`/workflows/${id}`),
  execute: (id: string, payload?: unknown) => api.post(`/workflows/${id}/execute`, payload),
  getExecutions: (id: string, params?: { page?: number; limit?: number }) =>
    api.get(`/workflows/${id}/executions`, { params }),
};

export const eventApi = {
  publish: (data: { eventType: string; sourceModule: string; payload: Record<string, unknown> }) =>
    api.post('/events/publish', data),
};

export const schedulerApi = {
  getAll: () => api.get('/scheduler'),
  create: (data: unknown) => api.post('/scheduler', data),
  delete: (id: string) => api.delete(`/scheduler/${id}`),
};

export const notificationApi = {
  getUnread: (userId: string) => api.get('/notifications', { params: { userId } }),
  markAsRead: (id: string) => api.patch(`/notifications/${id}/read`),
};

export const aiApi = {
  getSuggestions: (status?: string) => api.get('/ai-assistant/suggestions', { params: { status } }),
  accept: (id: string, userId: string) => api.post(`/ai-assistant/suggestions/${id}/accept`, { userId }),
};

export const dashboardApi = {
  getStats: () => api.get('/dashboard/stats'),
  getModuleMap: () => api.get('/dashboard/module-map'),
  getHistory: (days?: number) => api.get('/dashboard/execution-history', { params: { days } }),
};
