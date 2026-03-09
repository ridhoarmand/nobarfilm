import { safeJson, encryptedResponse } from "@/lib/api-utils";
import { NextRequest, NextResponse } from "next/server";

const UPSTREAM_API = (process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.sansekai.my.id/api") + "/moviebox";

const MOVIEBOX_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.143 Safari/537.36',
  'Accept-Encoding': 'gzip',
  'Sec-WebSocket-Version': '13',
  'Cache-Control': 'no-cache',
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  const { subjectId } = await params;
  const searchParams = request.nextUrl.searchParams;
  // Use !== null to properly handle season=0 and episode=0 for movies
  const season = searchParams.get("season") !== null ? searchParams.get("season") : "0";
  const episode = searchParams.get("episode") !== null ? searchParams.get("episode") : "1";

  const upstreamUrl = `${UPSTREAM_API}/sources?subjectId=${subjectId}&season=${season}&episode=${episode}`;

  try {
    const response = await fetch(upstreamUrl, {
      headers: MOVIEBOX_HEADERS,
      // Don't cache sources — URLs expire
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "(unreadable)");
      console.error(`[sources] Upstream ${response.status}: ${errorText.substring(0, 300)}`);
      return NextResponse.json(
        { error: `Upstream error ${response.status}`, detail: errorText.substring(0, 200) },
        { status: response.status }
      );
    }

    const data = await safeJson(response);
    return encryptedResponse(data);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[sources] Exception for ${upstreamUrl}: ${msg}`);
    return NextResponse.json(
      { error: "Internal Server Error", detail: msg },
      { status: 500 }
    );
  }
}

