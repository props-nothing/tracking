'use client';

import { Site } from '@/hooks/use-site';

interface SiteSwitcherProps {
  sites: Site[];
  currentSiteId: string | null;
  onSelect: (siteId: string) => void;
}

export function SiteSwitcher({ sites, currentSiteId, onSelect }: SiteSwitcherProps) {
  return (
    <select
      value={currentSiteId || ''}
      onChange={(e) => onSelect(e.target.value)}
      className="h-9 rounded-md border border-input bg-background px-3 text-sm"
    >
      {sites.map((site) => (
        <option key={site.id} value={site.id}>
          {site.name} ({site.domain})
        </option>
      ))}
    </select>
  );
}
