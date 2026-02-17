'use client';

import { useState, useMemo } from 'react';

interface Column {
  key: string;
  label: string;
  align?: 'left' | 'right';
  sortable?: boolean;
}

interface DataTableProps {
  title: string;
  columns: Column[];
  data: Record<string, any>[];
  emptyMessage?: string;
  pageSize?: number;
  searchable?: boolean;
}

export function DataTable({
  title,
  columns,
  data,
  emptyMessage = 'No data',
  pageSize = 10,
  searchable = false,
}: DataTableProps) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search) return data;
    const q = search.toLowerCase();
    return data.filter((row) =>
      columns.some((col) => String(row[col.key] ?? '').toLowerCase().includes(q))
    );
  }, [data, search, columns]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      const as = String(av ?? '');
      const bs = String(bv ?? '');
      return sortDir === 'asc' ? as.localeCompare(bs) : bs.localeCompare(as);
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paged = sorted.slice(page * pageSize, (page + 1) * pageSize);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
    setPage(0);
  };

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="text-sm font-medium">{title}</h3>
        {searchable && (
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="rounded-md border bg-transparent px-2.5 py-1 text-xs outline-none focus:ring-1 focus:ring-primary w-40"
          />
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b text-xs text-muted-foreground">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-2 font-medium select-none ${
                    col.align === 'right' ? 'text-right' : 'text-left'
                  } ${col.sortable !== false ? 'cursor-pointer hover:text-foreground transition-colors' : ''}`}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {sortKey === col.key && (
                      <span className="text-[10px]">{sortDir === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paged.map((row, i) => (
                <tr key={i} className="border-b last:border-0 text-sm hover:bg-muted/50 transition-colors">
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-2.5 ${col.align === 'right' ? 'text-right tabular-nums' : ''}`}
                    >
                      {row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {/* Pagination */}
      {sorted.length > pageSize && (
        <div className="flex items-center justify-between border-t px-4 py-2">
          <span className="text-xs text-muted-foreground">
            {sorted.length} total · Page {page + 1} of {totalPages}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="rounded px-2 py-1 text-xs hover:bg-muted disabled:opacity-30 transition-colors"
            >
              ← Prev
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="rounded px-2 py-1 text-xs hover:bg-muted disabled:opacity-30 transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
