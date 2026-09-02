import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Calendar, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import { pl } from 'date-fns/locale';

export const VaccinationCalendar: React.FC<{ flockId?: string }> = ({ flockId }) => {
  const queryClient = useQueryClient();

  const { data: vaccinations } = useQuery({
    queryKey: ['vaccinations', flockId],
    queryFn: () => api.get(`/vaccinations${flockId ? `?flockId=${flockId}` : ''}`).then(r => r.data)
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      api.patch(`/vaccinations/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vaccinations'] })
  });

  const getStatusIcon = (status: string, date: string) => {
    if (status === 'COMPLETED') return <CheckCircle className="w-5 h-5 text-emerald-500" />;
    if (status === 'OVERDUE' || (status === 'SCHEDULED' && isPast(new Date(date)) && !isToday(new Date(date)))) {
      return <AlertCircle className="w-5 h-5 text-red-500" />;
    }
    if (isToday(new Date(date))) return <Clock className="w-5 h-5 text-amber-500" />;
    return <Calendar className="w-5 h-5 text-slate-400" />;
  };

  const getStatusClass = (status: string, date: string) => {
    if (status === 'COMPLETED') return 'bg-emerald-50 border-emerald-200';
    if (status === 'OVERDUE' || (status === 'SCHEDULED' && isPast(new Date(date)) && !isToday(new Date(date)))) {
      return 'bg-red-50 border-red-200';
    }
    if (isToday(new Date(date))) return 'bg-amber-50 border-amber-200';
    return 'bg-white border-slate-200';
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Calendar className="w-6 h-6 text-indigo-600" />
          <h2 className="text-xl font-bold text-slate-900">Harmonogram Szczepień</h2>
        </div>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition">
          + Nowy program
        </button>
      </div>

      <div className="space-y-3">
        {vaccinations?.map((v: any) => (
          <div 
            key={v.id} 
            className={`flex items-center justify-between p-4 rounded-lg border ${getStatusClass(v.status, v.scheduledDate)} transition hover:shadow-sm`}
          >
            <div className="flex items-center gap-4">
              {getStatusIcon(v.status, v.scheduledDate)}
              <div>
                <h4 className="font-medium text-slate-900">{v.vaccineName}</h4>
                <p className="text-sm text-slate-500">
                  {v.flock?.house?.name} — Wiek: {v.ageDays} dni
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {format(new Date(v.scheduledDate), 'dd MMMM yyyy', { locale: pl })}
                  {' • '}
                  Droga: {v.route === 'DRINKING_WATER' ? 'Woda do picia' :
                    v.route === 'SPRAY' ? 'Aerozol' :
                    v.route === 'INJECTION_IM' ? 'i.m.' :
                    v.route === 'INJECTION_SC' ? 's.c.' :
                    v.route === 'EYE_DROP' ? 'Kropla do oka' :
                    v.route === 'WING_WEB' ? 'Skrzydło' : v.route}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {v.status === 'SCHEDULED' && (
                <button
                  onClick={() => updateMutation.mutate({ 
                    id: v.id, 
                    data: { status: 'COMPLETED', executedDate: new Date().toISOString() } 
                  })}
                  className="px-3 py-1.5 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 transition"
                >
                  Wykonano
                </button>
              )}
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                v.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                v.status === 'OVERDUE' ? 'bg-red-100 text-red-700' :
                'bg-slate-100 text-slate-600'
              }`}>
                {v.status === 'SCHEDULED' ? 'Zaplanowane' :
                 v.status === 'COMPLETED' ? 'Wykonane' :
                 v.status === 'OVERDUE' ? 'Zaległe' : 'Anulowane'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {vaccinations?.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Brak zaplanowanych szczepień</p>
        </div>
      )}
    </div>
  );
};
