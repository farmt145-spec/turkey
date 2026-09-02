import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';

interface ScenarioResult {
  id: string;
  name: string;
  predictedCost: number;
  predictedMargin: number;
  predictedProfit: number;
  predictedCostPerKg: number;
  impactOnProfit: number;
  createdAt: string;
}

export const ScenarioAnalyzer: React.FC<{ batchId: string }> = ({ batchId }) => {
  const [scenarios, setScenarios] = useState<ScenarioResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [params, setParams] = useState({
    name: '',
    feedPriceChange: 0,
    soyPriceChange: 0,
    fcrChange: 0,
    mortalityChange: 0,
    saleDelayDays: 0,
    gasPriceChange: 0,
  });

  const runScenario = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/economics/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchId,
          name: params.name || `Scenariusz ${scenarios.length + 1}`,
          paramFeedPriceChange: params.feedPriceChange || undefined,
          paramSoyPriceChange: params.soyPriceChange || undefined,
          paramFcrChange: params.fcrChange || undefined,
          paramMortalityChange: params.mortalityChange || undefined,
          paramSaleDelayDays: params.saleDelayDays || undefined,
          paramGasPriceChange: params.gasPriceChange || undefined,
        }),
      });
      const result = await res.json();
      setScenarios((prev) => [result, ...prev]);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const presets = [
    { name: 'Pasza +15%', feedPriceChange: 15 },
    { name: 'Soja -10%', soyPriceChange: -10 },
    { name: 'FCR +0.2', fcrChange: 0.2 },
    { name: 'Śmiertelność +2%', mortalityChange: 2 },
    { name: 'Sprzedaż +7 dni', saleDelayDays: 7 },
    { name: 'Gaz +20%', gasPriceChange: 20 },
  ];

  const applyPreset = (preset: typeof presets[0]) => {
    setParams({ ...params, name: preset.name, ...preset });
  };

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold">Analiza Scenariuszy "Co jeśli?"</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Parametry scenariusza</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {presets.map((p) => (
                <Button key={p.name} variant="outline" size="sm" onClick={() => applyPreset(p)}>
                  {p.name}
                </Button>
              ))}
            </div>

            <div className="space-y-2">
              <Label>Nazwa scenariusza</Label>
              <Input value={params.name} onChange={(e) => setParams({ ...params, name: e.target.value })} placeholder="Np. Wzrost ceny paszy" />
            </div>

            <div className="space-y-2">
              <Label>Zmiana ceny paszy (%)</Label>
              <div className="flex items-center gap-4">
                <Slider value={[params.feedPriceChange]} onValueChange={([v]) => setParams({ ...params, feedPriceChange: v })} min={-30} max={50} step={1} />
                <span className="w-16 text-right font-mono">{params.feedPriceChange}%</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Zmiana ceny soi (%)</Label>
              <div className="flex items-center gap-4">
                <Slider value={[params.soyPriceChange]} onValueChange={([v]) => setParams({ ...params, soyPriceChange: v })} min={-30} max={50} step={1} />
                <span className="w-16 text-right font-mono">{params.soyPriceChange}%</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Zmiana FCR</Label>
              <div className="flex items-center gap-4">
                <Slider value={[params.fcrChange]} onValueChange={([v]) => setParams({ ...params, fcrChange: v })} min={-0.5} max={0.5} step={0.05} />
                <span className="w-16 text-right font-mono">{params.fcrChange.toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Zmiana śmiertelności (%)</Label>
              <div className="flex items-center gap-4">
                <Slider value={[params.mortalityChange]} onValueChange={([v]) => setParams({ ...params, mortalityChange: v })} min={-5} max={10} step={0.5} />
                <span className="w-16 text-right font-mono">{params.mortalityChange}%</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Opóźnienie sprzedaży (dni)</Label>
              <div className="flex items-center gap-4">
                <Slider value={[params.saleDelayDays]} onValueChange={([v]) => setParams({ ...params, saleDelayDays: v })} min={-14} max={21} step={1} />
                <span className="w-16 text-right font-mono">{params.saleDelayDays}d</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Zmiana ceny gazu (%)</Label>
              <div className="flex items-center gap-4">
                <Slider value={[params.gasPriceChange]} onValueChange={([v]) => setParams({ ...params, gasPriceChange: v })} min={-30} max={50} step={1} />
                <span className="w-16 text-right font-mono">{params.gasPriceChange}%</span>
              </div>
            </div>

            <Button onClick={runScenario} disabled={loading} className="w-full">
              {loading ? 'Obliczanie...' : 'Uruchom analizę'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Wyniki scenariuszy</h2>
          {scenarios.length === 0 && (
            <Card className="bg-muted">
              <CardContent className="pt-6 text-center text-muted-foreground">
                <AlertCircle className="mx-auto h-8 w-8 mb-2" />
                <p>Brak scenariuszy. Ustaw parametry i kliknij "Uruchom analizę".</p>
              </CardContent>
            </Card>
          )}

          {scenarios.map((s) => (
            <Card key={s.id} className={s.impactOnProfit >= 0 ? 'border-green-500' : 'border-red-500'}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">{s.name}</CardTitle>
                  <Badge variant={s.impactOnProfit >= 0 ? 'default' : 'destructive'}>
                    {s.impactOnProfit >= 0 ? '+' : ''}{s.impactOnProfit.toLocaleString('pl-PL')} PLN
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Przewidywany koszt</p>
                    <p className="font-semibold">{s.predictedCost.toLocaleString('pl-PL')} PLN</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Przewidywany zysk</p>
                    <p className="font-semibold">{s.predictedProfit.toLocaleString('pl-PL')} PLN</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Marża</p>
                    <p className="font-semibold">{s.predictedMargin.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Koszt/kg</p>
                    <p className="font-semibold">{s.predictedCostPerKg.toFixed(2)} PLN</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
