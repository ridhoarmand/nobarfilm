import { encryptedResponse, getClientToken } from '@/lib/api-utils';
import { movieBoxService } from '@/lib/moviebox';
import { NextRequest, NextResponse } from 'next/server';

function inferAudioOptions(title: string) {
  const options = [{ code: 'orig', label: 'Original Audio' }];
  if (/english/i.test(title)) {
    options.push({ code: 'en', label: 'English Dub' });
  }
  return options;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  const { subjectId } = await params;
  const searchParams = request.nextUrl.searchParams;
  const season = searchParams.get('season') !== null ? parseInt(searchParams.get('season') || '0', 10) : undefined;
  const episode = searchParams.get('episode') !== null ? parseInt(searchParams.get('episode') || '0', 10) : undefined;

  try {
    const clientToken = getClientToken(request);
    const detail = await movieBoxService.getDetail(subjectId, clientToken);

    const seasons = detail.resource?.seasons || [];
    const selectedSeason = seasons.find((item) => item.se === (season ?? seasons[0]?.se ?? 0));
    const maxEpisode = selectedSeason?.maxEp || 1;
    const episodes = Array.from({ length: maxEpisode }, (_, idx) => idx + 1);

    const qualities = (selectedSeason?.resolutions || [])
      .map((item) => item.resolution)
      .filter((q) => Number.isFinite(q))
      .sort((a, b) => b - a);

    const dubs = detail.subject?.dubs || [];
    const audioDubs = dubs.filter((d: any) => d.type === 0);
    const audioOptions: Array<{ code: string; label: string }> = [];

    const hasOriginal = audioDubs.some((d: any) => d.original === true || d.subjectId === subjectId);
    if (!hasOriginal) {
      audioOptions.push({
        code: subjectId,
        label: 'Original Audio',
      });
    }

    for (const d of audioDubs) {
      audioOptions.push({
        code: d.subjectId,
        label: d.lanName || 'Audio Track',
      });
    }

    return encryptedResponse({
      subjectId,
      selected: {
        season: season ?? selectedSeason?.se ?? 0,
        episode: episode ?? 1,
      },
      seasons: seasons.map((item) => item.se).filter((item) => item > 0),
      episodes,
      qualities,
      audioOptions,
      subtitles: [],
      playerMode: 'direct',
      embedUrl: null,
    });
  } catch (error: any) {
    console.error('[player-metadata] API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: error.message?.includes('Akses Terbatas') ? 403 : 500 }
    );
  }
}
