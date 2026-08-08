'use client';

// In-memory Blob URL cache for temporary subtitle storage
interface CachedSubtitle {
  blobUrl: string;
  timestamp: number;
}

const subtitleBlobCache = new Map<string, CachedSubtitle>();

// Subtitle Cache Cleaner (Interval Cleaner to prevent memory bloat)
const MAX_CACHE_AGE_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Clean temporary subtitle Blob URLs older than MAX_CACHE_AGE_MS
 */
export function cleanSubtitleCache() {
  const now = Date.now();
  for (const [key, item] of subtitleBlobCache.entries()) {
    if (now - item.timestamp > MAX_CACHE_AGE_MS) {
      try {
        URL.revokeObjectURL(item.blobUrl);
      } catch (e) {
        console.error('Error revoking blob URL:', e);
      }
      subtitleBlobCache.delete(key);
    }
  }
}

// Automatically run cache cleanup every 10 minutes
if (typeof window !== 'undefined') {
  setInterval(cleanSubtitleCache, 10 * 60 * 1000);
}

/**
 * Fetch subtitle VTT content via API proxy and cache in temporary browser Blob URL
 */
export async function getCachedSubtitleBlobUrl(subtitleUrl: string): Promise<string> {
  // If already in memory cache, return existing Blob URL
  const existing = subtitleBlobCache.get(subtitleUrl);
  if (existing) {
    existing.timestamp = Date.now(); // update last access
    return existing.blobUrl;
  }

  try {
    const proxyUrl = subtitleUrl.startsWith('/')
      ? subtitleUrl
      : `/api/subtitle?url=${encodeURIComponent(subtitleUrl)}`;

    const response = await fetch(proxyUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch subtitle: ${response.statusText}`);
    }

    let text = await response.text();

    // Ensure proper WebVTT header formatting
    text = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').trim();
    if (!text.startsWith('WEBVTT')) {
      const vttContent = text
        .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2')
        .replace(/(\d{2}:\d{2}),(\d{3})/g, '00:$1.$2');
      text = `WEBVTT\n\n${vttContent}`;
    }

    const blob = new Blob([text], { type: 'text/vtt;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);

    // Save to temporary memory cache
    subtitleBlobCache.set(subtitleUrl, {
      blobUrl,
      timestamp: Date.now(),
    });

    return blobUrl;
  } catch (error) {
    console.error('[SubtitleCache] Fetch error, falling back to direct URL:', error);
    return subtitleUrl;
  }
}

/**
 * Clear all cached subtitle Blob URLs (e.g. when unmounting player)
 */
export function clearAllSubtitleCache() {
  for (const item of subtitleBlobCache.values()) {
    try {
      URL.revokeObjectURL(item.blobUrl);
    } catch (e) {
      console.error('Error revoking blob URL:', e);
    }
  }
  subtitleBlobCache.clear();
}
