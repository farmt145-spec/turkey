import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Pill, Syringe, DollarSign, User, CalendarDays } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

interface TreatmentForm {
  productName: string;
  manufacturer: string;
  activeSubstance: string;
  dose: string;
  route: string;
  startDate: string;
  endDate?: string;
  withdrawalDays: number;
  cost?: number;
  performedBy: string;
}

export const TreatmentManager: React.FC<{ flockId: string }> = ({ flockId }) => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<TreatmentForm>>({});

  const { data: treatments } = useQuery({
    queryKey: ['treatments', flockId],
    queryFn: () => api.get(`/treatments?flockId=${flockId}`).then(r => r.data)
  });

  const createMutation = useMutation({
    mutationFn: (data: TreatmentForm) => api.post('/treatments', { ...data, flockId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treatments'] });
      setShowForm(false);
      setForm({});
    }
  });

  const routes = [
    { value: 'DRINKING_WATER', label: 'Woda do picia' },
    { value: 'SPRAY', label: 'Aerozol' },
    { value: 'INJECTION_IM', label: 'Wstrzyknięcie domięśniowe' },
    { value: 'INJECTION_SC', label: 'Wstrzyknięcie podskórne' },
    { value: 'EYE_DROP', label: 'Kropla do oka' },
    { value: 'WING_WEB', label: 'Skrzydło' },
  ];

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Syringe className="w-6 h-6 text-indigo-600" />
          <h2 className="text-xl font-bold text-slate-900">Leczenie</h2>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition"
        >
          {showForm ? 'Anuluj' : '+ Nowe leczenie'}
        </button>
      </div>

      {showForm && (
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate(form as TreatmentForm);
          }}
          className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Preparat</label>
            <input required value={form.productName || ''} onChange={e => setForm({...form, productName: e.target.value})}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Producent</label>
            <input required value={form.manufacturer || ''} onChange={e => setForm({...form, manufacturer: e.target.value})}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Substancja czynna</label>
            <input required value={form.activeSubstance || ''} onChange={e => setForm({...form, activeSubstance: e.target.value})}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Dawka</label>
            <input required value={form.dose || ''} onChange={e => setForm({...form, dose: e.target.value})}
              placeholder="np. 1 ml / 10 kg mc"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Droga podania</label>
            <select required value={form.route || ''} onChange={e => setForm({...form, route: e.target.value})}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
              <option value="">Wybierz...</option>
              {routes.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Okres karencji (dni)</label>
            <input type="number" required value={form.withdrawalDays || ''} onChange={e => setForm({...form, withdrawalDays: parseInt(e.target.value)})}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Data rozpoczęcia</label>
            <input type="date" required value={form.startDate || ''} onChange={e => setForm({...form, startDate: e.target.value})}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Data zakończenia</label>
            <input type="date" value={form.endDate || ''} onChange={e => setForm({...form, endDate: e.target.value})}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Koszt (PLN)</label>
            <input type="number" step="0.01" value={form.cost || ''} onChange={e => setForm({...form, cost: parseFloat(e.target.value)})}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Osoba wykonująca</label>
            <input required value={form.performedBy || ''} onChange={e => setForm({...form, performedBy: e.target.value})}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="md:col-span-2">
            <button type="submit" disabled={createMutation.isPending}
              className="w-full py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:bg-slate-300 transition">
              {createMutation.isPending ? 'Zapisywanie...' : 'Zapisz leczenie'}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {treatments?.map((t: any) => (
          <div key={t.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-indigo-50 rounded-lg">
                <Pill className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h4 className="font-medium text-slate-900">{t.productName}</h4>
                <p className="text-sm text-slate-500">{t.manufacturer} • {t.activeSubstance}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                  <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" /> 
                    {format(new Date(t.startDate), 'dd.MM.yyyy')} 
                    {t.endDate && ` - ${format(new Date(t.endDate), 'dd.MM.yyyy')}`}
                  </span>
                  <span className="flex items-center gap-1"><User className="w-3 h-3" /> {t.performedBy}</span>
                  {t.cost && <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> {t.cost} PLN</span>}
                </div>
              </div>
            </div>
            <div className="text-right">
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                t.aiRecommended ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'
              }`}>
                {t.aiRecommended ? 'AI Rekomendacja' : 'Ręczne'}
              </span>
              {t.effectiveness && (
                <p className="text-xs text-slate-500 mt-1">Skuteczność: {t.effectiveness}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
