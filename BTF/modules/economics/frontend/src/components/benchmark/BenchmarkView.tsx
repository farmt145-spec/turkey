import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, Trophy } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface BenchmarkEntry {
  id: string;
  name: string;
  value: number;
  rank: number;
  percentile: number;
  trend: 'up' | 'down' | 'stable';
}

export const BenchmarkView: React.FC<{ farmId: string }> = ({ farmId }) => {
  const [dimension, setDimension] = useState('BATCH');
  const [metric, setMetric] = useState('costPerKg');
  const [data, setData] = useState<BenchmarkEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBenchmarks();
  }, [farmId, dimension, metric]);

  const fetchBenchmarks = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/economics/benchmarks?farmId=${farmId}&dimension=${dimension}&metric=${metric}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'up') return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend === 'down') return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const getMetricLabel = (m: string) => {
    const labels: Record<string, string> = {
      fcr: 'FCR',
      adg: 'ADG (g/dzień)',
      epef: 'EPEF',
      costPerKg: 'Koszt/kg (PLN)',
      feedCostPerKg: 'Koszt paszy/kg',
      mortalityRate: 'Śmiertelność (%)',
      margin: 'Marża (PLN)',
      profit: 'Zysk (PLN)',
    };
    return labels[m] || m;
  };

  const colors = ['#2563eb', '#dc2626', '#16a34a', '#9333ea', '#6b7280'];

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold">Benchmarking Ferm</h1>

      <div className="flex gap-4">
        <Select value={dimension} onValueChange={setDimension}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Wymiar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="FARM">Ferma</SelectItem>
            <SelectItem value="HOUSE">Kurnik</SelectItem>
            <SelectItem value="BATCH">Rzut</SelectItem>
            <SelectItem value="RECIPE">Receptura</SelectItem>
          </SelectContent>
        </Select>

        <Select value={metric} onValueChange={setMetric}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Metryka" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fcr">FCR</SelectItem>
            <SelectItem value="adg">ADG</SelectItem>
            <SelectItem value="epef">EPEF</SelectItem>
            <SelectItem value="costPerKg">Koszt/kg</SelectItem>
            <SelectItem value="feedCostPerKg">Koszt paszy/kg</SelectItem>
            <SelectItem value="mortalityRate">Śmiertelność</SelectItem>
            <SelectItem value="margin">Marża</SelectItem>
            <SelectItem value="profit">Zysk</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Ranking - {getMetricLabel(metric)}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={data.slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={120} />
                <Tooltip />
                <Bar dataKey="value" name={getMetricLabel(metric)}>
                  {data.slice(0, 10).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Szczegóły rankingu</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Nazwa</TableHead>
                  <TableHead className="text-right">Wartość</TableHead>
                  <TableHead className="text-right">Percentyl</TableHead>
                  <TableHead className="text-right">Trend</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((entry) => (
                  <TableRow key={entry.id} className={entry.rank === 1 ? 'bg-yellow-50' : ''}>
                    <TableCell>
                      {entry.rank === 1 ? <Trophy className="h-5 w-5 text-yellow-500" /> : entry.rank}
                    </TableCell>
                    <TableCell className="font-medium">{entry.name}</TableCell>
                    <TableCell className="text-right font-mono">{entry.value.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={entry.percentile >= 80 ? 'default' : entry.percentile >= 50 ? 'secondary' : 'outline'}>
                        {entry.percentile}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{getTrendIcon(entry.trend)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
