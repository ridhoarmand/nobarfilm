'use client';
import { useState } from 'react';
import { Stream } from '@/types/anime';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StreamQualityDropdownProps {
  streams: Stream[];
  currentStream: Stream | null;
  onStreamSelect: (stream: Stream) => void;
}

export function StreamQualityDropdown({ streams, currentStream, onStreamSelect }: StreamQualityDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Group streams by quality
  const groupedByQuality = streams.reduce(
    (acc, stream) => {
      if (!acc[stream.quality]) {
        acc[stream.quality] = [];
      }
      acc[stream.quality].push(stream);
      return acc;
    },
    {} as Record<string, Stream[]>,
  );

  const qualities = Object.keys(groupedByQuality).sort((a, b) => {
    // Sort by quality: 1080p > 720p > 480p > etc
    const orderMap: Record<string, number> = { '1080p': 0, '720p': 1, '480p': 2, '360p': 3, '240p': 4 };
    return (orderMap[a] ?? 999) - (orderMap[b] ?? 999);
  });

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-white/10 text-white text-sm font-medium flex items-center justify-between gap-2 transition-colors"
      >
        <span>
          {currentStream
            ? `${currentStream.provider} (${currentStream.quality})`
            : 'Select Server'}
        </span>
        <ChevronDown
          className={cn('w-4 h-4 transition-transform', isOpen && 'rotate-180')}
        />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden">
            {qualities.map((quality) => (
              <div key={quality}>
                <div className="px-4 py-2.5 bg-zinc-800/50 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-white/5 sticky top-0">
                  {quality}
                </div>
                <div className="space-y-1 p-2">
                  {groupedByQuality[quality].map((stream) => (
                    <button
                      key={stream.id}
                      onClick={() => {
                        onStreamSelect(stream);
                        setIsOpen(false);
                      }}
                      className={cn(
                        'w-full px-3 py-2 rounded-md text-sm text-left transition-colors',
                        currentStream?.id === stream.id
                          ? 'bg-red-600 text-white font-medium'
                          : 'bg-black/40 text-gray-300 hover:bg-white/10 hover:text-white',
                      )}
                    >
                      {stream.provider}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
