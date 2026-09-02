import { api } from './client';
import { Device, TelemetryPoint } from '../types';

export const devicesApi = {
  getAll: (filters?: Record<string, any>) => api.get<Device[]>('/devices', filters),
  getById: (id: string) => api.get<Device>(`/devices/${id}`),
  getTelemetry: (id: string, from: string, to: string, limit?: number) => api.get<TelemetryPoint[]>(`/devices/${id}/telemetry`, { from, to, limit }),
  create: (data: Partial<Device>) => api.post<Device>('/devices', data),
  update: (id: string, data: Partial<Device>) => api.patch<Device>(`/devices/${id}`, data),
  delete: (id: string) => api.delete<void>(`/devices/${id}`),
  sendCommand: (id: string, command: { type: string; params: Record<string, any> }) => api.post<any>(`/devices/${id}/command`, command),
};
