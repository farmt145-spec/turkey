import React from 'react';
import { useDashboardStore } from '../../store/dashboardStore';
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';

export const RecentAlarms: React.FC = () => {
  const alarms = useDashboardStore((state) => state.overview?.recentAlarms);
  const getSeverityColor = (s: string) => {
    switch (s) { case 'EMERGENCY': return 'bg-red-100 text-red-800 border-red-200'; case 'CRITICAL': return 'bg-orange-100 text-orange-800 border-orange-200'; case 'WARNING': return 'bg-yellow-100 text-yellow-800 border-yellow-200'; default: return 'bg-blue-100 text-blue-800 border-blue-200'; }
  };
  const getSeverityIcon = (s: string) => (s === 'EMERGENCY' || s === 'CRITICAL') ? <AlertTriangle className="w-4 h-4" /> : <Clock className="w-4 h-4" />;
  if (!alarms || alarms.length === 0) return (
    <div className="bg-white rounded-xl p-6 border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Ostatnie Alarmy</h3>
      <div className="flex items-center justify-center py-8 text-gray-400"><CheckCircle className="w-5 h-5 mr-2" />Brak aktywnych alarmów</div>
    </div>
  );
  return (
    <div className="bg-white rounded-xl p-6 border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Ostatnie Alarmy</h3>
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {alarms.map((alarm) => (
          <div key={alarm.id} className={`flex items-start space-x-3 p-3 rounded-lg border ${getSeverityColor(alarm.severity)}`}>
            {getSeverityIcon(alarm.severity)}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{alarm.message}</p>
              <div className="flex items-center mt-1 text-xs opacity-75">
                <span>{alarm.device?.name || 'System'}</span><span className="mx-2">•</span>
                <span>{formatDistanceToNow(new Date(alarm.createdAt), { locale: pl, addSuffix: true })}</span>
              </div>
            </div>
            {!alarm.isAcknowledged && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-white bg-opacity-50">NOWY</span>}
          </div>
        ))}
      </div>
    </div>
  );
};
