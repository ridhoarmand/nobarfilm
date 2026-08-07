import { movieBoxService } from '@/lib/moviebox';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = (searchParams.get('id') || searchParams.get('subjectId') || '').trim();

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
    const detail = await movieBoxService.getDetail(id);
    const subject = detail.subject;
    const isSeries = subject.subjectType === 2;

    const seasons = detail.resource?.seasons || [];
    const episodesInfo = {
      isSeries,
      totalSeasons: isSeries ? seasons.length : 0,
      seasons: seasons.map((s) => ({ season: s.se, maxEpisode: s.maxEp })),
    };

    const directors = (subject.staffList || []).filter((s) => s.staffType === 1).map((s) => s.name);
    const cast = (subject.staffList || []).filter((s) => s.staffType === 2).map((s) => s.name);

    return NextResponse.json({
      success: true,
      subject: {
        id: subject.subjectId,
        title: subject.title,
        description: subject.description || '',
        releaseDate: subject.releaseDate || '',
        duration: subject.duration ? `${subject.duration} min` : '',
        genre: subject.genre || '',
        country: subject.countryName || '',
        rating: subject.imdbRatingValue || '0.0',
        cover: subject.cover?.url || subject.coverHorizontalUrl || '',
        coverHorizontal: subject.coverHorizontalUrl || '',
        type: isSeries ? 'Series' : 'Movie',
        typeCode: subject.subjectType,
        directors,
        cast,
        watchUrl: `https://film.idho.eu.org/watch/${subject.subjectId}`,
      },
      episodesInfo,
    });
  } catch (error: any) {
    console.error('[bot-detail] API Error:', error.message);
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Gagal mengambil detail film.',
      },
      { status: 500 }
    );
  }
}
