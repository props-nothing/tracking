import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { setSalt } from '@/lib/hash';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Generate new daily salt
    const newSalt = crypto.randomUUID() + '-' + Date.now().toString(36);

    const supabase = await createServiceClient();

    // Persist salt in system_settings table
    // Try direct table upsert first (migration 008 creates this table)
    const { error: upsertError } = await supabase
      .from('system_settings')
      .upsert(
        { key: 'daily_salt', value: newSalt, updated_at: new Date().toISOString() },
        { onConflict: 'key' },
      );

    if (upsertError) {
      console.warn('[rotate-salt] Could not persist to DB, using in-memory only:', upsertError.message);
    }

    // Update in-memory salt immediately for this instance
    setSalt(newSalt);

    return NextResponse.json({
      success: true,
      rotated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[rotate-salt] Error:', error);
    return NextResponse.json({ error: 'Failed to rotate salt' }, { status: 500 });
  }
}
