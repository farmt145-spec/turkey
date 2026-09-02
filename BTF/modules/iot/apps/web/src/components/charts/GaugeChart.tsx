import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface Props { value: number; max: number; title: string; unit?: string; warningThreshold?: number; criticalThreshold?: number; size?: number; }

export const GaugeChart: React.FC<Props> = ({ value, max, title, unit = '', warningThreshold = 0.7, criticalThreshold = 0.9, size = 180 }) => {
  const percentage = Math.min((value / max) * 100, 100);
  const remaining = 100 - percentage;
  const getColor = () => { const ratio = value / max; if (ratio >= criticalThreshold) return '#ef4444'; if (ratio >= warningThreshold) return '#f59e0b'; return '#10b981'; };
  const data = [{ name: 'value', value: percentage }, { name: 'empty', value: remaining }];
  const COLORS = [getColor(), '#f3f4f6'];
  return (
    <div className="flex flex-col items-center justify-center p-4">
      <h4 className="text-sm font-medium text-gray-700 mb-2">{title}</h4>
      <div style={{ width: size, height: size / 2 }}>
        <ResponsiveContainer><PieChart><Pie data={data} cx="50%" cy="100%" startAngle={180} endAngle={0} innerRadius="60%" outerRadius="100%" paddingAngle={0} dataKey="value" stroke="none">{data.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}</Pie></PieChart></ResponsiveContainer>
      </div>
      <div className="text-center -mt-4"><span className="text-2xl font-bold text-gray-900">{value.toFixed(1)}</span><span className="text-sm text-gray-500 ml-1">{unit}</span></div>
      <div className="text-xs text-gray-400 mt-1">Max: {max}</div>
    </div>
  );
};
