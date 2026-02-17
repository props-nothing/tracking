'use client';

import { useState } from 'react';

interface ExportBarProps {
  siteId: string;
  period: string;
}

export function ExportBar({ siteId, period }: ExportBarProps) {
  const [exporting, setExporting] = useState(false);

  const doExport = async (format: 'csv' | 'json') => {
    setExporting(true);
    try {
      const res = await fetch(`/api/export?site_id=${siteId}&period=${period}&format=${format}&type=events`);
      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${siteId}-${period}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setExporting(false);
    }
  };

  const downloadPDF = async () => {
    setExporting(true);
    try {
      // Use the first report token or generate PDF via API
      const res = await fetch(`/api/export?site_id=${siteId}&period=${period}&format=csv&type=events`);
      if (!res.ok) throw new Error('PDF export not available — create a shared report first');

      // For now, export as CSV as a workaround; PDF requires a report token
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${siteId}-${period}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF export error:', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => doExport('csv')}
        disabled={exporting}
        className="rounded-md border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
      >
        Export CSV
      </button>
      <button
        onClick={() => doExport('json')}
        disabled={exporting}
        className="rounded-md border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
      >
        Export JSON
      </button>
    </div>
  );
}
