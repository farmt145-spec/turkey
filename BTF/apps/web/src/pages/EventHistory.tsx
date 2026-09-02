import { useState } from 'react';
import { useQuery } from 'react-query';
import { EventLog } from '@/types';
import { Search } from 'lucide-react';

const sourceModuleColors: Record<string, string> = {
  IOT: 'bg-blue-100 text-blue-700',
  HEALTH: 'bg-red-100 text-red-700',
  FEEDING: 'bg-green-100 text-green-700',
  WAREHOUSE: 'bg-yellow-100 text-yellow-700',
  PRODUCTION: 'bg-purple-100 text-purple-700',
  ECONOMY: 'bg-indigo-100 text-indigo-700',
  SYSTEM: 'bg-gray-100 text-gray-700',
};

export default function EventHistory() {
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // W rzeczywistej aplikacji endpoint GET /events
  const { data, isLoading } = useQuery(
    'events',
    () => fetch('/api/v1/events').then((r) => r.json()),
    { refetchInterval: 10000 }
  );

  const events: EventLog[] = (data as any)?.data || [];

  const filtered = events.filter((e) => {
    const matchesFilter =
      !filter ||
      e.eventType.toLowerCase().includes(filter.toLowerCase()) ||
      e.correlationId.includes(filter);
    const matchesStatus = !statusFilter || e.status === statusFilter;
    return matchesFilter && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Historia Zdarzeń</h2>
        <p className="text-gray-500 mt-1">Pełny log zdarzeń z Event Bus</p>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Szukaj po typie lub correlation ID..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="input pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input w-48"
        >
          <option value="">Wszystkie statusy</option>
          <option value="PENDING">PENDING</option>
          <option value="PROCESSING">PROCESSING</option>
          <option value="PROCESSED">PROCESSED</option>
          <option value="FAILED">FAILED</option>
        </select>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50">
              <tr>
                <th className="px-4 py-3">Czas</th>
                <th className="px-4 py-3">Typ zdarzenia</th>
                <th className="px-4 py-3">Moduł</th>
                <th className="px-4 py-3">Correlation ID</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-400">Ładowanie...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-400">Brak zdarzeń</td></tr>
              ) : (
                filtered.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {new Date(event.createdAt).toLocaleString('pl-PL')}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{event.eventType}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${sourceModuleColors[event.sourceModule] || 'bg-gray-100'}`}>
                        {event.sourceModule}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">
                      {event.correlationId.slice(0, 16)}...
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        event.status === 'PROCESSED' ? 'bg-green-100 text-green-700' :
                        event.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {event.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <pre className="text-xs text-gray-500 bg-gray-50 p-2 rounded max-w-xs overflow-auto">
                        {JSON.stringify(event.payload).slice(0, 100)}...
                      </pre>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
