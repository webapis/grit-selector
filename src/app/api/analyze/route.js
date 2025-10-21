import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

let puppeteer;

// Dynamic import for Puppeteer to work with Next.js
async function getPuppeteer() {
  if (!puppeteer) {
    puppeteer = (await import('puppeteer')).default;
  }
  return puppeteer;
}

export async function POST(request) {
  let browser;
  try {
    const { url } = await request.json();

    // Get Puppeteer instance
    const puppeteer = await getPuppeteer();

    // Launch browser
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Set viewport
    await page.setViewport({ width: 1280, height: 800 });

    // Navigate to the URL
    await page.goto(url, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Instead of injecting function strings, we inject a bundled script.
    // This is a more robust way to handle dependencies.
    // NOTE: This assumes you have a build step that creates 'dist/browser.js'.
    // For development, you might need to handle this differently (e.g., using a bundler on the fly).
    // For this example, let's pretend we have a pre-built file.
    // A better long-term solution would be to bundle `src/lib/browser/index.js` to a single file.
    const browserScriptPath = path.join(process.cwd(), 'src', 'lib', 'identifyProductContainers.js');
    await page.addScriptTag({ path: browserScriptPath });

    // Run the analysis
    const results = await page.evaluate(() => identifyProductContainersSerializable());

    await browser.close();

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Analysis error:', error);
    if (browser) {
      await browser.close();
    }
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}