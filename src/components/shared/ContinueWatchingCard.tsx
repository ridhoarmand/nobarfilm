'use client';
import Link from 'next/link';
import Image from 'next/image';
import { ContinueWatchingItem } from '@/types/watch-history';
import { Play, X } from 'lucide-react';
import { useState } from 'react';

interface ContinueWatchingCardProps {
  item: ContinueWatchingItem;
  onRemove?: (id: string) => void;
}

function formatTime(seconds: number): string {
  // Handle invalid values
  if (!seconds || seconds <= 0 || !isFinite(seconds)) {
    return 'Resume';
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m left`;
  }
  if (minutes > 0) {
    return `${minutes}m left`;
  }
  return 'Almost done';
}

export function ContinueWatchingCard({ item, onRemove }: ContinueWatchingCardProps) {
  const [isRemoving, setIsRemoving] = useState(false);

  // Calculate remaining time with validation
  const remainingSeconds = (item.duration_seconds || 0) - (item.progress_seconds || 0);
  const timeLeft = formatTime(remainingSeconds);

  // Build watch URL with resume capability (t = timestamp in seconds)
  const timestamp = Math.floor(item.progress_seconds || 0);
  const baseUrl = item.subject_type === 2 ? `/movie/watch/${item.subject_id}?season=1&episode=${item.current_episode}` : `/movie/watch/${item.subject_id}`;
  const watchUrl = timestamp > 0 ? `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}t=${timestamp}` : baseUrl;

  const handleRemove = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isRemoving) return;

    setIsRemoving(true);
    try {
      const res = await fetch('/api/watch-history/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id }),
      });
      if (res.ok) {
        onRemove?.(item.id);
      }
    } catch (error) {
      console.error('Failed to remove:', error);
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div className="flex-none w-40 sm:w-48 md:w-56 snap-start relative group/card">
      <Link href={watchUrl} className="block">
        <div className="relative aspect-video rounded-xl overflow-hidden bg-zinc-900 shadow-lg transition-transform duration-300 group-hover/card:scale-[1.02]">
          {/* Cover Image */}
          {item.cover_url ? (
            <Image src={item.cover_url} alt={item.title} fill className="object-cover transition-opacity duration-300 group-hover/card:opacity-80" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
              <span className="text-zinc-600 text-xs">No Image</span>
            </div>
          )}

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

          {/* Play Button */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity duration-300">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-red-600 flex items-center justify-center shadow-lg">
              <Play className="w-5 h-5 text-white ml-0.5" fill="white" />
            </div>
          </div>

          {/* Progress Bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-800">
            <div className="h-full bg-red-600" style={{ width: `${item.progress_percent}%` }} />
          </div>
        </div>

        {/* Title & Info Below */}
        <div className="mt-2 px-1">
          <h3 className="text-white font-medium text-sm truncate">{item.title}</h3>
          <div className="flex items-center justify-between text-xs text-zinc-400 mt-1">
            <span>{item.subject_type === 2 ? `S1 E${item.current_episode}` : timeLeft}</span>
            <span className="text-red-500">{item.progress_percent}%</span>
          </div>
        </div>
      </Link>

      {/* Remove Button */}
      <button
        onClick={handleRemove}
        disabled={isRemoving}
        className="absolute top-2 right-2 z-10 p-1.5 bg-black/70 hover:bg-red-600 rounded-full text-white opacity-0 group-hover/card:opacity-100 transition-all duration-200 disabled:opacity-50"
        title="Remove from Continue Watching"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
