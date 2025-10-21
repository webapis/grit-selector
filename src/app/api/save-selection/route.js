import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Support multiple common env var names. Prefer server-side keys for writes.
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function getClient() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    const missing = [];
    if (!SUPABASE_URL) missing.push('SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL');
    if (!SUPABASE_KEY) missing.push('SUPABASE_KEY or SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY');
    throw new Error(`Supabase credentials are not set. Missing: ${missing.join(', ')}`);
  }

  // Warn (server logs) if using a public anon key for writes — service role is preferred
  if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_KEY) {
    console.warn('Using NEXT_PUBLIC_SUPABASE_ANON_KEY for server-side writes. Consider setting SUPABASE_SERVICE_ROLE_KEY or SUPABASE_KEY for secure server operations.');
  }

  return createClient(SUPABASE_URL, SUPABASE_KEY);
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { url, selector, results } = body;

    if (!selector || !url) {
      return NextResponse.json({ error: 'Missing url or selector' }, { status: 400 });
    }

    const supabase = getClient();

    // Persist a minimal payload. The results object can be large, so we stringify it.
    const payload = {
      url,
      selector,
      results: JSON.stringify(results || {}),
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase.from('selector_selections').insert(payload).select().single();

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ id: data.id, data });
  } catch (err) {
    console.error('Save selection error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
