import { NextRequest, NextResponse } from 'next/server';
import { encryptedResponse } from '@/lib/api-utils';
import { MeloloDetailResponse, MeloloStreamResponse } from '@/hooks/useMelolo';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const bookId = searchParams.get('bookId');
  const videoId = searchParams.get('videoId');

  if (!bookId || !videoId) {
    return NextResponse.json({ error: 'Missing bookId or videoId' }, { status: 400 });
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.sansekai.my.id/api';

    // Parallel fetch for detail and stream
    const [detailRes, streamRes] = await Promise.all([fetch(`${baseUrl}/melolo/detail?bookId=${bookId}`), fetch(`${baseUrl}/melolo/stream?videoId=${videoId}`)]);

    const detailData: MeloloDetailResponse = await detailRes.json();
    const streamData: MeloloStreamResponse = await streamRes.json();

    // Process Episodes from Detail
    const videoList = detailData?.data?.video_data?.video_list || [];
    const episodes = videoList.map((vid, index) => ({
      videoId: vid.vid,
      videoNo: index + 1, // Assuming 1-based index for display
    }));

    // Process Video Source from Stream
    const videoSources = [];
    if (streamData?.data?.main_url) {
      videoSources.push({
        quality: 'Auto',
        url: streamData.data.main_url,
      });
    }

    // Process Drama Info
    const drama = {
      bookId: bookId,
      title: detailData?.data?.video_data?.series_title || 'Unknown Title',
      cover: detailData?.data?.video_data?.series_cover || '',
    };

    const watchData = {
      videoSources,
      episodes,
      drama,
    };

    return encryptedResponse(watchData);
  } catch (error) {
    console.error('Error fetching Melolo watch data:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}
