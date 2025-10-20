import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import { setupDOMBridge } from '@/app/setupDOMBridge';

export async function POST(request) {
  let browser = null;
  try {
    const { url, queries } = await request.json();

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

    return NextResponse.json(data);
  } catch (error) {
    console.error('Scraping failed:', error);
    return NextResponse.json({ error: `Failed to scrape page. ${error.message}` }, { status: 500 });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}