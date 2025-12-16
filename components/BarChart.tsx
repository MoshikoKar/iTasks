"use client";

interface BarChartProps {
  data: Array<{ date: string; count: number }>;
}

export function BarChart({ data }: BarChartProps) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const barWidth = 100 / data.length - 2; // Account for gaps

  return (
    <div className="w-full h-64 flex flex-col">
      {/* Chart Area */}
      <div className="flex-1 flex items-end justify-between gap-2 px-4 pb-2">
        {data.map((item, index) => {
          const height = (item.count / maxCount) * 100;
          return (
            <div key={index} className="flex-1 flex flex-col items-center gap-1">
              {/* Value Label */}
              {item.count > 0 && (
                <span className="text-xs font-semibold text-slate-700">
                  {item.count}
                </span>
              )}
              {/* Bar */}
              <div
                className="w-full bg-gradient-to-t from-blue-600 to-blue-500 rounded-t-md transition-all hover:from-blue-700 hover:to-blue-600 relative group"
                style={{ height: `${height}%`, minHeight: item.count > 0 ? "8px" : "0" }}
              >
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <div className="bg-slate-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                    {item.count} task{item.count !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* X-Axis Labels */}
      <div className="flex justify-between gap-2 px-4 pt-2 border-t border-slate-200">
        {data.map((item, index) => (
          <div key={index} className="flex-1 text-center">
            <span className="text-xs text-slate-600">{item.date}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
