"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceDot,
} from "recharts";

interface TimeSeriesDataPoint {
  date: string;
  pageviews: number;
  visitors: number;
  leads?: number;
  revenue?: number;
}

interface TimeSeriesProps {
  data: TimeSeriesDataPoint[];
  period?: string;
  isRevenue?: boolean;
}

/* ── Custom Tooltip ─────────────────────────────────────────── */
function ChartTooltip({ active, payload, label, isHourly, isRevenue }: any) {
  if (!active || !payload?.length) return null;

  const formatLabel = (v: string) => {
    if (isHourly) {
      const hour = parseInt(v.slice(11, 13), 10);
      const dateStr = v.slice(0, 10);
      const d = new Date(dateStr + "T00:00:00");
      const ampm = hour >= 12 ? "PM" : "AM";
      const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      return `${d.toLocaleDateString("nl", { month: "short", day: "numeric" })} ${h12}:00 ${ampm}`;
    }
    const d = new Date(v + "T00:00:00");
    return d.toLocaleDateString("nl", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const row = payload[0]?.payload as TimeSeriesDataPoint | undefined;

  return (
    <div
      style={{
        backgroundColor: "var(--color-card)",
        color: "var(--color-card-foreground)",
        border: "1px solid var(--color-border)",
        borderRadius: "8px",
        padding: "8px 12px",
        fontSize: "12px",
      }}
    >
      <p
        style={{
          color: "var(--color-foreground)",
          marginBottom: 4,
          fontWeight: 500,
        }}
      >
        {formatLabel(label)}
      </p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color, margin: "2px 0" }}>
          {p.name}:{" "}
          {isRevenue
            ? new Intl.NumberFormat("nl-NL", {
                style: "currency",
                currency: "EUR",
              }).format(p.value)
            : p.value?.toLocaleString()}
        </p>
      ))}
      {row?.leads != null && row.leads > 0 && (
        <p style={{ color: "#f59e0b", margin: "4px 0 0", fontWeight: 600 }}>
          ✦ Leads vastgelegd: {row.leads}
        </p>
      )}
    </div>
  );
}

/* ── TimeSeries Chart ──────────────────────────────────────── */
export function TimeSeries({ data, period, isRevenue }: TimeSeriesProps) {
  if (!data.length) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
        Geen data voor deze periode
      </div>
    );
  }

  const isHourly = period === "today" || period === "yesterday";
  const hasLeads = data.some((d) => (d.leads ?? 0) > 0);

  const formatXAxis = (v: string) => {
    if (isHourly) {
      const hour = parseInt(v.slice(11, 13), 10);
      const ampm = hour >= 12 ? "PM" : "AM";
      const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      return `${h12}${ampm}`;
    }
    const d = new Date(v + "T00:00:00");
    if (period === "last_365_days") {
      return d.toLocaleDateString("nl", { month: "short" });
    }
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  // Determine sensible tick interval so labels don't overlap
  const tickInterval = (() => {
    const len = data.length;
    if (isHourly) return 2; // every 3 hours
    if (period === "last_365_days") return Math.ceil(len / 12) - 1; // ~monthly
    if (period === "last_90_days") return Math.ceil(len / 12) - 1; // ~weekly
    if (len > 30) return Math.ceil(len / 15) - 1;
    return undefined; // recharts auto
  })();

  // Lead markers — positioned on the pageviews line
  const leadPoints = hasLeads ? data.filter((d) => (d.leads ?? 0) > 0) : [];

  return (
    <>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart
          data={data}
          margin={{ top: 20, right: 10, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorPageviews" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor="var(--color-chart-1)"
                stopOpacity={0.3}
              />
              <stop
                offset="95%"
                stopColor="var(--color-chart-1)"
                stopOpacity={0}
              />
            </linearGradient>
            <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor="var(--color-chart-2)"
                stopOpacity={0.3}
              />
              <stop
                offset="95%"
                stopColor="var(--color-chart-2)"
                stopOpacity={0}
              />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis
            dataKey="date"
            tickFormatter={formatXAxis}
            fontSize={12}
            tick={{ fill: "var(--color-muted-foreground)" }}
            stroke="var(--color-border)"
            interval={tickInterval}
          />
          <YAxis
            fontSize={12}
            tick={{ fill: "var(--color-muted-foreground)" }}
            stroke="var(--color-border)"
            allowDecimals={false}
            tickFormatter={isRevenue ? (v) => `€${v}` : undefined}
          />
          <Tooltip
            content={<ChartTooltip isHourly={isHourly} isRevenue={isRevenue} />}
          />
          <Legend
            wrapperStyle={{
              fontSize: "12px",
              color: "var(--color-foreground)",
            }}
          />
          {isRevenue ? (
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#10b981"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorVisitors)"
              name="Omzet"
            />
          ) : (
            <>
              <Area
                type="monotone"
                dataKey="pageviews"
                stroke="var(--color-chart-1)"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorPageviews)"
                name="Paginaweergaven"
              />
              <Area
                type="monotone"
                dataKey="visitors"
                stroke="var(--color-chart-2)"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorVisitors)"
                name="Bezoekers"
              />
            </>
          )}
          {/* Lead capture markers — orange dots on the pageviews line */}
          {leadPoints.map((point) => (
            <ReferenceDot
              key={`lead-${point.date}`}
              x={point.date}
              y={point.pageviews}
              r={7}
              fill="#f59e0b"
              stroke="white"
              strokeWidth={2}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
      {hasLeads && (
        <div className="mt-1 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <span className="inline-block h-3 w-3 rounded-full bg-amber-500" />
          <span>Lead vastgelegd</span>
        </div>
      )}
    </>
  );
}
