import { encryptedResponse } from "@/lib/api-utils";
import { movieBoxService } from "@/lib/moviebox";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  const { subjectId } = await params;
  const searchParams = request.nextUrl.searchParams;
  
  // Handle season/episode for movies (0/0) or series
  const season = searchParams.get("season") !== null ? parseInt(searchParams.get("season")!) : 0;
  const episode = searchParams.get("episode") !== null ? parseInt(searchParams.get("episode")!) : 1;

  try {
    const data = await movieBoxService.getSources(subjectId, season, episode);
    return encryptedResponse(data);
  } catch (error) {
    console.error('[sources] API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

