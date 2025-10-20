
import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { setupDOMBridge } from '@/app/setupDOMBridge';

// Initialize Supabase client using the official Next.js naming convention
// Use the server-side admin client which requires a service role key. Ensure this
// environment variable is set only on the server and not exposed to the browser.
if (!supabaseAdmin) {
  console.error('Supabase service role key is not configured. Set SUPABASE_SERVICE_ROLE_KEY in your environment.');
}
const supabase = supabaseAdmin;

// Fail fast: if the server admin client is missing, return an error for API callers.
// We'll check for `supabase` inside the POST handler and return a 500 if it's missing.


// Log a masked version of the service key for debugging (first 8 chars only).
const rawKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (rawKey) {
  try {
    const masked = `${rawKey.toString().slice(0, 8)}...`;
    console.log('Using Supabase key (masked):', masked);
  } catch (e) {
    // ignore logging errors
  }
} else {
  console.log('No Supabase key found in environment variables.');
}

export async function POST(request) {
  let browser = null;
  // Fail fast if the server-side supabase admin client isn't configured
  if (!supabase) {
    console.error('SUPABASE_SERVICE_ROLE_KEY is missing; cannot initialize server-side Supabase client.');
    return NextResponse.json({ error: 'Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY is missing' }, { status: 500 });
  }
  const { url, queries } = await request.json();

  try {
    if (!url || !queries) {
      return NextResponse.json({ error: 'URL and queries are required' }, { status: 400 });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch (e) {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }
    
    // Basic validation for queries
    if (typeof queries !== 'object' || queries === null || Array.isArray(queries)) {
        return NextResponse.json({ error: 'Queries must be a JSON object' }, { status: 400 });
    }

    browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    await page.goto(url, { waitUntil: 'networkidle0' });

    await setupDOMBridge(page);

    const data = await page.dom.batch(queries);

    // Log successful scrape to Supabase
    try {
      const { error: dbError } = await supabase
        .from('scrape_logs')
        .insert([{ 
          target_url: url, 
          queries: queries, 
          results: data 
        }]);
      if (dbError) {
        // Don't throw here, just log it. The main function is scraping, not DB logging.
        console.error('Supabase DB Error:', dbError.message);
      }
    } catch (dbInsertError) {
      console.error('Failed to log to Supabase:', dbInsertError.message);
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('Scraping failed:', error.message);

    // Log failed scrape to Supabase
    try {
      const { error: dbError } = await supabase
        .from('scrape_logs')
        .insert([{ 
          target_url: url, 
          queries: queries, 
          error: error.message 
        }]);
      if (dbError) {
        console.error('Supabase DB Error:', dbError.message);
      }
    } catch (dbInsertError) {
      console.error('Failed to log to Supabase:', dbInsertError.message);
    }

    return NextResponse.json({ error: `Failed to scrape page. ${error.message}` }, { status: 500 });

  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
