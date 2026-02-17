// PDF report generation using @react-pdf/renderer
// This module generates PDF reports server-side

import React from 'react';
import { renderToBuffer, Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#1f2937',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    borderBottomWidth: 2,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 16,
  },
  title: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 4,
  },
  logo: {
    width: 60,
    height: 60,
    objectFit: 'contain' as const,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  metricCard: {
    width: '30%',
    backgroundColor: '#f9fafb',
    borderRadius: 6,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  metricLabel: {
    fontSize: 8,
    color: '#6b7280',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
    marginTop: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 6,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    paddingVertical: 6,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: '#d1d5db',
    paddingBottom: 6,
    marginBottom: 4,
  },
  tableCellLabel: {
    flex: 3,
    fontSize: 9,
  },
  tableCellValue: {
    flex: 1,
    fontSize: 9,
    textAlign: 'right',
  },
  tableHeaderLabel: {
    flex: 3,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#6b7280',
    textTransform: 'uppercase' as const,
  },
  tableHeaderValue: {
    flex: 1,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#6b7280',
    textTransform: 'uppercase' as const,
    textAlign: 'right',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: '#9ca3af',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 8,
  },
});

interface ReportMetrics {
  pageviews: number;
  unique_visitors: number;
  sessions: number;
  bounce_rate: number;
  views_per_session: number;
  avg_engaged_time: number;
}

interface TableItem {
  label: string;
  count: number;
}

interface ReportData {
  title: string;
  description?: string;
  dateRange: string;
  logoUrl?: string;
  brandColor?: string;
  metrics: ReportMetrics;
  topPages: TableItem[];
  topReferrers: TableItem[];
  topCountries: TableItem[];
  topBrowsers: TableItem[];
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function ReportTable({ title, items, labelHeader, valueHeader }: {
  title: string;
  items: TableItem[];
  labelHeader: string;
  valueHeader: string;
}) {
  return React.createElement(View, { style: styles.section },
    React.createElement(Text, { style: styles.sectionTitle }, title),
    React.createElement(View, { style: styles.tableHeader },
      React.createElement(Text, { style: styles.tableHeaderLabel }, labelHeader),
      React.createElement(Text, { style: styles.tableHeaderValue }, valueHeader)
    ),
    ...items.slice(0, 10).map((item, i) =>
      React.createElement(View, { key: i, style: styles.tableRow },
        React.createElement(Text, { style: styles.tableCellLabel }, item.label),
        React.createElement(Text, { style: styles.tableCellValue }, formatNumber(item.count))
      )
    )
  );
}

function ReportDocument({ data }: { data: ReportData }) {
  return React.createElement(Document, {},
    React.createElement(Page, { size: 'A4', style: styles.page },
      // Header
      React.createElement(View, { style: styles.header },
        React.createElement(View, {},
          React.createElement(Text, { style: styles.title }, data.title),
          React.createElement(Text, { style: styles.subtitle }, data.dateRange),
          data.description ? React.createElement(Text, { style: { ...styles.subtitle, marginTop: 2 } }, data.description) : null
        ),
        data.logoUrl ? React.createElement(Image, { src: data.logoUrl, style: styles.logo }) : null
      ),
      // Metrics
      React.createElement(View, { style: styles.metricsGrid },
        ...[
          { label: 'Page Views', value: formatNumber(data.metrics.pageviews) },
          { label: 'Unique Visitors', value: formatNumber(data.metrics.unique_visitors) },
          { label: 'Sessions', value: formatNumber(data.metrics.sessions) },
          { label: 'Bounce Rate', value: `${data.metrics.bounce_rate}%` },
          { label: 'Views / Session', value: data.metrics.views_per_session.toString() },
          { label: 'Avg. Engaged Time', value: `${Math.round(data.metrics.avg_engaged_time / 1000)}s` },
        ].map((m, i) =>
          React.createElement(View, { key: i, style: styles.metricCard },
            React.createElement(Text, { style: styles.metricLabel }, m.label),
            React.createElement(Text, { style: styles.metricValue }, m.value)
          )
        )
      ),
      // Tables
      React.createElement(ReportTable, {
        title: 'Top Pages',
        items: data.topPages,
        labelHeader: 'Page',
        valueHeader: 'Views',
      }),
      React.createElement(ReportTable, {
        title: 'Top Referrers',
        items: data.topReferrers,
        labelHeader: 'Source',
        valueHeader: 'Visits',
      }),
      // Footer
      React.createElement(View, { style: styles.footer, fixed: true },
        React.createElement(Text, {}, `Generated ${new Date().toLocaleDateString()}`),
        React.createElement(Text, {}, 'Tracking Analytics')
      )
    ),
    // Page 2 — Geo & Devices
    React.createElement(Page, { size: 'A4', style: styles.page },
      React.createElement(ReportTable, {
        title: 'Top Countries',
        items: data.topCountries,
        labelHeader: 'Country',
        valueHeader: 'Visits',
      }),
      React.createElement(ReportTable, {
        title: 'Top Browsers',
        items: data.topBrowsers,
        labelHeader: 'Browser',
        valueHeader: 'Visits',
      }),
      React.createElement(View, { style: styles.footer, fixed: true },
        React.createElement(Text, {}, `Generated ${new Date().toLocaleDateString()}`),
        React.createElement(Text, {}, 'Tracking Analytics')
      )
    )
  );
}

export async function generateReportPDF(data: ReportData): Promise<Buffer> {
  const element = React.createElement(ReportDocument, { data });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(element as any);
  return Buffer.from(buffer);
}

export type { ReportData, ReportMetrics, TableItem };
