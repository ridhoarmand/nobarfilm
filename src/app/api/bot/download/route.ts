import { movieBoxService } from '@/lib/moviebox';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = (searchParams.get('id') || searchParams.get('subjectId') || '').trim();
  const seasonParam = searchParams.get('season') || searchParams.get('se');
  const episodeParam = searchParams.get('episode') || searchParams.get('ep');

  if (!id) {
    return NextResponse.json(
      {
        success: false,
        message: 'Parameter id (subjectId) wajib diisi.',
      },
      { status: 400 }
    );
  }

  try {
    // 1. Fetch Subject Detail first
    const detail = await movieBoxService.getDetail(id);
    const subject = detail.subject;
    const isSeries = subject.subjectType === 2;

    const season = seasonParam !== null && seasonParam !== undefined ? parseInt(seasonParam, 10) : (isSeries ? 1 : 0);
    const episode = episodeParam !== null && episodeParam !== undefined ? parseInt(episodeParam, 10) : (isSeries ? 1 : 0);

    // 2. Fetch Sources (Video Downloads & Captions)
    const sources = await movieBoxService.getSources(id, season, episode);

    const videoDownloads = (sources.downloads || []).map((item) => {
      const proxyUrl = `https://film.idho.eu.org/api/proxy/video?url=${encodeURIComponent(item.url)}`;
      return {
        resolution: `${item.resolution}p`,
        quality: item.resolution,
        size: item.size || 'Unknown',
        streamProxyUrl: proxyUrl,
        directCdnUrl: item.url,
      };
    });

    // Sort subtitles so Indonesian and English are listed first
    const rawCaptions = sources.captions || [];
    const sortedCaptions = [...rawCaptions].sort((a, b) => {
      const aName = (a.lanName || a.lan || '').toLowerCase();
      const bName = (b.lanName || b.lan || '').toLowerCase();
      const aIsId = aName.includes('indonesia') || a.lan.includes('id');
      const bIsId = bName.includes('indonesia') || b.lan.includes('id');
      const aIsEn = aName.includes('english') || a.lan.includes('en');
      const bIsEn = bName.includes('english') || b.lan.includes('en');

      if (aIsId) return -1;
      if (bIsId) return 1;
      if (aIsEn) return -1;
      if (bIsEn) return 1;
      return 0;
    });

    const subtitles = sortedCaptions.map((cap) => {
      const subtitleFilename = `${subject.title || 'subtitle'}_S${season}E${episode}_${cap.lanName || cap.lan}.srt`;
      const srtDownloadUrl = `https://film.idho.eu.org/api/subtitle?url=${encodeURIComponent(cap.url)}&download=true&format=srt&filename=${encodeURIComponent(subtitleFilename)}`;
      const vttUrl = `https://film.idho.eu.org/api/subtitle?url=${encodeURIComponent(cap.url)}`;

      return {
        language: cap.lanName || cap.lan,
        langCode: cap.lan,
        srtDownloadUrl,
        vttUrl,
        directCdnUrl: cap.url,
      };
    });

    return NextResponse.json({
      success: true,
      subject: {
        id: subject.subjectId,
        title: subject.title,
        type: isSeries ? 'Series' : 'Movie',
        season,
        episode,
        watchUrl: isSeries
          ? `https://film.idho.eu.org/watch/${subject.subjectId}?season=${season}&episode=${episode}`
          : `https://film.idho.eu.org/watch/${subject.subjectId}`,
      },
      videoDownloads,
      subtitles,
    });
  } catch (error: any) {
    console.error('[bot-download] API Error:', error.message);
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Gagal mengambil link download film & subtitle.',
      },
      { status: 500 }
    );
  }
}
