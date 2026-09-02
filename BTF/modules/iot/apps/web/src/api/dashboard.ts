import { api } from './client';
import { FarmOverview, BuildingMap, TimeSeriesData } from '../types';

export const dashboardApi = {
  getOverview: (farmId: string) => api.get<FarmOverview>(`/dashboard/${farmId}/overview`),
  getDeviceMap: (farmId: string) => api.get<BuildingMap[]>(`/dashboard/${farmId}/map`),
  getTimeSeries: (farmId: string, metric: string, range: string, buildingId?: string) => api.get<TimeSeriesData[]>(`/dashboard/${farmId}/timeseries`, { metric, range, buildingId }),
  getDeviceStatus: (farmId: string, hours?: number) => api.get<any[]>(`/dashboard/${farmId}/devices/status`, { hours }),
};
