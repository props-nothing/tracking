'use client';

import { use, useEffect, useState, useRef, useCallback } from 'react';
import { useDateRange } from '@/hooks/use-date-range';
import { DateRangePicker } from '@/components/date-range-picker';
import { sankey, sankeyLinkHorizontal, SankeyNode, SankeyLink } from 'd3-sankey';

interface FlowNode {
  name: string;
}

interface FlowLink {
  source: number;
  target: number;
  value: number;
}

interface SankeyData {
  nodes: FlowNode[];
  links: FlowLink[];
}

const COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#06b6d4', '#3b82f6',
];

export default function FlowPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = use(params);
  const { period, setPeriod } = useDateRange();
  const [data, setData] = useState<SankeyData | null>(null);
  const [loading, setLoading] = useState(true);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/stats?site_id=${siteId}&period=${period}`)
      .then((res) => res.json())
      .then((stats) => {
        // Build flow data from top pages (sessions entry → pages → exit pattern)
        const topPages = (stats.top_pages || []).slice(0, 8);
        const entryPages = (stats.entry_pages || []).slice(0, 5);
        const exitPages = (stats.exit_pages || []).slice(0, 5);

        if (topPages.length < 2) {
          setData(null);
          setLoading(false);
          return;
        }

        // Create nodes: Step 1 (entry), Step 2 (page views), Step 3 (exit)
        const nodes: FlowNode[] = [];
        const nodeIndex: Record<string, number> = {};
        const links: FlowLink[] = [];

        const addNode = (name: string): number => {
          if (nodeIndex[name] !== undefined) return nodeIndex[name];
          nodeIndex[name] = nodes.length;
          nodes.push({ name });
          return nodeIndex[name];
        };

        // Entry points
        for (const entry of entryPages) {
          const entryIdx = addNode(`Entry: ${entry.path}`);
          // Connect entries to top pages they lead to
          for (const page of topPages.slice(0, 4)) {
            const pageIdx = addNode(page.path);
            const flowValue = Math.max(1, Math.min(entry.count, page.count) / topPages.length);
            links.push({ source: entryIdx, target: pageIdx, value: Math.round(flowValue) });
          }
        }

        // Internal page-to-page flows
        for (let i = 0; i < topPages.length - 1; i++) {
          const fromIdx = addNode(topPages[i].path);
          const toIdx = addNode(topPages[i + 1].path);
          if (fromIdx !== toIdx) {
            const flowValue = Math.min(topPages[i].count, topPages[i + 1].count) / 3;
            links.push({ source: fromIdx, target: toIdx, value: Math.max(1, Math.round(flowValue)) });
          }
        }

        // Exit points
        for (const exitPage of exitPages) {
          const pageIdx = addNode(exitPage.path);
          const exitIdx = addNode(`Exit: ${exitPage.path}`);
          if (pageIdx !== exitIdx) {
            links.push({ source: pageIdx, target: exitIdx, value: Math.max(1, exitPage.count) });
          }
        }

        // Filter out self-referencing links and zero-value links
        const validLinks = links.filter((l) => l.source !== l.target && l.value > 0);

        if (nodes.length >= 2 && validLinks.length >= 1) {
          setData({ nodes, links: validLinks });
        } else {
          setData(null);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [siteId, period]);

  const width = 800;
  const height = 500;

  const sankeyData = data ? (() => {
    try {
      const generator = sankey<FlowNode, FlowLink>()
        .nodeWidth(15)
        .nodePadding(12)
        .extent([[1, 1], [width - 1, height - 5]])
        .nodeSort(null);

      return generator({
        nodes: data.nodes.map((d) => ({ ...d })),
        links: data.links.map((d) => ({ ...d })),
      });
    } catch {
      return null;
    }
  })() : null;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">User Flow</h1>
          <p className="text-sm text-muted-foreground">Navigation path analysis (Sankey diagram)</p>
        </div>
        <DateRangePicker period={period} onPeriodChange={setPeriod} />
      </div>

      {loading ? (
        <div className="py-20 text-center text-sm text-muted-foreground">Loading...</div>
      ) : !sankeyData ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <h3 className="text-lg font-medium">Insufficient Data</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            The Sankey diagram requires sufficient pageview data with multiple pages visited.
            Keep tracking to accumulate enough session data.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card p-6 overflow-x-auto">
          <svg ref={svgRef} width={width} height={height} className="mx-auto">
            {/* Links */}
            {sankeyData.links.map((link, i) => {
              const path = sankeyLinkHorizontal()(link as any);
              if (!path) return null;
              const sNode = link.source as SankeyNode<FlowNode, FlowLink>;
              return (
                <path
                  key={`link-${i}`}
                  d={path}
                  fill="none"
                  stroke={COLORS[((sNode.index || 0) % COLORS.length)]}
                  strokeOpacity={0.3}
                  strokeWidth={Math.max(1, (link as any).width || 1)}
                >
                  <title>
                    {(link.source as SankeyNode<FlowNode, FlowLink>).name} → {(link.target as SankeyNode<FlowNode, FlowLink>).name}: {link.value}
                  </title>
                </path>
              );
            })}
            {/* Nodes */}
            {sankeyData.nodes.map((node, i) => {
              const n = node as SankeyNode<FlowNode, FlowLink>;
              const x0 = n.x0 || 0;
              const x1 = n.x1 || 0;
              const y0 = n.y0 || 0;
              const y1 = n.y1 || 0;
              return (
                <g key={`node-${i}`}>
                  <rect
                    x={x0}
                    y={y0}
                    width={x1 - x0}
                    height={Math.max(1, y1 - y0)}
                    fill={COLORS[i % COLORS.length]}
                    rx={2}
                  >
                    <title>{n.name}: {n.value}</title>
                  </rect>
                  <text
                    x={x0 < width / 2 ? x1 + 6 : x0 - 6}
                    y={(y0 + y1) / 2}
                    dy="0.35em"
                    textAnchor={x0 < width / 2 ? 'start' : 'end'}
                    className="fill-foreground text-xs"
                  >
                    {n.name.length > 30 ? n.name.slice(0, 30) + '...' : n.name}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}
    </div>
  );
}
