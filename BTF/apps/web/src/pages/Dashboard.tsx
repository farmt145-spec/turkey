import { useEffect } from 'react';
import { useQuery } from 'react-query';
import {
  Activity,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Calendar,
  Bell,
  Zap,
  TrendingUp,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { dashboardApi } from '@/api/client';
import { useDashboardStore } from '@/store/dashboardStore';

const StatCard = ({
  title,
  value,
  icon: Icon,
  color,
  subtitle,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  subtitle?: string;
}) => (
  <div className="card">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      </div>
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon size={24} className="text-white" />
      </div>
    </div>
  </div>
);

export default function Dashboard() {
  const { stats, history, moduleMap, setStats, setHistory, setModuleMap } = useDashboardStore();

  const { data: statsData } = useQuery('dashboardStats', dashboardApi.getStats, {
    refetchInterval: 30000,
    onSuccess: setStats,
  });

  const { data: historyData } = useQuery('executionHistory', () => dashboardApi.getHistory(7), {
    onSuccess: setHistory,
  });

  const { data: mapData } = useQuery('moduleMap', dashboardApi.getModuleMap, {
    onSuccess: setModuleMap,
  });

  useEffect(() => {
    if (statsData) setStats(statsData as any);
    if (historyData) setHistory(historyData as any);
    if (mapData) setModuleMap(mapData as any);
  }, [statsData, historyData, mapData]);

  const s = stats;

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Aktywne Workflow"
          value={s?.activeWorkflows ?? '-'}
          icon={Zap}
          color="bg-blue-500"
          subtitle="Automatyzacje włączone"
        />
        <StatCard
          title="Wykonania dziś"
          value={s?.totalExecutionsToday ?? '-'}
          icon={Activity}
          color="bg-green-500"
          subtitle="Liczba uruchomień"
        />
        <StatCard
          title="Skuteczność"
          value={`${s?.successRate ?? '-'}%`}
          icon={CheckCircle2}
          color="bg-turkey-500"
          subtitle="Ostatnie 7 dni"
        />
        <StatCard
          title="Śr. czas reakcji"
          value={`${s?.avgResponseTime ?? '-'} ms`}
          icon={Clock}
          color="bg-purple-500"
          subtitle="Od trigger do akcji"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Zadania oczekujące"
          value={s?.pendingTasks ?? '-'}
          icon={Calendar}
          color="bg-yellow-500"
        />
        <StatCard
          title="Nieprzeczytane"
          value={s?.unreadNotifications ?? '-'}
          icon={Bell}
          color="bg-red-500"
        />
        <StatCard
          title="Aktywne harmonogramy"
          value={s?.activeSchedules ?? '-'}
          icon={TrendingUp}
          color="bg-indigo-500"
        />
        <StatCard
          title="Błędy Event Bus"
          value={s?.failedEvents ?? '-'}
          icon={AlertTriangle}
          color="bg-orange-500"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Historia wykonań workflow (7 dni)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={history}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="success" fill="#10b981" name="Sukces" />
              <Bar dataKey="failed" fill="#ef4444" name="Błąd" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Mapa zależności modułów
          </h3>
          <div className="h-[300px] relative bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
            <svg width="100%" height="100%" viewBox="0 0 600 300">
              {moduleMap?.links.map((link, i) => {
                const src = moduleMap.nodes.find((n) => n.id === link.source);
                const tgt = moduleMap.nodes.find((n) => n.id === link.target);
                if (!src || !tgt) return null;
                const sx = 50 + (src.id % 5) * 120;
                const sy = 50 + Math.floor(src.id / 5) * 100;
                const tx = 50 + (tgt.id % 5) * 120;
                const ty = 50 + Math.floor(tgt.id / 5) * 100;
                return (
                  <g key={i}>
                    <line
                      x1={sx}
                      y1={sy}
                      x2={tx}
                      y2={ty}
                      stroke="#94a3b8"
                      strokeWidth={1.5}
                      markerEnd="url(#arrow)"
                    />
                  </g>
                );
              })}
              <defs>
                <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
                  <path d="M0,0 L0,6 L9,3 z" fill="#94a3b8" />
                </marker>
              </defs>
              {moduleMap?.nodes.map((node) => {
                const x = 50 + (node.id % 5) * 120;
                const y = 50 + Math.floor(node.id / 5) * 100;
                return (
                  <g key={node.id}>
                    <circle cx={x} cy={y} r={28} fill="#8b0000" />
                    <text x={x} y={y + 4} textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">
                      {node.label.slice(0, 3)}
                    </text>
                    <text x={x} y={y + 45} textAnchor="middle" fill="#374151" fontSize="9">
                      {node.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
