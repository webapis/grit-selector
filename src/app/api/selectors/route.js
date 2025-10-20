import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';

export async function POST(request) {
  const { url, selectors } = await request.json();

  if (!url || !selectors) {
    return NextResponse.json({ error: 'URL and selectors are required' }, { status: 400 });
  }

  if (!supabaseAdmin) {
    console.error('Supabase service role key is not configured.');
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  // Here, you could add more validation for the selectors array

  try {
    const { data, error } = await supabaseAdmin
      .from('selectors')
      .insert([{ url, selectors }])
      .select();

    if (error) {
      console.error('Supabase DB Error:', error.message);
      return NextResponse.json({ error: 'Failed to save selectors' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error saving selectors:', error.message);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

export async function GET() {
  if (!supabaseAdmin) {
    console.error('Supabase service role key is not configured.');
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('selectors')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase DB Error:', error.message);
      return NextResponse.json({ error: 'Failed to fetch selectors' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching selectors:', error.message);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}