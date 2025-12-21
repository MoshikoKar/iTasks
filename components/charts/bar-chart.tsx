'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface BarChartData {
  name: string;
  value: number;
  [key: string]: any;
}

interface BarChartProps {
  data: BarChartData[];
  dataKey?: string;
  nameKey?: string;
  color?: string;
  height?: number;
  title?: string;
}

export function BarChartComponent({
  data,
  dataKey = 'value',
  nameKey = 'name',
  color = '#3b82f6',
  height = 300,
  title
}: BarChartProps) {
  return (
    <div className="w-full">
      {title && (
        <h3 className="text-sm font-medium text-foreground mb-2">{title}</h3>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey={nameKey}
            tick={{ fontSize: 12, fill: '#9ca3af' }}
            axisLine={{ stroke: '#4b5563' }}
            tickLine={{ stroke: '#4b5563' }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: '#9ca3af' }}
            axisLine={{ stroke: '#4b5563' }}
            tickLine={{ stroke: '#4b5563' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '6px',
              fontSize: '12px',
              color: '#f3f4f6',
            }}
            labelStyle={{ color: '#f3f4f6' }}
          />
          <Bar
            dataKey={dataKey}
            fill={color}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}