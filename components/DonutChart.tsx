"use client";

import { TaskPriority } from "@prisma/client";

interface DonutChartProps {
  data: Array<{ priority: TaskPriority; count: number }>;
}

const priorityColors: Record<TaskPriority, { bg: string; text: string; stroke: string }> = {
  Critical: { bg: "bg-red-500", text: "text-red-700", stroke: "#ef4444" },
  High: { bg: "bg-amber-500", text: "text-amber-700", stroke: "#f59e0b" },
  Medium: { bg: "bg-blue-500", text: "text-blue-700", stroke: "#3b82f6" },
  Low: { bg: "bg-green-500", text: "text-green-700", stroke: "#22c55e" },
};

export function DonutChart({ data }: DonutChartProps) {
  const total = data.reduce((sum, item) => sum + item.count, 0);

  if (total === 0) {
    return (
      <div className="w-full h-64 flex items-center justify-center">
        <div className="text-center text-slate-500">
          <div className="text-4xl mb-2">📊</div>
          <p className="text-sm">No active tasks</p>
        </div>
      </div>
    );
  }

  let currentAngle = -90; // Start from top
  const radius = 80;
  const innerRadius = 50;
  const centerX = 120;
  const centerY = 120;

  const segments = data.map((item) => {
    const percentage = (item.count / total) * 100;
    const angle = (percentage / 100) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;

    currentAngle = endAngle;

    return {
      ...item,
      percentage,
      startAngle,
      endAngle,
    };
  });

  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians),
    };
  };

  const describeArc = (
    centerX: number,
    centerY: number,
    radius: number,
    startAngle: number,
    endAngle: number
  ) => {
    const start = polarToCartesian(centerX, centerY, radius, endAngle);
    const end = polarToCartesian(centerX, centerY, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

    return [
      "M", start.x, start.y,
      "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y
    ].join(" ");
  };

  const describeDonutSegment = (
    centerX: number,
    centerY: number,
    outerRadius: number,
    innerRadius: number,
    startAngle: number,
    endAngle: number
  ) => {
    const outerStart = polarToCartesian(centerX, centerY, outerRadius, startAngle);
    const outerEnd = polarToCartesian(centerX, centerY, outerRadius, endAngle);
    const innerStart = polarToCartesian(centerX, centerY, innerRadius, startAngle);
    const innerEnd = polarToCartesian(centerX, centerY, innerRadius, endAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

    return [
      "M", outerStart.x, outerStart.y,
      "A", outerRadius, outerRadius, 0, largeArcFlag, 1, outerEnd.x, outerEnd.y,
      "L", innerEnd.x, innerEnd.y,
      "A", innerRadius, innerRadius, 0, largeArcFlag, 0, innerStart.x, innerStart.y,
      "Z"
    ].join(" ");
  };

  return (
    <div className="w-full h-64 grid grid-cols-[auto_1fr] items-center gap-4">
      {/* Donut Chart SVG */}
      <div className="flex items-center justify-center max-w-[180px] w-full aspect-square">
        <svg 
          viewBox="0 0 240 240"
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
        >
          {segments.map((segment, index) => (
            <g key={segment.priority}>
              <path
                d={describeDonutSegment(
                  centerX,
                  centerY,
                  radius,
                  innerRadius,
                  segment.startAngle,
                  segment.endAngle
                )}
                fill={priorityColors[segment.priority].stroke}
                className="transition-all hover:opacity-80"
              />
            </g>
          ))}
          {/* Center Circle */}
          <circle cx={centerX} cy={centerY} r={innerRadius} fill="white" />
          {/* Total Count in Center */}
          <text
            x={centerX}
            y={centerY - 10}
            textAnchor="middle"
            className="text-2xl font-bold fill-slate-900"
          >
            {total}
          </text>
          <text
            x={centerX}
            y={centerY + 15}
            textAnchor="middle"
            className="text-xs fill-slate-600"
          >
            Total Tasks
          </text>
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-2 w-full min-w-0">
        {data.map((item) => (
          <div key={item.priority} className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1 w-full min-w-0">
            {/* Left group: color dot + priority label */}
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-sm flex-shrink-0 ${priorityColors[item.priority].bg}`}></div>
              <span className="text-sm text-slate-700 whitespace-nowrap">{item.priority}</span>
            </div>
            {/* Right group: count + percentage */}
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-sm font-semibold text-slate-900">{item.count}</span>
              <span className="text-xs text-slate-500">
                ({((item.count / total) * 100).toFixed(0)}%)
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
