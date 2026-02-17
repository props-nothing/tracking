import { NextRequest, NextResponse } from 'next/server';
import { sendWebhook } from '@/lib/webhooks';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { url, event, data } = await request.json();

  if (!url || !event) {
    return NextResponse.json({ error: 'url and event required' }, { status: 400 });
  }

  const success = await sendWebhook(url, {
    event,
    data: data || {},
    timestamp: new Date().toISOString(),
  });

  return NextResponse.json({ success });
}
