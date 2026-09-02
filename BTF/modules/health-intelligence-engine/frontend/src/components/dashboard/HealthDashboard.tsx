import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { FarmMap } from './FarmMap';
import { RiskScoreCard } from './RiskScoreCard';
import { AlertBanner } from './AlertBanner';

export const HealthDashboard: React.FC = () => {
  const [selectedFlock, setSelectedFlock] = useState<string | null>(null);

  const { data: flocks, isLoading } = useQuery({
    queryKey: ['flocks-health'],
    queryFn: () => api.get('/health/dashboard').then(r => r.data)
  });

  const { data: alerts } = useQuery({
    queryKey: ['anomaly-alerts'],
    queryFn: () => api.get('/ai-detection/alerts').then(r => r.data),
    refetchInterval: 300000
  });

  if (isLoading) return <div className="p-8">Ładowanie danych...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Turkey Health Intelligence Engine</h1>
          <p className="text-slate-600 mt-2">System Wspomagania Decyzji Weterynaryjnych</p>
        </header>

        {alerts && alerts.length > 0 && (
          <div className="mb-6 space-y-3">
            {alerts.map((alert: any) => (
              <AlertBanner key={alert.flockId + alert.metric} alert={alert} />
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Mapa Fermy</h2>
            <FarmMap 
              flocks={flocks} 
              onSelectFlock={setSelectedFlock}
              selectedFlock={selectedFlock}
            />
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-4">
                Podsumowanie Stada
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Zdrowe rzuty</span>
                  <span className="font-semibold text-emerald-600">
                    {flocks?.filter((f: any) => f.status === 'HEALTHY').length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Pod obserwacją</span>
                  <span className="font-semibold text-amber-600">
                    {flocks?.filter((f: any) => f.status === 'WARNING').length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Alarmy</span>
                  <span className="font-semibold text-red-600">
                    {flocks?.filter((f: any) => f.status === 'CRITICAL').length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {selectedFlock && <FlockDetailPanel flockId={selectedFlock} />}
      </div>
    </div>
  );
};

const FlockDetailPanel: React.FC<{ flockId: string }> = ({ flockId }) => {
  const { data: flock } = useQuery({
    queryKey: ['flock', flockId],
    queryFn: () => api.get(`/flocks/${flockId}`).then(r => r.data)
  });

  const { data: riskScore } = useQuery({
    queryKey: ['risk-score', flockId],
    queryFn: () => api.get(`/risk-scores/${flockId}/latest`).then(r => r.data)
  });

  if (!flock) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            {flock.house?.name} — Rzut #{flock.id.slice(0, 8)}
          </h2>
          <p className="text-slate-500">Wiek: {flock.ageDays} dni | {flock.breed}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-white text-sm font-medium ${
          flock.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400'
        }`}>
          {flock.status}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <RiskScoreCard label="Zdrowie" score={riskScore?.healthScore || 0} color="emerald" />
        <RiskScoreCard label="Produkcja" score={riskScore?.productionScore || 0} color="blue" />
        <RiskScoreCard label="Ryzyko" score={riskScore?.riskScore || 0} color="red" inverse />
        <RiskScoreCard label="Dobrostan" score={riskScore?.welfareScore || 0} color="violet" />
      </div>

      <div className="flex gap-3">
        <a href={`/health-records?flock=${flockId}`}
          className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition">
          Pełna historia zdrowotna
        </a>
        <a href={`/ai-advisor?flock=${flockId}`}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
          AI Disease Advisor
        </a>
      </div>
    </div>
  );
};
