import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return new NextResponse('URL parameter is required', { status: 400 });
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        // It's good practice to set a user-agent that is not a browser's default
        'User-Agent': 'Grit-Selector-Proxy/1.0',
      },
    });

    if (!response.ok) {
      return new NextResponse(`Failed to fetch the URL: ${response.statusText}`, { status: response.status });
    }

    const text = await response.text();

    // We return the fetched HTML as a response. The browser will render it in the iframe.
    return new NextResponse(text, {
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch (error) {
    return new NextResponse(`An error occurred: ${error.message}`, { status: 500 });
  }
}
