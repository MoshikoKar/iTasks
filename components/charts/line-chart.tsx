'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface LineChartData {
  name: string;
  [key: string]: any;
}

interface LineSeries {
  dataKey: string;
  name: string;
  color: string;
}

interface LineChartProps {
  data: LineChartData[];
  series: LineSeries[];
  height?: number;
  title?: string;
}

export function LineChartComponent({
  data,
  series,
  height = 300,
  title
}: LineChartProps) {
  return (
    <div className="w-full">
      {title && (
        <h3 className="text-sm font-medium text-foreground mb-2">{title}</h3>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            axisLine={{ stroke: '#4b5563' }}
            tickLine={{ stroke: '#4b5563' }}
            interval="preserveStartEnd"
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
          <Legend
            wrapperStyle={{ fontSize: '12px', color: '#9ca3af' }}
            formatter={(value) => <span style={{ color: '#d1d5db' }}>{value}</span>}
          />
          {series.map((line) => (
            <Line
              key={line.dataKey}
              type="monotone"
              dataKey={line.dataKey}
              stroke={line.color}
              strokeWidth={2}
              dot={{ r: 3, fill: line.color, stroke: line.color }}
              activeDot={{ r: 6, fill: line.color, stroke: '#fff', strokeWidth: 2 }}
              name={line.name}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}