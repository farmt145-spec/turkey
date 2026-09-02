import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, AlertTriangle, DollarSign, Scale, Users, Zap } from 'lucide-react';

interface DashboardData {
  farmId: string;
  period: string;
  totalCosts: number;
  totalRevenue: number;
  totalMargin: number;
  ebitda: number;
  feedCost: number;
  energyCost: number;
  medicationCost: number;
  laborCost: number;
  activeBatches: number;
  birdsSold: number;
  totalWeightSold: number;
  avgPricePerKg: number;
  costBreakdown: Array<{ category: string; amount: number; percentage: number; trend: number }>;
  revenueTrend: Array<{ date: string; revenue: number; cost: number; margin: number }>;
}

const COLORS = ['#2563eb', '#dc2626', '#16a34a', '#9333ea', '#6b7280'];

export const FinancialDashboard: React.FC<{ farmId: string }> = ({ farmId }) => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [period, setPeriod] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY' | 'BATCH'>('DAILY');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, [farmId, period]);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/economics/dashboard?farmId=${farmId}&period=${period}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Failed to fetch dashboard', err);
    }
    setLoading(false);
  };

  if (loading || !data) {
    return <div className="p-8 text-center">Ładowanie dashboardu...</div>;
  }

  const marginPercent = data.totalRevenue > 0 ? (data.totalMargin / data.totalRevenue) * 100 : 0;

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Dashboard Finansowy</h1>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as any)}>
          <TabsList>
            <TabsTrigger value="DAILY">Dziś</TabsTrigger>
            <TabsTrigger value="WEEKLY">Tydzień</TabsTrigger>
            <TabsTrigger value="MONTHLY">Miesiąc</TabsTrigger>
            <TabsTrigger value="BATCH">Rzut</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Koszty całkowite</p>
                <p className="text-2xl font-bold">{data.totalCosts.toLocaleString('pl-PL')} PLN</p>
              </div>
              <DollarSign className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Przychody</p>
                <p className="text-2xl font-bold">{data.totalRevenue.toLocaleString('pl-PL')} PLN</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Marża / EBITDA</p>
                <p className="text-2xl font-bold">{data.totalMargin.toLocaleString('pl-PL')} PLN</p>
                <Badge variant={marginPercent > 10 ? 'default' : marginPercent > 0 ? 'secondary' : 'destructive'}>
                  {marginPercent.toFixed(1)}%
                </Badge>
              </div>
              <Scale className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Aktywne rzuty</p>
                <p className="text-2xl font-bold">{data.activeBatches}</p>
                <p className="text-xs text-muted-foreground">{data.birdsSold} szt. sprzedanych</p>
              </div>
              <Users className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Struktura kosztów</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.costBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ category, percentage }) => `${category}: ${percentage.toFixed(1)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="amount"
                  nameKey="category"
                >
                  {data.costBreakdown.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `${value.toLocaleString('pl-PL')} PLN`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Trend przychodów i kosztów (30 dni)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data.revenueTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} />
                <YAxis />
                <Tooltip formatter={(value: number) => `${value.toLocaleString('pl-PL')} PLN`} />
                <Legend />
                <Area type="monotone" dataKey="revenue" stackId="1" stroke="#16a34a" fill="#16a34a" fillOpacity={0.3} name="Przychód" />
                <Area type="monotone" dataKey="cost" stackId="2" stroke="#dc2626" fill="#dc2626" fillOpacity={0.3} name="Koszt" />
                <Area type="monotone" dataKey="margin" stackId="3" stroke="#2563eb" fill="#2563eb" fillOpacity={0.3} name="Marża" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Cost Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle>Szczegółowy rozkład kosztów</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Kategoria</th>
                  <th className="text-right py-3 px-4">Kwota (PLN)</th>
                  <th className="text-right py-3 px-4">% całości</th>
                  <th className="text-right py-3 px-4">Trend</th>
                </tr>
              </thead>
              <tbody>
                {data.costBreakdown.map((item) => (
                  <tr key={item.category} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-4 font-medium">{item.category}</td>
                    <td className="text-right py-3 px-4">{item.amount.toLocaleString('pl-PL')}</td>
                    <td className="text-right py-3 px-4">{item.percentage.toFixed(1)}%</td>
                    <td className="text-right py-3 px-4">
                      {item.trend > 0 ? (
                        <span className="text-red-500 flex items-center justify-end gap-1">
                          <TrendingUp className="h-4 w-4" /> +{item.trend.toFixed(1)}%
                        </span>
                      ) : item.trend < 0 ? (
                        <span className="text-green-500 flex items-center justify-end gap-1">
                          <TrendingDown className="h-4 w-4" /> {item.trend.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-gray-500">0%</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
