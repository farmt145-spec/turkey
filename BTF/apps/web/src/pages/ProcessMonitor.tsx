import { useQuery } from 'react-query';
import { workflowApi } from '@/api/client';
import { WorkflowExecution } from '@/types';
import { CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react';

const statusConfig = {
  PENDING: { color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  RUNNING: { color: 'bg-blue-100 text-blue-700', icon: Loader2 },
  COMPLETED: { color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  FAILED: { color: 'bg-red-100 text-red-700', icon: XCircle },
  CANCELLED: { color: 'bg-gray-100 text-gray-600', icon: XCircle },
  RETRYING: { color: 'bg-orange-100 text-orange-700', icon: Loader2 },
};

export default function ProcessMonitor() {
  const { data, isLoading } = useQuery(
    'executions',
    () => workflowApi.getAll({ limit: 50 }),
    { refetchInterval: 5000 }
  );

  const workflows = (data as any)?.data || [];

  // Pobierz ostatnie wykonania ze wszystkich workflow
  const allExecutions: WorkflowExecution[] = workflows.flatMap(
    (wf: any) => wf.executions || []
  ).sort((a: WorkflowExecution, b: WorkflowExecution) =>
    new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  ).slice(0, 50);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Monitor Procesów</h2>
        <p className="text-gray-500 mt-1">Śledź wykonania workflow w czasie rzeczywistym</p>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Aktywne i ostatnie wykonania</h3>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 size={16} className="animate-spin" />
            Odświeżanie co 5s
          </div>
        </div>

        {isLoading ? (
          <p className="text-gray-400 py-8 text-center">Ładowanie...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Workflow</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Rozpoczęto</th>
                  <th className="px-4 py-3">Czas trwania</th>
                  <th className="px-4 py-3">Wynik</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {allExecutions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                      Brak wykonań do wyświetlenia
                    </td>
                  </tr>
                ) : (
                  allExecutions.map((ex) => {
                    const cfg = statusConfig[ex.status];
                    const Icon = cfg.icon;
                    return (
                      <tr key={ex.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-xs text-gray-600">
                          {ex.id.slice(0, 8)}...
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {workflows.find((w: any) => w.id === ex.workflowId)?.name || ex.workflowId}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                            <Icon size={12} />
                            {ex.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {new Date(ex.startedAt).toLocaleString('pl-PL')}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {ex.durationMs ? `${ex.durationMs} ms` : '-'}
                        </td>
                        <td className="px-4 py-3">
                          {ex.errorMessage ? (
                            <span className="text-red-600 text-xs" title={ex.errorMessage}>
                              Błąd: {ex.errorMessage.slice(0, 40)}...
                            </span>
                          ) : ex.status === 'COMPLETED' ? (
                            <span className="text-green-600 text-xs">Sukces</span>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
