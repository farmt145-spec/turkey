import { api } from './client';
export const aiApi = {
  getPredictions: (farmId: string) => api.get(`/ai/predictions/${farmId}`),
  getAnomaly: (deviceId: string) => api.get(`/ai/anomaly/${deviceId}`),
};
