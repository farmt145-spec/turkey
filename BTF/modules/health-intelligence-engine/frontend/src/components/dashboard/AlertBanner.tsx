import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface AlertBannerProps {
  alert: any;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({ alert }) => {
  const severityColors = {
    LOW: 'bg-blue-50 border-blue-200 text-blue-800',
    MEDIUM: 'bg-amber-50 border-amber-200 text-amber-800',
    HIGH: 'bg-orange-50 border-orange-200 text-orange-800',
    CRITICAL: 'bg-red-50 border-red-200 text-red-800',
  };

  return (
    <div className={`p-4 rounded-lg border flex items-start gap-3 ${severityColors[alert.severity]}`}>
      <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="font-medium">{alert.message}</p>
        <p className="text-sm opacity-80 mt-1">{alert.recommendedAction}</p>
      </div>
      <span className="text-xs font-bold uppercase px-2 py-1 rounded bg-white/50">
        {alert.severity}
      </span>
    </div>
  );
};
