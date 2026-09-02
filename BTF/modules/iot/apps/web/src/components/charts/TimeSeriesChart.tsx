import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

interface Props {
  data: Array<{ bucket: string; avg_value: number; min_value: number; max_value: number }>;
  metric: string; unit?: string; color?: string; showMinMax?: boolean; type?: 'line' | 'area';
}

export const TimeSeriesChart: React.FC<Props> = ({ data, metric, unit = '', color = '#3b82f6', showMinMax = true, type = 'area' }) => {
  const formattedData = useMemo(() => data.map((d) => ({ ...d, timestamp: new Date(d.bucket), formattedTime: format(new Date(d.bucket), 'HH:mm', { locale: pl }) })), [data]);
  const ChartComponent = type === 'area' ? AreaChart : LineChart;
  return (
    <div className="bg-white rounded-xl p-6 border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 capitalize">{metric} {unit && `(${unit})`}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <ChartComponent data={formattedData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis dataKey="formattedTime" tick={{ fontSize: 12 }} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} />
          <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} domain={['auto', 'auto']} />
          <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} labelFormatter={(label) => `Czas: ${label}`} formatter={(value: number) => [`${value.toFixed(2)} ${unit}`, '']} />
          <Legend />
          {type === 'area' ? (
            <Area type="monotone" dataKey="avg_value" name={`Średnia ${metric}`} stroke={color} fill={color} fillOpacity={0.1} strokeWidth={2} dot={false} />
          ) : (
            <Line type="monotone" dataKey="avg_value" name={`Średnia ${metric}`} stroke={color} strokeWidth={2} dot={false} />
          )}
          {showMinMax && <><Line type="monotone" dataKey="min_value" name="Min" stroke="#10b981" strokeWidth={1} strokeDasharray="5 5" dot={false} /><Line type="monotone" dataKey="max_value" name="Max" stroke="#ef4444" strokeWidth={1} strokeDasharray="5 5" dot={false} /></>}
        </ChartComponent>
      </ResponsiveContainer>
    </div>
  );
};
