import React from 'react';
import { useDashboardStore } from '../../store/dashboardStore';
import { ChevronDown } from 'lucide-react';

const MOCK_FARMS = [
  { id: 'farm-1', name: 'Ferma Główna - Wielkopolska' },
  { id: 'farm-2', name: 'Ferma Zachodnia - Lubuskie' },
  { id: 'farm-3', name: 'Ferma Południowa - Śląsk' },
];

export const FarmSelector: React.FC = () => {
  const { selectedFarmId, setSelectedFarm } = useDashboardStore();
  return (
    <div className="relative">
      <select value={selectedFarmId || ''} onChange={(e) => setSelectedFarm(e.target.value)}
        className="appearance-none bg-gray-50 border border-gray-200 text-gray-700 py-2 pl-4 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
        <option value="">Wybierz fermę</option>
        {MOCK_FARMS.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
      </select>
      <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
    </div>
  );
};
