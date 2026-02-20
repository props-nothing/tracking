'use client';

import { useState } from 'react';

interface ExportBarProps {
  siteId: string;
  period: string;
}

export function ExportBar({ siteId, period }: ExportBarProps) {
  const [exporting, setExporting] = useState(false);

  const doExport = async (type: 'all' | 'events' | 'leads') => {
    setExporting(true);
    try {
      const res = await fetch(`/api/export?site_id=${siteId}&period=${period}&type=${type}`);
      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const label = type === 'all' ? 'analytics' : type;
      a.download = `${label}-${siteId}-${period}.xlsx`;
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

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => doExport('all')}
        disabled={exporting}
        className="rounded-md border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
      >
        {exporting ? 'Exporteren...' : 'Exporteer Excel'}
      </button>
      <button
        onClick={() => doExport('leads')}
        disabled={exporting}
        className="rounded-md border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
      >
        Exporteer Leads
      </button>
    </div>
  );
}
