'use client';

import { use, useEffect, useState, useCallback } from 'react';
import { useDashboard } from '@/hooks/use-dashboard-context';
import { MetricCard } from '@/components/metric-card';
import { DataTable } from '@/components/tables/data-table';

interface Lead {
  id: number;
  lead_name: string | null;
  lead_email: string | null;
  lead_phone: string | null;
  lead_company: string | null;
  lead_message: string | null;
  form_id: string | null;
  page_path: string | null;
  referrer_hostname: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  country_code: string | null;
  city: string | null;
  device_type: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

interface LeadStats {
  total_leads: number;
  new_leads: number;
  this_week: number;
  this_month: number;
}

const STATUS_OPTIONS = ['new', 'contacted', 'qualified', 'converted', 'archived'] as const;
const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  contacted: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  qualified: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  converted: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  archived: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
};

function getSourceLabel(lead: Lead): string {
  if (lead.utm_source) {
    const parts = [lead.utm_source];
    if (lead.utm_medium) parts.push(lead.utm_medium);
    return parts.join(' / ');
  }
  if (lead.referrer_hostname) return lead.referrer_hostname;
  return 'Direct';
}

function getSourceBadgeColor(lead: Lead): string {
  const src = (lead.utm_source || lead.referrer_hostname || '').toLowerCase();
  if (src.includes('google')) return 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300';
  if (src.includes('facebook') || src.includes('meta') || src.includes('instagram'))
    return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300';
  if (src.includes('linkedin')) return 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300';
  if (src.includes('twitter') || src.includes('x.com'))
    return 'bg-gray-50 text-gray-700 dark:bg-gray-950 dark:text-gray-300';
  if (src.includes('tiktok')) return 'bg-pink-50 text-pink-700 dark:bg-pink-950 dark:text-pink-300';
  return 'bg-gray-50 text-gray-700 dark:bg-gray-950 dark:text-gray-300';
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function LeadsPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = use(params);
  const { queryString } = useDashboard();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<LeadStats>({ total_leads: 0, new_leads: 0, this_week: 0, this_month: 0 });
  const [sources, setSources] = useState<{ source: string; count: number }[]>([]);
  const [mediums, setMediums] = useState<{ medium: string; count: number }[]>([]);
  const [campaigns, setCampaigns] = useState<{ campaign: string; count: number }[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [expandedLead, setExpandedLead] = useState<number | null>(null);

  const fetchLeads = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({
      site_id: siteId,
      page: page.toString(),
      page_size: '25',
    });
    if (statusFilter) params.set('status', statusFilter);
    if (sourceFilter) params.set('source', sourceFilter);
    if (search) params.set('search', search);

    fetch(`/api/leads?${params}`)
      .then((res) => res.json())
      .then((data) => {
        setLeads(data.leads || []);
        setTotal(data.total || 0);
        setStats(data.stats || { total_leads: 0, new_leads: 0, this_week: 0, this_month: 0 });
        setSources(data.sources || []);
        setMediums(data.mediums || []);
        setCampaigns(data.campaigns || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [siteId, page, statusFilter, sourceFilter, search]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const updateLeadStatus = async (leadId: number, newStatus: string) => {
    await fetch('/api/leads', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: leadId, status: newStatus }),
    });
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l))
    );
  };

  const totalPages = Math.max(1, Math.ceil(total / 25));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
          <p className="text-sm text-muted-foreground">
            Form submissions with source attribution
          </p>
        </div>
      </div>

      {loading && leads.length === 0 ? (
        <div className="py-20 text-center text-sm text-muted-foreground">Loading...</div>
      ) : (
        <>
          {/* Stats cards */}
          <div className="grid gap-4 sm:grid-cols-4">
            <MetricCard title="Total Leads" value={stats.total_leads.toString()} />
            <MetricCard title="New (Uncontacted)" value={stats.new_leads.toString()} />
            <MetricCard title="This Week" value={stats.this_week.toString()} />
            <MetricCard title="This Month" value={stats.this_month.toString()} />
          </div>

          {/* Source attribution overview */}
          <div className="grid gap-6 lg:grid-cols-3">
            <DataTable
              title="Lead Sources"
              columns={[
                { key: 'source', label: 'Source' },
                { key: 'count', label: 'Leads', align: 'right' },
              ]}
              data={sources}
            />
            <DataTable
              title="Lead Mediums"
              columns={[
                { key: 'medium', label: 'Medium' },
                { key: 'count', label: 'Leads', align: 'right' },
              ]}
              data={mediums}
            />
            <DataTable
              title="Lead Campaigns"
              columns={[
                { key: 'campaign', label: 'Campaign' },
                { key: 'count', label: 'Leads', align: 'right' },
              ]}
              data={campaigns}
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              placeholder="Search name, email, company..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="rounded-md border bg-transparent px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary w-64"
            />
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
              className="rounded-md border bg-transparent px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
            <select
              value={sourceFilter}
              onChange={(e) => { setSourceFilter(e.target.value); setPage(0); }}
              className="rounded-md border bg-transparent px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">All sources</option>
              {sources.map((s) => (
                <option key={s.source} value={s.source}>{s.source} ({s.count})</option>
              ))}
            </select>
          </div>

          {/* Leads table */}
          {leads.length === 0 ? (
            <div className="rounded-lg border bg-card p-12 text-center">
              <h3 className="text-lg font-medium">No leads yet</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Enable lead capture by adding{' '}
                <code className="rounded bg-muted px-1 text-xs">data-capture-leads=&quot;true&quot;</code>{' '}
                to your tracking script or individual forms.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Example: <code className="rounded bg-muted px-1">&lt;script src=&quot;...&quot; data-site-id=&quot;...&quot; data-capture-leads=&quot;true&quot;&gt;&lt;/script&gt;</code>
              </p>
            </div>
          ) : (
            <div className="rounded-lg border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground">
                      <th className="px-4 py-2.5 text-left font-medium">Name</th>
                      <th className="px-4 py-2.5 text-left font-medium">Email</th>
                      <th className="px-4 py-2.5 text-left font-medium">Source</th>
                      <th className="px-4 py-2.5 text-left font-medium">Campaign</th>
                      <th className="px-4 py-2.5 text-left font-medium">Form</th>
                      <th className="px-4 py-2.5 text-left font-medium">Status</th>
                      <th className="px-4 py-2.5 text-left font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((lead) => (
                      <>
                        <tr
                          key={lead.id}
                          className="border-b hover:bg-muted/50 cursor-pointer transition-colors text-sm"
                          onClick={() => setExpandedLead(expandedLead === lead.id ? null : lead.id)}
                        >
                          <td className="px-4 py-3 font-medium">
                            {lead.lead_name || <span className="text-muted-foreground italic">—</span>}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {lead.lead_email || '—'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getSourceBadgeColor(lead)}`}>
                              {getSourceLabel(lead)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">
                            {lead.utm_campaign || '—'}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">
                            {lead.form_id || '—'}
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={lead.status}
                              onChange={(e) => {
                                e.stopPropagation();
                                updateLeadStatus(lead.id, e.target.value);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className={`rounded-full px-2 py-0.5 text-xs font-medium border-0 cursor-pointer ${STATUS_COLORS[lead.status] || ''}`}
                            >
                              {STATUS_OPTIONS.map((s) => (
                                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                            {formatDate(lead.created_at)}
                          </td>
                        </tr>
                        {expandedLead === lead.id && (
                          <tr key={`${lead.id}-detail`} className="border-b bg-muted/30">
                            <td colSpan={7} className="px-6 py-4">
                              <div className="grid gap-4 sm:grid-cols-3 text-sm">
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground mb-1">Contact Details</p>
                                  {lead.lead_name && <p><span className="text-muted-foreground">Name:</span> {lead.lead_name}</p>}
                                  {lead.lead_email && <p><span className="text-muted-foreground">Email:</span> {lead.lead_email}</p>}
                                  {lead.lead_phone && <p><span className="text-muted-foreground">Phone:</span> {lead.lead_phone}</p>}
                                  {lead.lead_company && <p><span className="text-muted-foreground">Company:</span> {lead.lead_company}</p>}
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground mb-1">Attribution</p>
                                  <p><span className="text-muted-foreground">Source:</span> {lead.utm_source || lead.referrer_hostname || 'Direct'}</p>
                                  {lead.utm_medium && <p><span className="text-muted-foreground">Medium:</span> {lead.utm_medium}</p>}
                                  {lead.utm_campaign && <p><span className="text-muted-foreground">Campaign:</span> {lead.utm_campaign}</p>}
                                  {lead.page_path && <p><span className="text-muted-foreground">Page:</span> {lead.page_path}</p>}
                                  {lead.referrer_hostname && <p><span className="text-muted-foreground">Referrer:</span> {lead.referrer_hostname}</p>}
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground mb-1">Context</p>
                                  {lead.country_code && <p><span className="text-muted-foreground">Location:</span> {lead.city ? `${lead.city}, ` : ''}{lead.country_code}</p>}
                                  {lead.device_type && <p><span className="text-muted-foreground">Device:</span> {lead.device_type}</p>}
                                  {lead.form_id && <p><span className="text-muted-foreground">Form:</span> {lead.form_id}</p>}
                                  {lead.lead_message && (
                                    <div className="mt-2">
                                      <p className="text-muted-foreground">Message:</p>
                                      <p className="mt-0.5 rounded bg-background p-2 text-xs whitespace-pre-wrap">{lead.lead_message}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
                  <span className="text-muted-foreground">
                    {total} lead{total !== 1 ? 's' : ''} total
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={page === 0}
                      onClick={() => setPage(page - 1)}
                      className="rounded px-2 py-1 text-xs hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="text-xs text-muted-foreground">
                      Page {page + 1} of {totalPages}
                    </span>
                    <button
                      disabled={page >= totalPages - 1}
                      onClick={() => setPage(page + 1)}
                      className="rounded px-2 py-1 text-xs hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
