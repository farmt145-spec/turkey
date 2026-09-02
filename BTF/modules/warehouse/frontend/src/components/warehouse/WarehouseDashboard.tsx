import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Package, TrendingDown, DollarSign, ArrowRightLeft, Bell } from 'lucide-react';

export const WarehouseDashboard: React.FC<{ organizationId: string }> = ({ organizationId }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/warehouse/dashboard/${organizationId}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [organizationId]);

  if (loading || !data) return <div className="p-8 text-center">Ładowanie magazynu...</div>;

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold">Dashboard Magazynu</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Produkty</p>
                <p className="text-2xl font-bold">{data.totalProducts}</p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Aktywne partie</p>
                <p className="text-2xl font-bold">{data.activeLots}</p>
              </div>
              <Package className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Wartość magazynu</p>
                <p className="text-2xl font-bold">{data.totalInventoryValue.toLocaleString('pl-PL')} PLN</p>
              </div>
              <DollarSign className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Alarmy</p>
                <p className="text-2xl font-bold">{data.activeAlerts}</p>
                {data.lowStockItems > 0 && <Badge variant="destructive">{data.lowStockItems} niski stan</Badge>}
              </div>
              <Bell className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Top zużycie (90 dni)</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.topConsumed.map((item: any, i: number) => (
                <div key={i} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                  <span className="font-medium">{item.name}</span>
                  <span className="font-mono">{item.quantity.toLocaleString('pl-PL')} kg</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <button className="w-full p-3 text-left border rounded-lg hover:bg-muted flex items-center gap-3">
              <ArrowRightLeft className="h-5 w-5" /> Nowy transfer
            </button>
            <button className="w-full p-3 text-left border rounded-lg hover:bg-muted flex items-center gap-3">
              <Package className="h-5 w-5" /> Przyjęcie towaru (PZ)
            </button>
            <button className="w-full p-3 text-left border rounded-lg hover:bg-muted flex items-center gap-3">
              <TrendingDown className="h-5 w-5" /> Wydanie (WZ)
            </button>
            <button className="w-full p-3 text-left border rounded-lg hover:bg-muted flex items-center gap-3">
              <AlertTriangle className="h-5 w-5" /> Skan alarmów
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
