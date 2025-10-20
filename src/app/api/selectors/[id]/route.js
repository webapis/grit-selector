import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';

export async function DELETE(request, { params }) {
  const { id } = params;

  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 });
  }

  if (!supabaseAdmin) {
    console.error('Supabase service role key is not configured.');
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  try {
    const { error } = await supabaseAdmin
      .from('selectors')
      .delete()
      .match({ id });

    if (error) {
      console.error('Supabase DB Error:', error.message);
      return NextResponse.json({ error: 'Failed to delete selector' }, { status: 500 });
    }

    return new NextResponse(null, { status: 204 }); // No Content
  } catch (error) {
    console.error('Error deleting selector:', error.message);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const { id } = params;
  const { url, selectors } = await request.json();

  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 });
  }

  if (!url || !selectors) {
    return NextResponse.json({ error: 'URL and selectors are required' }, { status: 400 });
  }

  if (!supabaseAdmin) {
    console.error('Supabase service role key is not configured.');
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('selectors')
      .update({ url, selectors })
      .match({ id })
      .select();

    if (error) {
      console.error('Supabase DB Error:', error.message);
      return NextResponse.json({ error: 'Failed to update selector' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating selector:', error.message);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}