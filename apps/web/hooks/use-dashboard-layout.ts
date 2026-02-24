'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import type { WidgetConfig } from '@/types/dashboard-layout';
import { getDefaultWidgets } from '@/lib/widget-registry';

interface UseDashboardLayoutReturn {
  widgets: WidgetConfig[];
  setWidgets: (widgets: WidgetConfig[]) => void;
  editMode: boolean;
  setEditMode: (v: boolean) => void;
  saving: boolean;
  dirty: boolean;
  save: () => Promise<void>;
  reset: () => void;
  loading: boolean;
}

export function useDashboardLayout(siteId: string): UseDashboardLayoutReturn {
  const [widgets, setWidgetsRaw] = useState<WidgetConfig[]>(() => getDefaultWidgets());
  const [savedWidgets, setSavedWidgets] = useState<WidgetConfig[] | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const loadedRef = useRef(false);

  // Load layout from server
  useEffect(() => {
    if (!siteId || loadedRef.current) return;
    loadedRef.current = true;
    setLoading(true);
    fetch(`/api/dashboard-layouts?site_id=${siteId}`)
      .then((r) => r.json())
      .then((layouts) => {
        if (Array.isArray(layouts) && layouts.length > 0) {
          const layout = layouts[0];
          const w = layout.widgets as WidgetConfig[];
          if (Array.isArray(w) && w.length > 0) {
            setWidgetsRaw(w);
            setSavedWidgets(w);
          }
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [siteId]);

  const setWidgets = useCallback((next: WidgetConfig[]) => {
    setWidgetsRaw(next);
    setDirty(true);
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      await fetch('/api/dashboard-layouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          site_id: siteId,
          name: 'Default',
          widgets,
        }),
      });
      setSavedWidgets(widgets);
      setDirty(false);
      setEditMode(false);
    } finally {
      setSaving(false);
    }
  }, [siteId, widgets]);

  const reset = useCallback(() => {
    if (savedWidgets) {
      setWidgetsRaw(savedWidgets);
    } else {
      setWidgetsRaw(getDefaultWidgets());
    }
    setDirty(false);
    setEditMode(false);
  }, [savedWidgets]);

  return {
    widgets,
    setWidgets,
    editMode,
    setEditMode,
    saving,
    dirty,
    save,
    reset,
    loading,
  };
}
