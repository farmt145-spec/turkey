import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Shield, Lock, Unlock, AlertTriangle, Clock } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { pl } from 'date-fns/locale';

export const WithdrawalTracker: React.FC<{ flockId: string }> = ({ flockId }) => {
  const { data: withdrawals } = useQuery({
    queryKey: ['withdrawals', flockId],
    queryFn: () => api.get(`/withdrawals?flockId=${flockId}`).then(r => r.data)
  });

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-6 h-6 text-indigo-600" />
        <div>
          <h2 className="text-xl font-bold text-slate-900">Kontrola Karencji</h2>
          <p className="text-sm text-slate-500">Automatyczne wyliczanie okresów wycofania</p>
        </div>
      </div>

      <div className="space-y-3">
        {withdrawals?.map((w: any) => {
          const daysRemaining = differenceInDays(new Date(w.endDate), new Date());
          const isActive = w.isActive && daysRemaining > 0;

          return (
            <div key={w.id} className={`p-4 rounded-lg border ${
              isActive ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isActive ? <Lock className="w-5 h-5 text-red-500" /> : <Unlock className="w-5 h-5 text-emerald-500" />}
                  <div>
                    <h4 className="font-medium text-slate-900">{w.substanceName}</h4>
                    <p className="text-sm text-slate-500">
                      Od {format(new Date(w.startDate), 'dd MMMM yyyy', { locale: pl })}
                      {' do '}
                      {format(new Date(w.endDate), 'dd MMMM yyyy', { locale: pl })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  {isActive ? (
                    <div className="flex items-center gap-2 text-red-700">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="font-bold">{daysRemaining} dni</span>
                    </div>
                  ) : (
                    <span className="text-emerald-700 font-medium">Karencja zakończona</span>
                  )}
                </div>
              </div>
              {isActive && (
                <div className="mt-3 p-3 bg-red-100 rounded text-sm text-red-800 flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  SPRZEDAŻ ZABLOKOWANA — Stado nie może być skierowane do uboju do zakończenia okresu karencji.
                </div>
              )}
            </div>
          );
        })}
      </div>

      {withdrawals?.length === 0 && (
        <div className="text-center py-8 text-slate-400">
          <Clock className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p>Brak aktywnych okresów karencji</p>
        </div>
      )}
    </div>
  );
};
