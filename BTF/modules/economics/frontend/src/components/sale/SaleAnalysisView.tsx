import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar, Truck, FileText, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface SaleRecord {
  id: string;
  date: string;
  contractorName: string;
  birdsCount: number;
  totalWeightKg: number;
  avgWeightKg: number;
  pricePerKg: number;
  totalRevenue: number;
  qualityGrade: string;
  margin: number;
}

interface SaleAnalysis {
  batchId: string;
  optimalSaleDate: string;
  delayImpactPerDay: number;
  predictedRevenue: number;
  bestContractor: string;
  priceTrend: 'rising' | 'falling' | 'stable';
  recommendedAction: string;
}

export const SaleAnalysisView: React.FC<{ batchId: string }> = ({ batchId }) => {
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [analysis, setAnalysis] = useState<SaleAnalysis | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    contractorId: '',
    contractorName: '',
    birdsCount: 0,
    totalWeightKg: 0,
    avgWeightKg: 0,
    pricePerKg: 0,
    qualityGrade: '',
    documentNumber: '',
    transportCost: 0,
    slaughterCost: 0,
  });

  useEffect(() => {
    fetchAnalysis();
  }, [batchId]);

  const fetchAnalysis = async () => {
    try {
      const res = await fetch(`/api/economics/sales/analysis/${batchId}`);
      const json = await res.json();
      setAnalysis(json);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('/api/economics/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchId,
          date: new Date().toISOString(),
          ...formData,
        }),
      });
      setShowForm(false);
      fetchAnalysis();
    } catch (err) {
      console.error(err);
    }
  };

  const priceProjection = [
    { day: 'Dziś', price: 12.50, cost: 11.20 },
    { day: '+3 dni', price: 12.65, cost: 11.35 },
    { day: '+7 dni', price: 12.80, cost: 11.55 },
    { day: '+10 dni', price: 12.75, cost: 11.70 },
    { day: '+14 dni', price: 12.60, cost: 11.90 },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Analiza Sprzedaży</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Anuluj' : 'Dodaj sprzedaż'}
        </Button>
      </div>

      {analysis && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className={analysis.priceTrend === 'rising' ? 'border-green-500' : analysis.priceTrend === 'falling' ? 'border-red-500' : ''}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-5 w-5" />
                <p className="text-sm text-muted-foreground">Optymalna data sprzedaży</p>
              </div>
              <p className="text-xl font-bold">{new Date(analysis.optimalSaleDate).toLocaleDateString('pl-PL')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <Truck className="h-5 w-5" />
                <p className="text-sm text-muted-foreground">Wpływ opóźnienia / dzień</p>
              </div>
              <p className={`text-xl font-bold ${analysis.delayImpactPerDay >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {analysis.delayImpactPerDay >= 0 ? '+' : ''}{analysis.delayImpactPerDay.toLocaleString('pl-PL')} PLN
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-5 w-5" />
                <p className="text-sm text-muted-foreground">Przewidywany przychód</p>
              </div>
              <p className="text-xl font-bold">{analysis.predictedRevenue.toLocaleString('pl-PL')} PLN</p>
            </CardContent>
          </Card>
        </div>
      )}

      {analysis && (
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-6 w-6 text-blue-500 mt-0.5" />
              <div>
                <p className="font-semibold">Rekomendacja AI</p>
                <p className="text-muted-foreground">{analysis.recommendedAction}</p>
                <p className="text-sm text-muted-foreground mt-1">Najlepszy kontrahent: <strong>{analysis.bestContractor}</strong></p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Prognoza cen i kosztów w czasie</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={priceProjection}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis domain={['dataMin - 0.5', 'dataMax + 0.5']} />
              <Tooltip formatter={(value: number) => `${value.toFixed(2)} PLN`} />
              <ReferenceLine x="Dziś" stroke="#666" strokeDasharray="3 3" />
              <Line type="monotone" dataKey="price" stroke="#16a34a" strokeWidth={2} name="Cena rynkowa" />
              <Line type="monotone" dataKey="cost" stroke="#dc2626" strokeWidth={2} name="Koszt produkcji" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Nowa sprzedaż</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Kontrahent</Label>
                <Input value={formData.contractorName} onChange={(e) => setFormData({ ...formData, contractorName: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Liczba sztuk</Label>
                <Input type="number" value={formData.birdsCount} onChange={(e) => setFormData({ ...formData, birdsCount: Number(e.target.value) })} required />
              </div>
              <div className="space-y-2">
                <Label>Waga całkowita (kg)</Label>
                <Input type="number" step="0.01" value={formData.totalWeightKg} onChange={(e) => setFormData({ ...formData, totalWeightKg: Number(e.target.value) })} required />
              </div>
              <div className="space-y-2">
                <Label>Cena za kg (PLN)</Label>
                <Input type="number" step="0.01" value={formData.pricePerKg} onChange={(e) => setFormData({ ...formData, pricePerKg: Number(e.target.value) })} required />
              </div>
              <div className="space-y-2">
                <Label>Klasa jakości</Label>
                <Input value={formData.qualityGrade} onChange={(e) => setFormData({ ...formData, qualityGrade: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Nr dokumentu</Label>
                <Input value={formData.documentNumber} onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <Button type="submit" className="w-full">Zapisz sprzedaż</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
