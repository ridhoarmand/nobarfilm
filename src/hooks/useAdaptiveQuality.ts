'use client';import { useState, useEffect } from 'react';

interface ConnectionInfo {
  effectiveType: '4g' | '3g' | '2g' | 'slow-2g';
  downlink: number; // Mbps
  rtt: number; // ms
}

interface NavigatorWithConnection extends Navigator {
  connection?: ConnectionInfo;
  mozConnection?: ConnectionInfo;
  webkitConnection?: ConnectionInfo;
}

/**
 * Hook to detect connection speed and recommend video quality
 *
 * Quality mapping (prefers higher quality):
 * - 4g / fast: highest available (1080p)
 * - 3g / medium: second highest (720p)
 * - 2g / slow: lowest (360p/480p)
 * - unknown: prefer middle-high quality
 */
export function useAdaptiveQuality(availableQualities: number[] = []) {
  // Default to middle-high quality (prefer better quality on unknown connection)
  const defaultIndex = Math.max(0, Math.ceil((availableQualities.length - 1) * 0.7));
  const [recommendedQualityIndex, setRecommendedQualityIndex] = useState(defaultIndex);
  const [connectionSpeed, setConnectionSpeed] = useState<string>('unknown');
  const [isDetecting, setIsDetecting] = useState(true);

  useEffect(() => {
    if (availableQualities.length === 0) return;

    const detectSpeed = () => {
      setIsDetecting(true);

      // Network Information API (Chrome/Edge/Android)
      const nav = navigator as NavigatorWithConnection;
      const connection = nav.connection || nav.mozConnection || nav.webkitConnection;

      if (connection) {
        const { effectiveType, downlink } = connection;
        setConnectionSpeed(`${effectiveType} (${downlink?.toFixed(1) || '?'} Mbps)`);

        // Map connection to quality index (prefer higher quality)
        let qualityIndex: number;

        if (effectiveType === '4g' || (downlink && downlink >= 5)) {
          // Fast connection: highest quality
          qualityIndex = availableQualities.length - 1;
        } else if (effectiveType === '3g' || (downlink && downlink >= 1.5)) {
          // Medium connection: second highest
          qualityIndex = Math.max(0, availableQualities.length - 2);
        } else if (effectiveType === '2g' || effectiveType === 'slow-2g') {
          // Slow connection: lowest quality
          qualityIndex = 0;
        } else {
          // Unknown: prefer middle-high
          qualityIndex = Math.max(0, Math.ceil((availableQualities.length - 1) * 0.7));
        }

        setRecommendedQualityIndex(qualityIndex);
        setIsDetecting(false);
        return;
      }

      // Fallback: No Network API available, prefer middle-high quality
      // (Don't do speed test as it's unreliable with CORS)
      const fallbackIndex = Math.max(0, Math.ceil((availableQualities.length - 1) * 0.7));
      setConnectionSpeed('unknown (defaulting to high quality)');
      setRecommendedQualityIndex(fallbackIndex);
      setIsDetecting(false);
    };

    detectSpeed();
  }, [availableQualities.length]);

  return {
    recommendedQualityIndex,
    connectionSpeed,
    isDetecting,
  };
}
