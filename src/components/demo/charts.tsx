"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMoney } from "@/lib/utils";

export const CHART_COLORS = [
  "#6366f1", // indigo
  "#0ea5e9", // sky
  "#10b981", // emerald
  "#f59e0b", // amber
  "#f43f5e", // rose
  "#8b5cf6", // violet
];

const axisProps = {
  stroke: "hsl(var(--muted-foreground))",
  fontSize: 12,
  tickLine: false,
  axisLine: false,
} as const;

function TooltipBox({
  active,
  payload,
  label,
  money,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number; color?: string }[];
  label?: string;
  money?: boolean;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-lg">
      {label && <p className="mb-1 font-medium">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium">
            {money ? formatMoney(Number(p.value)) : p.value}
          </span>
        </p>
      ))}
    </div>
  );
}

export function AreaTrend({
  data,
  dataKey,
  money,
  color = CHART_COLORS[0],
  height = 240,
}: {
  data: Record<string, unknown>[];
  dataKey: string;
  money?: boolean;
  color?: string;
  height?: number;
}) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.6} />
          <defs>
            <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="label" {...axisProps} minTickGap={20} />
          <YAxis {...axisProps} width={money ? 48 : 28} tickFormatter={(v) => (money ? `${Math.round(v / 1000)}k` : `${v}`)} />
          <Tooltip content={<TooltipBox money={money} />} cursor={{ stroke: "hsl(var(--border))" }} />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            fill={`url(#grad-${dataKey})`}
            animationDuration={800}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BarsChart({
  data,
  dataKey,
  money,
  color = CHART_COLORS[1],
  height = 240,
}: {
  data: Record<string, unknown>[];
  dataKey: string;
  money?: boolean;
  color?: string;
  height?: number;
}) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.6} />
          <XAxis dataKey="label" {...axisProps} minTickGap={12} />
          <YAxis {...axisProps} width={money ? 48 : 28} tickFormatter={(v) => (money ? `${Math.round(v / 1000)}k` : `${v}`)} />
          <Tooltip content={<TooltipBox money={money} />} cursor={{ fill: "hsl(var(--muted))" }} />
          <Bar dataKey={dataKey} fill={color} radius={[6, 6, 0, 0]} animationDuration={800} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DonutChart({
  data,
  money,
  height = 240,
  colors = CHART_COLORS,
}: {
  data: { name: string; value: number }[];
  money?: boolean;
  height?: number;
  colors?: string[];
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div style={{ width: "100%", height }} className="relative">
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="62%"
            outerRadius="88%"
            paddingAngle={2}
            stroke="none"
            animationDuration={800}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={colors[i % colors.length]} />
            ))}
          </Pie>
          <Tooltip content={<TooltipBox money={money} />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-lg font-semibold">
            {money ? formatMoney(total) : total}
          </p>
        </div>
      </div>
    </div>
  );
}

export function ChartLegend({
  items,
  colors = CHART_COLORS,
}: {
  items: string[];
  colors?: string[];
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
      {items.map((it, i) => (
        <span key={it} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: colors[i % colors.length] }} />
          {it}
        </span>
      ))}
    </div>
  );
}
