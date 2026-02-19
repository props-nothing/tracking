'use client';

import { useState, useEffect, useCallback } from 'react';
import { AIReportCard } from './ai-report-card';
import { AIConfigModal } from './ai-config-modal';
import type { AIAnalysis } from '@/lib/ai-engine';

interface AIReport {
  id: string;
  analysis: AIAnalysis;
  generated_at: string;
  model_used: string;
  tokens_used: number;
  period_start: string;
  period_end: string;
  comparison_start: string | null;
  comparison_end: string | null;
}

interface AIInsightsPanelProps {
  siteId: string;
  periodStart: string;
  periodEnd: string;
  /** When true (shared report), hides generate button and settings */
  readOnly?: boolean;
}

export function AIInsightsPanel({ siteId, periodStart, periodEnd, readOnly = false }: AIInsightsPanelProps) {
  const [report, setReport] = useState<AIReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<AIReport[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Fetch latest AI report
  const fetchLatest = useCallback(async () => {
    if (!siteId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/ai-reports?site_id=${siteId}&limit=1`);
      const data = await res.json();
      if (data.reports?.length > 0) {
        const r = data.reports[0];
        setReport({
          ...r,
          analysis: typeof r.analysis === 'string' ? JSON.parse(r.analysis) : r.analysis,
        });
      } else {
        setReport(null);
      }
    } catch {
      setReport(null);
    }
    setLoading(false);
  }, [siteId]);

  useEffect(() => {
    fetchLatest();
  }, [fetchLatest]);

  // Generate new analysis
  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/ai-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          site_id: siteId,
          period_start: periodStart,
          period_end: periodEnd,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Analysis failed');
        setGenerating(false);
        return;
      }

      setReport({
        id: data.id,
        analysis: typeof data.analysis === 'string' ? JSON.parse(data.analysis) : data.analysis,
        generated_at: data.generated_at || new Date().toISOString(),
        model_used: data.model_used,
        tokens_used: data.tokens_used,
        period_start: data.period_start || periodStart,
        period_end: data.period_end || periodEnd,
        comparison_start: data.comparison_start,
        comparison_end: data.comparison_end,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to generate analysis');
    }
    setGenerating(false);
  }

  // Load history
  async function loadHistory() {
    if (showHistory) {
      setShowHistory(false);
      return;
    }
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/ai-reports?site_id=${siteId}&limit=10`);
      const data = await res.json();
      setHistory(
        (data.reports || []).map((r: any) => ({
          ...r,
          analysis: typeof r.analysis === 'string' ? JSON.parse(r.analysis) : r.analysis,
        }))
      );
    } catch {
      setHistory([]);
    }
    setHistoryLoading(false);
    setShowHistory(true);
  }

  return (
    <div className="rounded-lg border bg-card">
      {/* Header */}
      <div
        className="flex cursor-pointer items-center justify-between px-6 py-4"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-muted p-1.5">
            <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-medium">AI Insights</h2>
            <p className="text-xs text-muted-foreground">
              {report ? `Last analyzed: ${new Date(report.generated_at).toLocaleDateString()}` : 'No analysis yet'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          {!readOnly && (
            <>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {generating ? (
                  <>
                    <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Analyzing...
                  </>
                ) : (
                  <>
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                    Generate Analysis
                  </>
                )}
              </button>

              <button
                onClick={loadHistory}
                className="inline-flex h-8 items-center rounded-md border px-2.5 text-xs text-muted-foreground hover:text-foreground"
                title="View history"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>

              <button
                onClick={() => setShowConfig(true)}
                className="inline-flex h-8 items-center rounded-md border px-2.5 text-xs text-muted-foreground hover:text-foreground"
                title="AI Settings"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </>
          )}

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="inline-flex h-8 items-center rounded-md px-1 text-muted-foreground hover:text-foreground"
          >
            <svg className={`h-4 w-4 transition-transform ${collapsed ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      {!collapsed && (
        <div className="border-t px-6 py-5">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
              {error}
            </div>
          )}

          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading AI insights...</div>
          ) : generating ? (
            <div className="flex flex-col items-center gap-3 py-12">
              <div className="rounded-full bg-muted p-3">
                <svg className="h-6 w-6 animate-spin text-muted-foreground" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">Analyzing your data...</p>
                <p className="mt-1 text-xs text-muted-foreground">This usually takes 10-30 seconds</p>
              </div>
            </div>
          ) : report ? (
            <AIReportCard
              analysis={report.analysis}
              generatedAt={report.generated_at}
              modelUsed={report.model_used}
              tokensUsed={report.tokens_used}
              periodStart={report.period_start}
              periodEnd={report.period_end}
              comparisonStart={report.comparison_start}
              comparisonEnd={report.comparison_end}
              compact={readOnly}
            />
          ) : (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <div className="rounded-full bg-muted p-3">
                <svg className="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium">No AI analysis yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {readOnly
                    ? 'AI insights have not been generated for this report.'
                    : 'Click "Generate Analysis" to get AI-powered insights on your analytics data.'}
                </p>
              </div>
            </div>
          )}

          {/* History */}
          {showHistory && (
            <div className="mt-6 border-t pt-4">
              <h3 className="mb-3 text-sm font-medium">Analysis History</h3>
              {historyLoading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : history.length === 0 ? (
                <p className="text-sm text-muted-foreground">No previous analyses found.</p>
              ) : (
                <div className="space-y-2">
                  {history.map(h => (
                    <button
                      key={h.id}
                      onClick={() => setReport(h)}
                      className={`w-full rounded-lg border p-3 text-left transition-colors hover:bg-muted/50 ${
                        report?.id === h.id ? 'border-primary bg-primary/5' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {h.period_start} – {h.period_end}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(h.generated_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {h.analysis?.summary || 'No summary available'}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Config modal */}
      {!readOnly && (
        <AIConfigModal
          siteId={siteId}
          open={showConfig}
          onClose={() => setShowConfig(false)}
        />
      )}
    </div>
  );
}
