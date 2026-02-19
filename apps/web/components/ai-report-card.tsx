'use client';

import type { AIAnalysis, AIHighlight, ActionItem } from '@/lib/ai-engine';

interface AIReportCardProps {
  analysis: AIAnalysis;
  generatedAt?: string;
  modelUsed?: string;
  tokensUsed?: number;
  periodStart?: string;
  periodEnd?: string;
  comparisonStart?: string | null;
  comparisonEnd?: string | null;
  compact?: boolean;
}

const highlightColors: Record<AIHighlight['type'], { bg: string; text: string; icon: string }> = {
  positive: { bg: 'bg-green-50 dark:bg-green-950/30', text: 'text-green-700 dark:text-green-400', icon: '↑' },
  negative: { bg: 'bg-red-50 dark:bg-red-950/30', text: 'text-red-700 dark:text-red-400', icon: '↓' },
  neutral: { bg: 'bg-blue-50 dark:bg-blue-950/30', text: 'text-blue-700 dark:text-blue-400', icon: '→' },
  opportunity: { bg: 'bg-amber-50 dark:bg-amber-950/30', text: 'text-amber-700 dark:text-amber-400', icon: '★' },
};

const priorityColors: Record<ActionItem['priority'], string> = {
  high: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  low: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
};

export function AIReportCard({
  analysis,
  generatedAt,
  modelUsed,
  tokensUsed,
  periodStart,
  periodEnd,
  comparisonStart,
  comparisonEnd,
  compact = false,
}: AIReportCardProps) {
  if (!analysis) return null;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="rounded-lg border bg-gradient-to-r from-indigo-50 to-purple-50 p-5 dark:from-indigo-950/20 dark:to-purple-950/20">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-full bg-indigo-100 p-2 dark:bg-indigo-900/50">
            <svg className="h-4 w-4 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">AI Summary</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{analysis.summary}</p>
          </div>
        </div>
        {(generatedAt || modelUsed) && (
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
            {generatedAt && <span>Generated {new Date(generatedAt).toLocaleString()}</span>}
            {periodStart && periodEnd && <span>Period: {periodStart} – {periodEnd}</span>}
            {comparisonStart && comparisonEnd && <span>vs {comparisonStart} – {comparisonEnd}</span>}
            {modelUsed && <span>Model: {modelUsed}</span>}
            {tokensUsed && <span>{tokensUsed.toLocaleString()} tokens</span>}
          </div>
        )}
      </div>

      {/* Highlights */}
      {analysis.highlights?.length > 0 && (
        <div>
          <h4 className="mb-3 text-sm font-medium text-foreground">Key Findings</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            {analysis.highlights.map((h, i) => {
              const colors = highlightColors[h.type] || highlightColors.neutral;
              return (
                <div key={i} className={`rounded-lg border p-4 ${colors.bg}`}>
                  <div className="flex items-start gap-2">
                    <span className={`text-lg font-bold ${colors.text}`}>{colors.icon}</span>
                    <div>
                      <p className={`text-sm font-medium ${colors.text}`}>{h.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{h.detail}</p>
                      {h.change_pct !== undefined && (
                        <span className={`mt-1 inline-block text-xs font-semibold ${colors.text}`}>
                          {h.change_pct >= 0 ? '+' : ''}{h.change_pct}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!compact && (
        <>
          {/* Lead Insights */}
          {analysis.lead_insights && (analysis.lead_insights.top_sources || analysis.lead_insights.recommendations?.length > 0) && (
            <InsightSection title="Lead Insights" icon="👥">
              {analysis.lead_insights.top_sources && (
                <p className="text-sm text-muted-foreground">{analysis.lead_insights.top_sources}</p>
              )}
              {analysis.lead_insights.quality_assessment && (
                <p className="mt-2 text-sm text-muted-foreground"><strong>Quality:</strong> {analysis.lead_insights.quality_assessment}</p>
              )}
              {analysis.lead_insights.recommendations?.length > 0 && (
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-muted-foreground">
                  {analysis.lead_insights.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              )}
            </InsightSection>
          )}

          {/* Campaign Insights */}
          {analysis.campaign_insights && (analysis.campaign_insights.best_performing || analysis.campaign_insights.new_ideas?.length > 0) && (
            <InsightSection title="Campaign Insights" icon="📊">
              {analysis.campaign_insights.best_performing && (
                <p className="text-sm text-muted-foreground"><strong>Best:</strong> {analysis.campaign_insights.best_performing}</p>
              )}
              {analysis.campaign_insights.worst_performing && (
                <p className="mt-1 text-sm text-muted-foreground"><strong>Worst:</strong> {analysis.campaign_insights.worst_performing}</p>
              )}
              {analysis.campaign_insights.budget_recommendations?.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs font-medium text-foreground">Budget Recommendations:</p>
                  <ul className="mt-1 list-inside list-disc space-y-1 text-sm text-muted-foreground">
                    {analysis.campaign_insights.budget_recommendations.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              )}
              {analysis.campaign_insights.new_ideas?.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs font-medium text-foreground">New Ideas:</p>
                  <ul className="mt-1 list-inside list-disc space-y-1 text-sm text-muted-foreground">
                    {analysis.campaign_insights.new_ideas.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              )}
            </InsightSection>
          )}

          {/* Traffic Insights */}
          {analysis.traffic_insights && (analysis.traffic_insights.trends || analysis.traffic_insights.opportunities?.length > 0) && (
            <InsightSection title="Traffic Insights" icon="📈">
              {analysis.traffic_insights.trends && (
                <p className="text-sm text-muted-foreground">{analysis.traffic_insights.trends}</p>
              )}
              {analysis.traffic_insights.anomalies?.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs font-medium text-foreground">Anomalies:</p>
                  <ul className="mt-1 list-inside list-disc space-y-1 text-sm text-muted-foreground">
                    {analysis.traffic_insights.anomalies.map((a, i) => <li key={i}>{a}</li>)}
                  </ul>
                </div>
              )}
              {analysis.traffic_insights.opportunities?.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs font-medium text-foreground">Opportunities:</p>
                  <ul className="mt-1 list-inside list-disc space-y-1 text-sm text-muted-foreground">
                    {analysis.traffic_insights.opportunities.map((o, i) => <li key={i}>{o}</li>)}
                  </ul>
                </div>
              )}
            </InsightSection>
          )}

          {/* Page Insights */}
          {analysis.page_insights && (analysis.page_insights.top_performers || analysis.page_insights.optimization_suggestions?.length > 0) && (
            <InsightSection title="Page Insights" icon="📄">
              {analysis.page_insights.top_performers && (
                <p className="text-sm text-muted-foreground"><strong>Top:</strong> {analysis.page_insights.top_performers}</p>
              )}
              {analysis.page_insights.underperformers && (
                <p className="mt-1 text-sm text-muted-foreground"><strong>Needs attention:</strong> {analysis.page_insights.underperformers}</p>
              )}
              {analysis.page_insights.optimization_suggestions?.length > 0 && (
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-muted-foreground">
                  {analysis.page_insights.optimization_suggestions.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              )}
            </InsightSection>
          )}

          {/* Comparison */}
          {analysis.comparison && (
            <InsightSection title="Period Comparison" icon="🔄">
              <p className="text-sm text-muted-foreground">{analysis.comparison.summary}</p>
              {analysis.comparison.improvements?.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs font-medium text-green-600 dark:text-green-400">Improvements:</p>
                  <ul className="mt-1 list-inside list-disc space-y-1 text-sm text-muted-foreground">
                    {analysis.comparison.improvements.map((i, idx) => <li key={idx}>{i}</li>)}
                  </ul>
                </div>
              )}
              {analysis.comparison.regressions?.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs font-medium text-red-600 dark:text-red-400">Regressions:</p>
                  <ul className="mt-1 list-inside list-disc space-y-1 text-sm text-muted-foreground">
                    {analysis.comparison.regressions.map((r, idx) => <li key={idx}>{r}</li>)}
                  </ul>
                </div>
              )}
              {analysis.comparison.campaign_comparison && (
                <p className="mt-2 text-sm text-muted-foreground"><strong>Campaign:</strong> {analysis.comparison.campaign_comparison}</p>
              )}
            </InsightSection>
          )}
        </>
      )}

      {/* Action Items */}
      {analysis.action_items?.length > 0 && (
        <div>
          <h4 className="mb-3 text-sm font-medium text-foreground">Action Items</h4>
          <div className="space-y-2">
            {analysis.action_items.map((item, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg border bg-card p-3">
                <span className={`mt-0.5 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${priorityColors[item.priority]}`}>
                  {item.priority}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{item.action}</p>
                  <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="rounded bg-muted px-1.5 py-0.5">{item.category}</span>
                    <span>Expected: {item.expected_impact}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confidence notes */}
      {analysis.confidence_notes && (
        <p className="text-xs italic text-muted-foreground">{analysis.confidence_notes}</p>
      )}
    </div>
  );
}

/* Reusable collapsible insight section */
function InsightSection({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card p-5">
      <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
        <span>{icon}</span>
        {title}
      </h4>
      {children}
    </div>
  );
}
