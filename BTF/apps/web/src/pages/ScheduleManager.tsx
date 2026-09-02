import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { schedulerApi } from '@/api/client';
import { ScheduledTask } from '@/types';
import { CalendarClock, Plus, Trash2, Clock, AlertCircle } from 'lucide-react';

export default function ScheduleManager() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    cronExpression: '',
    timezone: 'Europe/Warsaw',
    workflowId: '',
  });

  const { data, isLoading } = useQuery('schedules', schedulerApi.getAll, {
    refetchInterval: 60000,
  });

  const createMutation = useMutation(schedulerApi.create, {
    onSuccess: () => {
      queryClient.invalidateQueries('schedules');
      setShowForm(false);
      setFormData({ name: '', cronExpression: '', timezone: 'Europe/Warsaw', workflowId: '' });
    },
  });

  const deleteMutation = useMutation((id: string) => schedulerApi.delete(id), {
    onSuccess: () => queryClient.invalidateQueries('schedules'),
  });

  const schedules: ScheduledTask[] = (data as any) || [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Harmonogram Zadań</h2>
          <p className="text-gray-500 mt-1">Zarządzaj zaplanowanymi procesami automatycznymi</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary gap-2">
          <Plus size={18} /> Nowe zadanie CRON
        </button>
      </div>

      {showForm && (
        <div className="card border-t-4 border-turkey-500">
          <h3 className="text-lg font-semibold mb-4">Nowe zaplanowane zadanie</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nazwa</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input"
                placeholder="np. Raport dzienny"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CRON Expression</label>
              <input
                type="text"
                required
                value={formData.cronExpression}
                onChange={(e) => setFormData({ ...formData, cronExpression: e.target.value })}
                className="input font-mono"
                placeholder="0 8 * * *"
              />
              <p className="text-xs text-gray-400 mt-1">Format: min godz dzień mies dzień_tygodnia</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Strefa czasowa</label>
              <select
                value={formData.timezone}
                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                className="input"
              >
                <option value="Europe/Warsaw">Europe/Warsaw</option>
                <option value="UTC">UTC</option>
                <option value="Europe/Berlin">Europe/Berlin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Workflow ID (opcjonalnie)</label>
              <input
                type="text"
                value={formData.workflowId}
                onChange={(e) => setFormData({ ...formData, workflowId: e.target.value })}
                className="input"
                placeholder="UUID workflow"
              />
            </div>
            <div className="md:col-span-2 flex gap-3">
              <button type="submit" className="btn-primary">Zapisz</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
                Anuluj
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <p className="text-gray-400 col-span-full">Ładowanie...</p>
        ) : schedules.length === 0 ? (
          <p className="text-gray-400 col-span-full">Brak zaplanowanych zadań</p>
        ) : (
          schedules.map((task) => (
            <div key={task.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${task.isActive ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                    <CalendarClock size={20} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{task.name}</h4>
                    <p className="text-xs text-gray-500 font-mono mt-0.5">{task.cronExpression}</p>
                  </div>
                </div>
                <button
                  onClick={() => deleteMutation.mutate(task.id)}
                  className="text-gray-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock size={14} />
                  <span>Strefa: {task.timezone}</span>
                </div>
                {task.lastRunAt && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <AlertCircle size={14} />
                    <span>Ostatnie: {new Date(task.lastRunAt).toLocaleString('pl-PL')}</span>
                  </div>
                )}
                {task.nextRunAt && (
                  <div className="flex items-center gap-2 text-turkey-600">
                    <Clock size={14} />
                    <span>Następne: {new Date(task.nextRunAt).toLocaleString('pl-PL')}</span>
                  </div>
                )}
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
                  <span className="text-xs text-gray-500">
                    Uruchomień: <strong>{task.runCount}</strong>
                  </span>
                  {task.failCount > 0 && (
                    <span className="text-xs text-red-600">
                      Błędów: <strong>{task.failCount}</strong>
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
