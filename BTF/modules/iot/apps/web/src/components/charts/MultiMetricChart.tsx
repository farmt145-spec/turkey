import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

interface MetricConfig { key: string; name: string; color: string; unit?: string; }
interface Props { data: Array<Record<string, any>>; metrics: MetricConfig[]; title: string; xAxisKey?: string; height?: number; }

export const MultiMetricChart: React.FC<Props> = ({ data, metrics, title, xAxisKey = 'bucket', height = 350 }) => {
  const formattedData = data.map((d) => ({ ...d, formattedTime: d[xAxisKey] ? format(new Date(d[xAxisKey]), 'dd.MM HH:mm', { locale: pl }) : '' }));
  return (
    <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={formattedData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis dataKey="formattedTime" tick={{ fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} interval="preserveStartEnd" />
          <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} />
          <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} />
          <Legend wrapperStyle={{ paddingTop: '1rem' }} />
          {metrics.map((metric, index) => (
            <Line key={metric.key} yAxisId={index % 2 === 0 ? 'left' : 'right'} type="monotone" dataKey={metric.key} name={`${metric.name} ${metric.unit ? `(${metric.unit})` : ''}`} stroke={metric.color} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
