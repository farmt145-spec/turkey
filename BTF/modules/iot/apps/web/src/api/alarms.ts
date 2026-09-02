import { api } from './client';
import { Alarm } from '../types';

export const alarmsApi = {
  getAlarms: (farmId: string, filters?: Record<string, any>) => api.get<{ alarms: Alarm[]; total: number; page: number }>(`/alarms/${farmId}`, filters),
  acknowledge: (alarmId: string, comment?: string) => api.post(`/alarms/${alarmId}/acknowledge`, { comment }),
  resolve: (alarmId: string) => api.post(`/alarms/${alarmId}/resolve`),
  getStats: (farmId: string, period: string) => api.get(`/alarms/${farmId}/stats`, { period }),
};
