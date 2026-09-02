import React, { useEffect } from 'react';
import { useDashboardStore } from '../store/dashboardStore';
import { useWebSocket } from '../hooks/useWebSocket';
import { FarmOverviewCards } from '../components/dashboard/FarmOverviewCards';
import { ClimateOverview } from '../components/dashboard/ClimateOverview';
import { RecentAlarms } from '../components/dashboard/RecentAlarms';
import { AIPredictionsPanel } from '../components/ai/AIPredictionsPanel';
import { TimeSeriesChart } from '../components/charts/TimeSeriesChart';
import { MultiMetricChart } from '../components/charts/MultiMetricChart';

export const DashboardPage: React.FC = () => {
  const { selectedFarmId, fetchOverview, updateDeviceStatus, addAlarm } = useDashboardStore();
  useWebSocket({ farmId: selectedFarmId || undefined, onDeviceStatus: (data) => updateDeviceStatus(data.deviceId, data.status), onAlarm: (data) => addAlarm(data) });
  useEffect(() => { if (selectedFarmId) fetchOverview(); }, [selectedFarmId]);
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard IoT</h1>
        <div className="flex items-center space-x-2 text-sm text-gray-500"><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /><span>Połączenie WebSocket aktywne</span></div>
      </div>
      <FarmOverviewCards />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <ClimateOverview />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <TimeSeriesChart data={[]} metric="temperatura" unit="°C" color="#ef4444" />
            <TimeSeriesChart data={[]} metric="wilgotność" unit="%" color="#3b82f6" />
          </div>
          <MultiMetricChart data={[]} title="Zużycie energii i wody (7 dni)" metrics={[{ key: 'energy', name: 'Energia', color: '#f59e0b', unit: 'kWh' }, { key: 'water', name: 'Woda', color: '#3b82f6', unit: 'm³' }]} />
        </div>
        <div className="space-y-6"><RecentAlarms /><AIPredictionsPanel /></div>
      </div>
    </div>
  );
};
