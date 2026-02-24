'use client';

import { useState, useEffect } from 'react';
import type { WidgetConfig, WidgetType, MetricKey, TableDataKey } from '@/types/dashboard-layout';
import {
  METRIC_OPTIONS,
  TABLE_OPTIONS,
  generateWidgetId,
} from '@/lib/widget-registry';

interface WidgetConfigModalProps {
  widget: WidgetConfig | null;
  /** null = editing existing, true = adding new */
  isNew?: boolean;
  onSave: (widget: WidgetConfig) => void;
  onClose: () => void;
}

const WIDGET_TYPE_LABELS: Record<WidgetType, string> = {
  'metric-card': 'Metriekkaart',
  'time-series': 'Tijdlijn grafiek',
  'data-table': 'Data-tabel',
  'bar-chart': 'Staafdiagram',
  'pie-chart': 'Cirkeldiagram',
  'ai-insights': 'AI Inzichten',
  'tracking-code': 'Trackingcode',
};

const COL_SPAN_OPTIONS: { value: 1 | 2 | 3 | 4; label: string }[] = [
  { value: 1, label: '1/4 breedte' },
  { value: 2, label: '1/2 breedte' },
  { value: 3, label: '3/4 breedte' },
  { value: 4, label: 'Volledige breedte' },
];

export function WidgetConfigModal({
  widget,
  isNew = false,
  onSave,
  onClose,
}: WidgetConfigModalProps) {
  const [type, setType] = useState<WidgetType>(widget?.type || 'metric-card');
  const [title, setTitle] = useState(widget?.title || '');
  const [colSpan, setColSpan] = useState<1 | 2 | 3 | 4>(widget?.colSpan || 1);

  // Metric card config
  const [metric, setMetric] = useState<MetricKey>(
    widget?.config.metric || 'pageviews'
  );

  // Table / chart config
  const [dataKey, setDataKey] = useState<TableDataKey>(
    widget?.config.dataKey || widget?.config.chartDataKey || 'top_pages'
  );

  // Time series config
  const [showPageviews, setShowPageviews] = useState(
    widget?.config.showPageviews ?? true
  );
  const [showVisitors, setShowVisitors] = useState(
    widget?.config.showVisitors ?? true
  );
  const [showLeads, setShowLeads] = useState(
    widget?.config.showLeads ?? false
  );

  // Auto-fill title when changing type/metric for new widgets or empty title
  useEffect(() => {
    if (!isNew && widget?.title) return;
    if (type === 'metric-card') {
      const opt = METRIC_OPTIONS.find((o) => o.key === metric);
      if (opt) setTitle(opt.label);
    } else if (type === 'data-table' || type === 'bar-chart' || type === 'pie-chart') {
      const opt = TABLE_OPTIONS.find((o) => o.key === dataKey);
      if (opt) setTitle(opt.label);
    } else if (type === 'time-series') {
      setTitle('Bezoekers & paginaweergaven over tijd');
    } else if (type === 'ai-insights') {
      setTitle('AI Inzichten');
    } else if (type === 'tracking-code') {
      setTitle('Trackingcode');
    }
  }, [type, metric, dataKey, isNew, widget?.title]);

  // Auto-adjust colSpan for certain types
  useEffect(() => {
    if (isNew) {
      if (type === 'metric-card') setColSpan(1);
      else if (type === 'data-table') setColSpan(2);
      else setColSpan(4);
    }
  }, [type, isNew]);

  function handleSave() {
    const metricOpt = METRIC_OPTIONS.find((o) => o.key === metric);
    const tableOpt = TABLE_OPTIONS.find((o) => o.key === dataKey);

    const base: WidgetConfig = {
      id: widget?.id || generateWidgetId(),
      type,
      title,
      colSpan,
      config: {},
    };

    switch (type) {
      case 'metric-card':
        base.config = {
          metric,
          format: metricOpt?.format || 'number',
          subtitleMetric: metricOpt?.subtitleMetric,
          subtitleFormat: metricOpt?.subtitleFormat,
        };
        break;
      case 'data-table':
        base.config = {
          dataKey,
          columns: tableOpt?.columns || [],
        };
        break;
      case 'bar-chart':
      case 'pie-chart':
        base.config = {
          chartDataKey: dataKey,
          nameField: tableOpt?.nameField || 'name',
          valueField: tableOpt?.valueField || 'value',
        };
        break;
      case 'time-series':
        base.config = { showPageviews, showVisitors, showLeads };
        break;
      default:
        base.config = {};
    }

    onSave(base);
  }

  const inputClass =
    'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring';
  const selectClass = inputClass;
  const labelClass = 'text-xs font-medium text-muted-foreground';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-lg border bg-card p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-semibold">
          {isNew ? 'Widget toevoegen' : 'Widget bewerken'}
        </h2>

        <div className="space-y-4">
          {/* Widget Type */}
          <div className="space-y-1.5">
            <label className={labelClass}>Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as WidgetType)}
              className={selectClass}
              disabled={!isNew}
            >
              {Object.entries(WIDGET_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <label className={labelClass}>Titel</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputClass}
              placeholder="Widget titel"
            />
          </div>

          {/* Column Span */}
          <div className="space-y-1.5">
            <label className={labelClass}>Breedte</label>
            <select
              value={colSpan}
              onChange={(e) => setColSpan(Number(e.target.value) as 1 | 2 | 3 | 4)}
              className={selectClass}
            >
              {COL_SPAN_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Metric Card config */}
          {type === 'metric-card' && (
            <div className="space-y-1.5">
              <label className={labelClass}>Metriek</label>
              <select
                value={metric}
                onChange={(e) => setMetric(e.target.value as MetricKey)}
                className={selectClass}
              >
                {METRIC_OPTIONS.map((o) => (
                  <option key={o.key} value={o.key}>{o.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Table / Chart data config */}
          {(type === 'data-table' || type === 'bar-chart' || type === 'pie-chart') && (
            <div className="space-y-1.5">
              <label className={labelClass}>Databron</label>
              <select
                value={dataKey}
                onChange={(e) => setDataKey(e.target.value as TableDataKey)}
                className={selectClass}
              >
                {TABLE_OPTIONS.map((o) => (
                  <option key={o.key} value={o.key}>{o.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Time Series config */}
          {type === 'time-series' && (
            <div className="space-y-2">
              <label className={labelClass}>Lijnen tonen</label>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={showPageviews}
                    onChange={(e) => setShowPageviews(e.target.checked)}
                    className="rounded border-input"
                  />
                  Paginaweergaven
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={showVisitors}
                    onChange={(e) => setShowVisitors(e.target.checked)}
                    className="rounded border-input"
                  />
                  Bezoekers
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={showLeads}
                    onChange={(e) => setShowLeads(e.target.checked)}
                    className="rounded border-input"
                  />
                  Leads
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="inline-flex h-9 items-center rounded-md border px-4 text-sm font-medium hover:bg-muted"
          >
            Annuleren
          </button>
          <button
            onClick={handleSave}
            className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            {isNew ? 'Toevoegen' : 'Opslaan'}
          </button>
        </div>
      </div>
    </div>
  );
}
