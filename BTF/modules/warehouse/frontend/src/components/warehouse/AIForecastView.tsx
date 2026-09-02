import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, AlertTriangle, Calendar, Truck, BrainCircuit } from 'lucide-react';

export const AIForecastView: React.FC = () => {
  const [productId, setProductId] = useState('');
  const [forecast, setForecast] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    const res = await fetch(`/api/warehouse/ai/analyze/${productId}`, { method: 'POST' });
    const data = await res.json();
    setForecast(data);
    setLoading(false);
  };

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold flex items-center gap-3">
        <BrainCircuit className="h-8 w-8" /> AI Prognozy Magazynowe
      </h1>

      <div className="flex gap-2">
        <Input placeholder="ID produktu..." value={productId} onChange={(e) => setProductId(e.target.value)} />
        <Button onClick={generate} disabled={loading || !productId}>
          {loading ? 'Analizuję...' : 'Generuj prognozę'}
        </Button>
      </div>

      {forecast && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Aktualny stan</p>
                <p className="text-2xl font-bold">{forecast.currentStock.toLocaleString('pl-PL')} kg</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Dni zapasu</p>
                <p className="text-2xl font-bold">{forecast.daysOfSupply}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Śr. dzienne zużycie</p>
                <p className="text-2xl font-bold">{forecast.avgDailyConsumption} kg</p>
              </CardContent>
            </Card>
          </div>

          <Card className={forecast.stockoutRisk > 50 ? 'border-red-500' : forecast.stockoutRisk > 20 ? 'border-orange-500' : 'border-green-500'}>
            <CardHeader><CardTitle>Prognoza AI</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="font-medium">Przewidywane wyczerpanie zapasów</p>
                  <p className="text-sm text-muted-foreground">
                    {forecast.predictedStockoutDate ? new Date(forecast.predictedStockoutDate).toLocaleDateString('pl-PL') : 'Nieznane'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Truck className="h-5 w-5 text-green-500" />
                <div>
                  <p className="font-medium">Rekomendowane zamówienie</p>
                  <p className="text-sm text-muted-foreground">
                    {forecast.recommendedOrderQty.toLocaleString('pl-PL')} kg do {forecast.recommendedOrderDate ? new Date(forecast.recommendedOrderDate).toLocaleDateString('pl-PL') : '—'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="font-medium">Najlepszy dostawca</p>
                  <p className="text-sm text-muted-foreground">{forecast.bestSupplierName || 'Brak danych'}</p>
                </div>
              </div>
              <div className="flex gap-4 mt-4">
                <div className="flex-1 p-3 bg-muted rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">Ryzyko braku</p>
                  <p className={`text-lg font-bold ${forecast.stockoutRisk > 50 ? 'text-red-600' : 'text-green-600'}`}>{forecast.stockoutRisk}%</p>
                </div>
                <div className="flex-1 p-3 bg-muted rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">Ryzyko przeterminowania</p>
                  <p className="text-lg font-bold">{forecast.expiryRisk}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
