import React from 'react';
import { useDashboardStore } from '../../store/dashboardStore';
import { Thermometer, Droplets, Wind, Cloud } from 'lucide-react';

export const ClimateOverview: React.FC = () => {
  const climate = useDashboardStore((state) => state.overview?.climateOverview);
  if (!climate) return (
    <div className="bg-white rounded-xl p-6 border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Klimat</h3>
      <p className="text-gray-500">Brak danych klimatycznych</p>
    </div>
  );
  const metrics = [
    { label: 'Temperatura śr.', value: climate.avgTemperature?.toFixed(1), unit: '°C', icon: Thermometer, min: climate.minTemperature, max: climate.maxTemperature },
    { label: 'Wilgotność', value: climate.avgHumidity?.toFixed(1), unit: '%', icon: Droplets },
    { label: 'CO₂', value: climate.avgCO2?.toFixed(0), unit: 'ppm', icon: Cloud },
    { label: 'NH₃', value: climate.avgNH3?.toFixed(2), unit: 'ppm', icon: Wind },
    { label: 'H₂S', value: climate.avgH2S?.toFixed(2), unit: 'ppm', icon: Wind },
    { label: 'Przepływ powietrza', value: climate.avgAirflow?.toFixed(1), unit: 'm³/h', icon: Wind },
  ];
  return (
    <div className="bg-white rounded-xl p-6 border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Klimat (24h)</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {metrics.map((m) => (
          <div key={m.label} className="flex items-start space-x-3">
            <m.icon className="w-5 h-5 text-blue-500 mt-0.5" />
            <div>
              <p className="text-sm text-gray-600">{m.label}</p>
              <p className="text-lg font-semibold text-gray-900">{m.value || '--'} <span className="text-sm font-normal text-gray-500">{m.unit}</span></p>
              {m.min !== undefined && <p className="text-xs text-gray-400">Zakres: {m.min.toFixed(1)} - {m.max.toFixed(1)}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
