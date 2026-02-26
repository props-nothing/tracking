"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

interface DoughnutChartProps {
  data: { name: string; value: number; color?: string }[];
  totalLabel?: string;
  totalValue?: string | number;
}

const COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#64748b",
];

export function DoughnutChart({
  data,
  totalLabel,
  totalValue,
}: DoughnutChartProps) {
  const chartData = data.map((d, i) => ({
    ...d,
    color: d.color || COLORS[i % COLORS.length],
  }));

  return (
    <div className="relative w-full h-full min-h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius="65%"
            outerRadius="85%"
            paddingAngle={2}
            dataKey="value"
            stroke="none"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/50 p-3 rounded-xl shadow-xl">
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: data.color }}
                      />
                      <span className="text-slate-200 text-xs font-medium">
                        {data.name}
                      </span>
                    </div>
                    <div className="text-white font-bold text-sm ml-4.5">
                      {data.value.toLocaleString("nl-NL")}
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      {totalValue !== undefined && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-black text-slate-800">
            {totalValue}
          </span>
          {totalLabel && (
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {totalLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
