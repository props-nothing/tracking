'use client';

import type { WidgetConfig } from '@/types/dashboard-layout';
import type { OverviewStats, Period } from '@/types';
import { MetricCard } from '@/components/metric-card';
import { TimeSeries } from '@/components/charts/time-series';
import { BarChart } from '@/components/charts/bar-chart';
import { PieChart } from '@/components/charts/pie-chart';
import { DataTable } from '@/components/tables/data-table';
import { AIInsightsPanel } from '@/components/ai-insights-panel';
import { formatDuration, formatNumber, truncatePath } from '@/lib/formatters';
import { TABLE_OPTIONS } from '@/lib/widget-registry';

interface WidgetRendererProps {
  widget: WidgetConfig;
  stats: OverviewStats | null;
  siteId: string;
  period: Period;
  periodStart: string;
  periodEnd: string;
}

/** Format a stat value based on the widget format config */
function formatValue(
  value: unknown,
  format: string | undefined
): string {
  if (value == null) return '—';
  switch (format) {
    case 'number':
      return formatNumber(Number(value));
    case 'percentage':
      return `${value}%`;
    case 'duration':
      return formatDuration(Number(value));
    case 'text':
      return typeof value === 'string' ? truncatePath(value) : String(value);
    default:
      return String(value);
  }
}

function getSubtitle(
  stats: OverviewStats,
  subtitleMetric?: string,
  subtitleFormat?: string
): string | undefined {
  if (!subtitleMetric) return undefined;
  const raw = (stats as unknown as Record<string, unknown>)[subtitleMetric];
  if (raw == null) return undefined;
  if (subtitleFormat === 'number') return `${formatNumber(Number(raw))} bezoekers`;
  return String(raw);
}

/** Resolve data array from stats for a given table data key */
function resolveTableData(
  stats: OverviewStats,
  dataKey: string | undefined
): Record<string, unknown>[] {
  if (!dataKey || !stats) return [];
  return ((stats as unknown as Record<string, unknown>)[dataKey] as Record<string, unknown>[]) || [];
}

export function WidgetRenderer({
  widget,
  stats,
  siteId,
  period,
  periodStart,
  periodEnd,
}: WidgetRendererProps) {
  if (!stats && widget.type !== 'tracking-code') {
    return (
      <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
        Laden...
      </div>
    );
  }

  switch (widget.type) {
    case 'metric-card': {
      const metric = widget.config.metric;
      if (!metric || !stats) return null;
      const value = (stats as unknown as Record<string, unknown>)[metric];
      const subtitle = getSubtitle(
        stats,
        widget.config.subtitleMetric,
        widget.config.subtitleFormat
      );
      return (
        <MetricCard
          title={widget.title}
          value={formatValue(value, widget.config.format)}
          subtitle={subtitle}
        />
      );
    }

    case 'time-series': {
      if (!stats) return null;
      return (
        <div className="rounded-lg border bg-card p-6">
          <h2 className="mb-4 text-sm font-medium">{widget.title}</h2>
          <TimeSeries data={stats.timeseries} period={period} />
        </div>
      );
    }

    case 'data-table': {
      if (!stats) return null;
      const data = resolveTableData(stats, widget.config.dataKey);
      const cols = widget.config.columns || [];
      return (
        <DataTable
          title={widget.title}
          columns={cols.map((c) => ({
            key: c.key,
            label: c.label,
            align: c.align as 'left' | 'right' | undefined,
          }))}
          data={data as Record<string, any>[]}
        />
      );
    }

    case 'bar-chart': {
      if (!stats) return null;
      const dataKey = widget.config.chartDataKey || widget.config.dataKey;
      const raw = resolveTableData(stats, dataKey);
      const nameField = widget.config.nameField || 'name';
      const valueField = widget.config.valueField || 'value';
      const chartData = raw.slice(0, 10).map((r) => ({
        name: String(r[nameField] ?? ''),
        value: Number(r[valueField] ?? 0),
      }));
      return (
        <div className="rounded-lg border bg-card p-6">
          <h2 className="mb-4 text-sm font-medium">{widget.title}</h2>
          <BarChart data={chartData} />
        </div>
      );
    }

    case 'pie-chart': {
      if (!stats) return null;
      const dataKey = widget.config.chartDataKey || widget.config.dataKey;
      const raw = resolveTableData(stats, dataKey);
      const nameField = widget.config.nameField || 'name';
      const valueField = widget.config.valueField || 'value';
      const chartData = raw.slice(0, 8).map((r) => ({
        name: String(r[nameField] ?? ''),
        value: Number(r[valueField] ?? 0),
      }));
      return (
        <div className="rounded-lg border bg-card p-6">
          <h2 className="mb-4 text-sm font-medium">{widget.title}</h2>
          <PieChart data={chartData} />
        </div>
      );
    }

    case 'ai-insights': {
      return (
        <AIInsightsPanel
          siteId={siteId}
          periodStart={periodStart}
          periodEnd={periodEnd}
        />
      );
    }

    case 'tracking-code': {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      return (
        <div className="rounded-lg border bg-card p-6">
          <h2 className="mb-2 text-sm font-medium">Trackingcode</h2>
          <p className="mb-4 text-xs text-muted-foreground">
            Voeg dit fragment toe vóór de sluitende &lt;/head&gt;-tag op je website.
          </p>
          <pre className="overflow-x-auto rounded-md bg-muted p-4 text-xs">
            {`<script defer src="${origin}/t.js" data-site-id="${siteId}" data-api="${origin}/api/collect"></script>`}
          </pre>
        </div>
      );
    }

    default:
      return (
        <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
          Onbekend widgettype: {widget.type}
        </div>
      );
  }
}
