import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, Bell, Zap } from 'lucide-react';

const severityConfig: Record<string, { color: string; bg: string; icon: any }> = {
  EMERGENCY: { color: 'text-red-700', bg: 'bg-red-100', icon: Zap },
  CRITICAL: { color: 'text-red-600', bg: 'bg-red-50', icon: AlertTriangle },
  WARNING: { color: 'text-orange-600', bg: 'bg-orange-50', icon: AlertTriangle },
  INFO: { color: 'text-blue-600', bg: 'bg-blue-50', icon: Bell },
};

export const AlertsView: React.FC<{ organizationId: string }> = ({ organizationId }) => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'resolved'>('active');

  useEffect(() => {
    fetchAlerts();
  }, [organizationId, filter]);

  const fetchAlerts = () => {
    const q = filter === 'resolved' ? '?isResolved=true' : filter === 'active' ? '?isResolved=false' : '';
    fetch(`/api/warehouse/alerts${q}`)
      .then((r) => r.json())
      .then((d) => setAlerts(d));
  };

  const resolveAlert = async (id: string) => {
    await fetch('/api/warehouse/alerts/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alertId: id }),
    });
    fetchAlerts();
  };

  const runScan = async () => {
    await fetch(`/api/warehouse/alerts/scan/${organizationId}`, { method: 'POST' });
    fetchAlerts();
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Inteligentne Alarmy Magazynowe</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setFilter('all')}>Wszystkie</Button>
          <Button variant="outline" onClick={() => setFilter('active')}>Aktywne</Button>
          <Button variant="outline" onClick={() => setFilter('resolved')}>Rozwiązane</Button>
          <Button onClick={runScan}><Zap className="mr-2 h-4 w-4" /> Skan AI</Button>
        </div>
      </div>

      <div className="space-y-3">
        {alerts.length === 0 && (
          <Card className="bg-muted">
            <CardContent className="pt-6 text-center text-muted-foreground">
              <Bell className="mx-auto h-8 w-8 mb-2" />
              <p>Brak alarmów w wybranej kategorii.</p>
            </CardContent>
          </Card>
        )}

        {alerts.map((alert) => {
          const config = severityConfig[alert.severity] || severityConfig.INFO;
          const Icon = config.icon;
          return (
            <Card key={alert.id} className={alert.severity === 'EMERGENCY' || alert.severity === 'CRITICAL' ? 'border-red-500' : ''}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-lg ${config.bg}`}>
                    <Icon className={`h-5 w-5 ${config.color}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={alert.severity === 'EMERGENCY' || alert.severity === 'CRITICAL' ? 'destructive' : 'secondary'}>
                        {alert.severity}
                      </Badge>
                      <Badge variant="outline">{alert.type}</Badge>
                      <span className="text-xs text-muted-foreground">{new Date(alert.createdAt).toLocaleString('pl-PL')}</span>
                    </div>
                    <p className="font-medium">{alert.message}</p>
                    {alert.details && (
                      <p className="text-sm text-muted-foreground mt-1">{JSON.stringify(alert.details)}</p>
                    )}
                  </div>
                  {!alert.isResolved && (
                    <Button size="sm" variant="outline" onClick={() => resolveAlert(alert.id)}>
                      <CheckCircle className="h-4 w-4 mr-1" /> Rozwiąż
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
