import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { FarmOverview, BuildingMap, DigitalTwinState } from '../types';
import { dashboardApi } from '../api/dashboard';

interface DashboardState {
  overview: FarmOverview | null; deviceMap: BuildingMap[]; digitalTwin: DigitalTwinState | null;
  isLoading: boolean; error: string | null; selectedFarmId: string | null; selectedBuildingId: string | null; timeRange: '24h' | '7d' | '30d';
  setSelectedFarm: (farmId: string) => void; setSelectedBuilding: (buildingId: string | null) => void; setTimeRange: (range: '24h' | '7d' | '30d') => void;
  fetchOverview: () => Promise<void>; fetchDeviceMap: () => Promise<void>; updateDeviceStatus: (deviceId: string, status: string) => void; addAlarm: (alarm: any) => void;
}

export const useDashboardStore = create<DashboardState>()(devtools((set, get) => ({
  overview: null, deviceMap: [], digitalTwin: null, isLoading: false, error: null, selectedFarmId: null, selectedBuildingId: null, timeRange: '24h',
  setSelectedFarm: (farmId) => set({ selectedFarmId: farmId }),
  setSelectedBuilding: (buildingId) => set({ selectedBuildingId: buildingId }),
  setTimeRange: (range) => set({ timeRange: range }),
  fetchOverview: async () => {
    const { selectedFarmId } = get(); if (!selectedFarmId) return;
    set({ isLoading: true, error: null });
    try { const data = await dashboardApi.getOverview(selectedFarmId); set({ overview: data, isLoading: false }); }
    catch (err: any) { set({ error: err.message, isLoading: false }); }
  },
  fetchDeviceMap: async () => {
    const { selectedFarmId } = get(); if (!selectedFarmId) return;
    set({ isLoading: true });
    try { const data = await dashboardApi.getDeviceMap(selectedFarmId); set({ deviceMap: data, isLoading: false }); }
    catch (err: any) { set({ error: err.message, isLoading: false }); }
  },
  updateDeviceStatus: (deviceId, status) => {
    set((state) => ({
      deviceMap: state.deviceMap.map((building) => ({
        ...building,
        zones: building.zones.map((zone) => ({ ...zone, devices: zone.devices.map((d) => d.id === deviceId ? { ...d, status: status as any } : d) })),
        unzonedDevices: building.unzonedDevices.map((d) => d.id === deviceId ? { ...d, status: status as any } : d),
      })),
    }));
  },
  addAlarm: (alarm) => {
    set((state) => ({
      overview: state.overview ? { ...state.overview, recentAlarms: [alarm, ...state.overview.recentAlarms].slice(0, 20), summary: { ...state.overview.summary, activeAlarms: state.overview.summary.activeAlarms + 1 } } : null,
    }));
  },
}), { name: 'DashboardStore' }));
