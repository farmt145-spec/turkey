import React from 'react';
import { useDashboardStore } from '../../store/dashboardStore';
import { Activity, AlertTriangle, Wifi, WifiOff, Server } from 'lucide-react';

export const FarmOverviewCards: React.FC = () => {
  const overview = useDashboardStore((state) => state.overview);
  if (!overview) return null;
  const { summary } = overview;
  const cards = [
    { title: 'Urządzenia Online', value: summary.onlineDevices, total: summary.totalDevices, percentage: summary.onlinePercentage, icon: Wifi, color: 'text-green-600', bgColor: 'bg-green-50' },
    { title: 'Urządzenia Offline', value: summary.offlineDevices, total: summary.totalDevices, icon: WifiOff, color: 'text-red-600', bgColor: 'bg-red-50' },
    { title: 'Aktywne Alarmy', value: summary.activeAlarms, icon: AlertTriangle, color: 'text-orange-600', bgColor: 'bg-orange-50' },
    { title: 'Wszystkie Urządzenia', value: summary.totalDevices, icon: Server, color: 'text-blue-600', bgColor: 'bg-blue-50' },
  ];
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card) => (
        <div key={card.title} className={`${card.bgColor} rounded-xl p-6 border border-gray-100`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{card.title}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}{card.total !== undefined && <span className="text-sm font-normal text-gray-500 ml-1">/ {card.total}</span>}</p>
              {card.percentage !== undefined && <div className="mt-2 w-full bg-gray-200 rounded-full h-2"><div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${card.percentage}%` }} /></div>}
            </div>
            <card.icon className={`w-8 h-8 ${card.color}`} />
          </div>
        </div>
      ))}
    </div>
  );
};
