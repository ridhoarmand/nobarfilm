import { NextRequest, NextResponse } from 'next/server';// Helper function to convert SRT to VTT
function srtToVtt(srtContent: string): string {
  // Replace comma with dot in timestamps (00:00:00,000 --> 00:00:00.000)
  const vttContent = srtContent.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');

  // Add WEBVTT header
  return `WEBVTT\n\n${vttContent}`;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
  }

  try {
    // Fetch subtitle content from external server
    const response = await fetch(url, {
      headers: {
        // Mimic a browser to avoid some blocking
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch subtitle: ${response.status} ${response.statusText}`);
    }

    const srtContent = await response.text();

    // Convert to WebVTT
    const vttContent = srtToVtt(srtContent);

    // Return the response with correct Content-Type for VTT
    return new NextResponse(vttContent, {
      headers: {
        'Content-Type': 'text/vtt',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Subtitle proxy error:', message);
    return NextResponse.json({ error: 'Failed to fetch subtitle' }, { status: 500 });
  }
}
