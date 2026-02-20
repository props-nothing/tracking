import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import * as XLSX from 'xlsx';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const siteId = searchParams.get('site_id');
  const format = searchParams.get('format') || 'xlsx';
  const period = searchParams.get('period') || 'last_30_days';
  const type = searchParams.get('type') || 'events'; // events | sessions | leads

  if (!siteId) {
    return NextResponse.json({ error: 'site_id required' }, { status: 400 });
  }

  const now = new Date();
  let fromDate: Date;

  switch (period) {
    case 'today': fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()); break;
    case 'last_7_days': fromDate = new Date(now.getTime() - 7 * 86400000); break;
    case 'last_30_days': fromDate = new Date(now.getTime() - 30 * 86400000); break;
    case 'last_90_days': fromDate = new Date(now.getTime() - 90 * 86400000); break;
    default: fromDate = new Date(now.getTime() - 30 * 86400000);
  }

  const db = await createServiceClient();

  // Fetch data based on type
  let eventsData: Record<string, unknown>[] = [];
  let sessionsData: Record<string, unknown>[] = [];
  let leadsData: Record<string, unknown>[] = [];

  if (type === 'all' || type === 'events') {
    const { data: events } = await db
      .from('events')
      .select('timestamp, event_type, event_name, path, page_title, referrer_hostname, utm_source, utm_medium, utm_campaign, country_code, city, browser, os, device_type, session_id, visitor_hash, engaged_time_ms, scroll_depth_pct, form_id')
      .eq('site_id', siteId)
      .gte('timestamp', fromDate.toISOString())
      .order('timestamp', { ascending: false })
      .limit(10000);
    eventsData = events || [];
  }

  if (type === 'all' || type === 'sessions') {
    const { data: sessions } = await db
      .from('sessions')
      .select('id, started_at, exit_path, duration_ms, is_bounce, pageviews')
      .eq('site_id', siteId)
      .gte('started_at', fromDate.toISOString())
      .order('started_at', { ascending: false })
      .limit(10000);
    sessionsData = sessions || [];
  }

  if (type === 'all' || type === 'leads') {
    const { data: leads } = await db
      .from('leads')
      .select('created_at, lead_name, lead_email, lead_phone, lead_company, lead_message, form_id, page_path, referrer_hostname, utm_source, utm_medium, utm_campaign, country_code, city, device_type, status')
      .eq('site_id', siteId)
      .gte('created_at', fromDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(10000);
    leadsData = leads || [];
  }

  // Build Excel workbook with multiple sheets
  const wb = XLSX.utils.book_new();

  if (eventsData.length > 0) {
    const ws = XLSX.utils.json_to_sheet(eventsData.map(flattenRow));
    autoFitColumns(ws, eventsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Events');
  }

  if (sessionsData.length > 0) {
    const ws = XLSX.utils.json_to_sheet(sessionsData.map(flattenRow));
    autoFitColumns(ws, sessionsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Sessies');
  }

  if (leadsData.length > 0) {
    const ws = XLSX.utils.json_to_sheet(leadsData.map(flattenRow));
    autoFitColumns(ws, leadsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Leads');
  }

  // If no data at all, add an empty sheet
  if (wb.SheetNames.length === 0) {
    const ws = XLSX.utils.aoa_to_sheet([['Geen data voor deze periode']]);
    XLSX.utils.book_append_sheet(wb, ws, 'Leeg');
  }

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const filename = `analytics-${siteId}-${period}.xlsx`;

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

/** Flatten nested objects/arrays into strings for spreadsheet cells */
function flattenRow(row: Record<string, unknown>): Record<string, unknown> {
  const flat: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(row)) {
    if (val === null || val === undefined) {
      flat[key] = '';
    } else if (typeof val === 'object') {
      flat[key] = JSON.stringify(val);
    } else {
      flat[key] = val;
    }
  }
  return flat;
}

/** Auto-fit column widths based on content */
function autoFitColumns(ws: XLSX.WorkSheet, data: Record<string, unknown>[]) {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  ws['!cols'] = headers.map((h) => {
    const maxLen = Math.max(
      h.length,
      ...data.slice(0, 100).map((row) => {
        const val = row[h];
        if (val === null || val === undefined) return 0;
        return String(val).length;
      })
    );
    return { wch: Math.min(maxLen + 2, 50) };
  });
}
