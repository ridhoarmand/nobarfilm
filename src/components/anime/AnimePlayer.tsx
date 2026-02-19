'use client';
import { useState, useEffect } from 'react';
import { Stream } from '@/types/anime';
import { Play, AlertCircle } from 'lucide-react';

interface AnimePlayerProps {
  streams: Stream[];
  title: string;
}

export function AnimePlayer({ streams, title }: AnimePlayerProps) {
  const [currentStream, setCurrentStream] = useState<Stream | null>(null);

  useEffect(() => {
    if (streams && streams.length > 0) {
      // Find default stream or use first one
      const defaultStream = streams.find((s) => s.is_default === 1) || streams[0];
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentStream(defaultStream);
    }
  }, [streams]);

  if (!streams || streams.length === 0) {
    return (
      <div className="aspect-video w-full bg-black flex flex-col items-center justify-center text-gray-500 rounded-xl border border-zinc-800">
        <AlertCircle className="w-12 h-12 mb-2" />
        <p>No streams available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Player Container */}
      <div className="relative aspect-video w-full bg-black rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10 group">
        {currentStream ? (
          <iframe
            key={currentStream.id} // Force re-render on stream change
            src={currentStream.url}
            title={title}
            className="w-full h-full border-0"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Stream Selector */}
      <div className="bg-zinc-900/50 p-4 rounded-xl border border-white/5">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Play className="w-4 h-4" />
          Select Server
        </h3>
        <div className="flex flex-wrap gap-2">
          {streams.map((stream) => (
            <button
              key={stream.id}
              onClick={() => setCurrentStream(stream)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                currentStream?.id === stream.id ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'bg-black/40 text-gray-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              {stream.provider}
              <span className="ml-1 opacity-60 text-xs">({stream.quality})</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
