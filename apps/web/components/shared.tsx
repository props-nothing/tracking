// ── Shared UI building blocks ─────────────────────────────────
// Reusable components for common page patterns across the dashboard.

import type { ReactNode } from 'react';

// ── Loading State ─────────────────────────────────────────────
export function LoadingState({ message = 'Laden...' }: { message?: string }) {
  return (
    <div className="py-20 text-center text-sm text-muted-foreground">{message}</div>
  );
}

// ── Empty State ───────────────────────────────────────────────
export function EmptyState({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-card p-12 text-center">
      <h3 className="text-lg font-medium">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      {children}
    </div>
  );
}

// ── Page Header ───────────────────────────────────────────────
export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}

// ── Primary Button ────────────────────────────────────────────
export function PrimaryButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
    >
      {children}
    </button>
  );
}

// ── Delete Button ─────────────────────────────────────────────
export function DeleteButton({
  onClick,
  label = 'Verwijderen',
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-md border px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
    >
      {label}
    </button>
  );
}
