import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const rateLimit = checkRateLimit(request, 10, 60000);
  if (!rateLimit.success && rateLimit.response) return rateLimit.response;

  try {
    const body = await request.json();
    const { text } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Parameter text wajib diisi' }, { status: 400 });
    }
    if (text.length > 5000) {
      return NextResponse.json({ error: 'Teks terlalu panjang (maks 5000 karakter)' }, { status: 413 });
    }

    // Call Google Translate free GTX endpoint
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=id&dt=t&q=${encodeURIComponent(text)}`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      next: { revalidate: 86400 } // Cache translation for 24h
    });

    if (!response.ok) {
      throw new Error(`Translation upstream error: ${response.status}`);
    }

    const data = await response.json();
    let translatedText = '';

    if (Array.isArray(data) && Array.isArray(data[0])) {
      translatedText = data[0].map((item: any) => item[0]).join('');
    }

    return NextResponse.json({
      success: true,
      originalText: text,
      translatedText: translatedText || text,
    });
  } catch (error: any) {
    console.error('Translation error:', error.message);
    return NextResponse.json(
      { error: error.message || 'Gagal menerjemahkan teks' },
      { status: 500 }
    );
  }
}
