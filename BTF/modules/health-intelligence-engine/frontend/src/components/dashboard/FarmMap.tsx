import React from 'react';

interface FarmMapProps {
  flocks: any[];
  onSelectFlock: (id: string) => void;
  selectedFlock: string | null;
}

export const FarmMap: React.FC<FarmMapProps> = ({ flocks, onSelectFlock, selectedFlock }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {flocks?.map((flock) => (
        <button
          key={flock.id}
          onClick={() => onSelectFlock(flock.id)}
          className={`p-4 rounded-lg border-2 transition text-left ${
            selectedFlock === flock.id
              ? 'border-indigo-500 bg-indigo-50'
              : flock.status === 'HEALTHY'
              ? 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100'
              : flock.status === 'WARNING'
              ? 'border-amber-200 bg-amber-50 hover:bg-amber-100'
              : 'border-red-200 bg-red-50 hover:bg-red-100'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-3 h-3 rounded-full ${
              flock.status === 'HEALTHY' ? 'bg-emerald-500' :
              flock.status === 'WARNING' ? 'bg-amber-500' : 'bg-red-600'
            }`} />
            <span className="font-medium text-sm">{flock.houseName}</span>
          </div>
          <p className="text-xs text-slate-500">Wiek: {flock.ageDays} dni</p>
          <p className="text-xs text-slate-500">Ptaki: {flock.currentCount}</p>
        </button>
      ))}
    </div>
  );
};
