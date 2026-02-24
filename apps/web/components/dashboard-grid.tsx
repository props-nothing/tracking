'use client';

import { useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { WidgetConfig } from '@/types/dashboard-layout';
import type { OverviewStats, Period } from '@/types';
import { WidgetRenderer } from '@/components/widget-renderer';
import { WidgetConfigModal } from '@/components/widget-config-modal';
import { getDefaultWidgets, generateWidgetId } from '@/lib/widget-registry';

/* ── Props ─────────────────────────────────────────────────── */
interface DashboardGridProps {
  widgets: WidgetConfig[];
  setWidgets: (widgets: WidgetConfig[]) => void;
  editMode: boolean;
  setEditMode: (v: boolean) => void;
  saving: boolean;
  dirty: boolean;
  onSave: () => Promise<void>;
  onReset: () => void;
  stats: OverviewStats | null;
  siteId: string;
  period: Period;
  periodStart: string;
  periodEnd: string;
}

/* ── Column-span to CSS class mapping ──────────────────────── */
const COL_SPAN_CLASS: Record<number, string> = {
  1: 'col-span-1',
  2: 'col-span-1 sm:col-span-2',
  3: 'col-span-1 sm:col-span-2 lg:col-span-3',
  4: 'col-span-1 sm:col-span-2 lg:col-span-4',
};

/* ── Sortable Widget Wrapper ───────────────────────────────── */
interface SortableWidgetProps {
  widget: WidgetConfig;
  editMode: boolean;
  onEdit: (w: WidgetConfig) => void;
  onRemove: (id: string) => void;
  children: React.ReactNode;
}

function SortableWidget({
  widget,
  editMode,
  onEdit,
  onRemove,
  children,
}: SortableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.5 : 1,
  } as React.CSSProperties;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${COL_SPAN_CLASS[widget.colSpan] || 'col-span-1'} relative ${
        editMode
          ? 'rounded-lg ring-2 ring-primary/30 ring-offset-2 ring-offset-background'
          : ''
      }`}
    >
      {editMode && (
        <div className="absolute -top-3 right-1 z-10 flex items-center gap-1">
          {/* Drag handle */}
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-muted/80 active:cursor-grabbing"
            title="Slepen om te verplaatsen"
          >
            ⠿
          </button>
          {/* Edit */}
          <button
            onClick={() => onEdit(widget)}
            className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-primary hover:text-primary-foreground"
            title="Widget bewerken"
          >
            ✏️
          </button>
          {/* Remove */}
          <button
            onClick={() => onRemove(widget.id)}
            className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
            title="Widget verwijderen"
          >
            ✕
          </button>
        </div>
      )}
      {children}
    </div>
  );
}

/* ── Main Dashboard Grid ───────────────────────────────────── */
export function DashboardGrid({
  widgets,
  setWidgets,
  editMode,
  setEditMode,
  saving,
  dirty,
  onSave,
  onReset,
  stats,
  siteId,
  period,
  periodStart,
  periodEnd,
}: DashboardGridProps) {
  const [editingWidget, setEditingWidget] = useState<WidgetConfig | null>(null);
  const [addingWidget, setAddingWidget] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = widgets.findIndex((w) => w.id === active.id);
      const newIndex = widgets.findIndex((w) => w.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      setWidgets(arrayMove(widgets, oldIndex, newIndex));
    },
    [widgets, setWidgets]
  );

  const handleEdit = useCallback((w: WidgetConfig) => {
    setEditingWidget(w);
    setAddingWidget(false);
  }, []);

  const handleRemove = useCallback(
    (id: string) => {
      setWidgets(widgets.filter((w) => w.id !== id));
    },
    [widgets, setWidgets]
  );

  const handleSaveWidget = useCallback(
    (updated: WidgetConfig) => {
      if (addingWidget) {
        setWidgets([...widgets, updated]);
      } else {
        setWidgets(widgets.map((w) => (w.id === updated.id ? updated : w)));
      }
      setEditingWidget(null);
      setAddingWidget(false);
    },
    [widgets, setWidgets, addingWidget]
  );

  const handleResetToDefault = useCallback(() => {
    setWidgets(getDefaultWidgets());
  }, [setWidgets]);

  return (
    <div className="space-y-4">
      {/* Edit Mode Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {!editMode ? (
          <button
            onClick={() => setEditMode(true)}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-card px-3 text-xs font-medium hover:bg-muted"
          >
            <span>✏️</span> Dashboard aanpassen
          </button>
        ) : (
          <>
            <button
              onClick={() => {
                setAddingWidget(true);
                setEditingWidget({
                  id: generateWidgetId(),
                  type: 'metric-card',
                  title: '',
                  colSpan: 1,
                  config: { metric: 'pageviews', format: 'number' },
                });
              }}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-card px-3 text-xs font-medium hover:bg-muted"
            >
              <span>+</span> Widget toevoegen
            </button>
            <button
              onClick={handleResetToDefault}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-card px-3 text-xs font-medium hover:bg-muted"
            >
              Standaard herstellen
            </button>
            <div className="flex-1" />
            <button
              onClick={onReset}
              className="inline-flex h-8 items-center rounded-md border px-3 text-xs font-medium hover:bg-muted"
            >
              Annuleren
            </button>
            <button
              onClick={onSave}
              disabled={saving}
              className="inline-flex h-8 items-center rounded-md bg-primary px-4 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? 'Opslaan...' : 'Opslaan'}
            </button>
          </>
        )}
      </div>

      {/* Hint text in edit mode */}
      {editMode && (
        <p className="text-xs text-muted-foreground">
          Sleep widgets om ze te verplaatsen. Klik op ✏️ om te bewerken of ✕ om te verwijderen.
        </p>
      )}

      {/* Widget Grid */}
      {editMode ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={widgets.map((w) => w.id)}
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {widgets.map((widget) => (
                <SortableWidget
                  key={widget.id}
                  widget={widget}
                  editMode={editMode}
                  onEdit={handleEdit}
                  onRemove={handleRemove}
                >
                  <WidgetRenderer
                    widget={widget}
                    stats={stats}
                    siteId={siteId}
                    period={period}
                    periodStart={periodStart}
                    periodEnd={periodEnd}
                  />
                </SortableWidget>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {widgets.map((widget) => (
            <div
              key={widget.id}
              className={COL_SPAN_CLASS[widget.colSpan] || 'col-span-1'}
            >
              <WidgetRenderer
                widget={widget}
                stats={stats}
                siteId={siteId}
                period={period}
                periodStart={periodStart}
                periodEnd={periodEnd}
              />
            </div>
          ))}
        </div>
      )}

      {/* Config Modal */}
      {editingWidget && (
        <WidgetConfigModal
          widget={editingWidget}
          isNew={addingWidget}
          onSave={handleSaveWidget}
          onClose={() => {
            setEditingWidget(null);
            setAddingWidget(false);
          }}
        />
      )}
    </div>
  );
}
