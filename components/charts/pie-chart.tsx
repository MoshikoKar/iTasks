'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface PieChartData {
  name: string;
  value: number;
  [key: string]: any;
}

interface PieChartProps {
  data: PieChartData[];
  dataKey?: string;
  nameKey?: string;
  colors?: string[];
  height?: number;
  title?: string;
  showLegend?: boolean;
}

const DEFAULT_COLORS = [
  '#3b82f6', // blue-500
  '#8b5cf6', // violet-500
  '#06b6d4', // cyan-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#ec4899', // pink-500
  '#6366f1', // indigo-500
];

export function PieChartComponent({
  data,
  dataKey = 'value',
  nameKey = 'name',
  colors = DEFAULT_COLORS,
  height = 300,
  title,
  showLegend = true
}: PieChartProps) {
  return (
    <div className="w-full">
      {title && (
        <h3 className="text-sm font-medium text-foreground mb-2">{title}</h3>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={{ stroke: '#9ca3af' }}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey={dataKey}
            nameKey={nameKey}
            stroke="#1f2937"
            strokeWidth={2}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
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
          {showLegend && (
            <Legend
              wrapperStyle={{ fontSize: '12px', color: '#9ca3af' }}
              formatter={(value) => <span style={{ color: '#d1d5db' }}>{value}</span>}
            />
          )}
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}