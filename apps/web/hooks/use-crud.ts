'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';

/**
 * Generic CRUD hook for list + create + delete patterns.
 * Replaces the copy-pasted pattern in alerts, annotations,
 * api-keys, team, and reports pages.
 *
 * @param endpoint - The API base URL (e.g. '/api/alerts')
 * @param siteId   - The site UUID
 * @param listKey  - The key in the response that contains the array (e.g. 'alerts')
 * @param queryString - Optional extra query string params
 */
export function useCrud<T extends { id: string }>(
  endpoint: string,
  siteId: string,
  listKey: string,
  queryString?: string,
) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(() => {
    setLoading(true);
    const qs = queryString ? `&${queryString}` : '';
    api
      .get<Record<string, T[]>>(`${endpoint}?site_id=${siteId}${qs}`)
      .then((d) => {
        setItems(d[listKey] || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [endpoint, siteId, listKey, queryString]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const createItem = useCallback(
    async (body: Record<string, unknown>) => {
      const res = await api.post<Record<string, unknown>>(endpoint, {
        ...body,
        site_id: siteId,
      });
      fetchItems();
      return res;
    },
    [endpoint, siteId, fetchItems],
  );

  const deleteItem = useCallback(
    async (id: string, method: 'query' | 'body' = 'query') => {
      if (method === 'query') {
        await api.delete(`${endpoint}?id=${id}`);
      } else {
        await api.delete(endpoint, { id });
      }
      fetchItems();
    },
    [endpoint, fetchItems],
  );

  return { items, loading, fetchItems, createItem, deleteItem };
}
