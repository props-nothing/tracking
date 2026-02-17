import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const siteId = searchParams.get('site_id');
  const format = searchParams.get('format') || 'json';
  const period = searchParams.get('period') || 'last_30_days';
  const type = searchParams.get('type') || 'events'; // events | sessions

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

  let data: Record<string, unknown>[];

  if (type === 'sessions') {
    const { data: sessions } = await supabase
      .from('sessions')
      .select('*')
      .eq('site_id', siteId)
      .gte('started_at', fromDate.toISOString())
      .order('started_at', { ascending: false })
      .limit(10000);
    data = sessions || [];
  } else {
    const { data: events } = await supabase
      .from('events')
      .select('*')
      .eq('site_id', siteId)
      .gte('timestamp', fromDate.toISOString())
      .order('timestamp', { ascending: false })
      .limit(10000);
    data = events || [];
  }

  if (format === 'csv') {
    if (data.length === 0) {
      return new NextResponse('', {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${type}-export.csv"`,
        },
      });
    }

    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map((row) =>
        headers.map((h) => {
          const val = row[h];
          if (val === null || val === undefined) return '';
          const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
          return str.includes(',') || str.includes('"') || str.includes('\n')
            ? `"${str.replace(/"/g, '""')}"`
            : str;
        }).join(',')
      ),
    ];

    return new NextResponse(csvRows.join('\n'), {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${type}-export.csv"`,
      },
    });
  }

  return NextResponse.json(data);
}
