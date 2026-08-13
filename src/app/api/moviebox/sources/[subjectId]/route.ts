import { encryptedResponse, getClientToken } from "@/lib/api-utils";
import { movieBoxService } from "@/lib/moviebox";
import { checkRateLimit } from "@/lib/rate-limit";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  const rateLimit = checkRateLimit(request, 10, 10000);
  if (!rateLimit.success && rateLimit.response) {
    return rateLimit.response;
  }

  const { subjectId } = await params;
  const searchParams = request.nextUrl.searchParams;
  
  const seasonRaw = searchParams.get('season');
  const episodeRaw = searchParams.get('episode');
  const seasonParsed = seasonRaw !== null ? parseInt(seasonRaw, 10) : undefined;
  const episodeParsed = episodeRaw !== null ? parseInt(episodeRaw, 10) : undefined;
  const season = Number.isFinite(seasonParsed) ? seasonParsed : undefined;
  const episode = Number.isFinite(episodeParsed) ? episodeParsed : undefined;

  try {
    const clientToken = getClientToken(request);
    const data = await movieBoxService.getSources(subjectId, season, episode, clientToken);
    console.log('[sources route] Called for subjectId:', subjectId, 'downloads count:', data?.downloads?.length, 'hasResource:', data?.hasResource);
    return encryptedResponse(data);
  } catch (error: any) {
    console.error('[sources] API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: error.message?.includes('Akses Terbatas') ? 403 : 500 }
    );
  }
}

