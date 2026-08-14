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

  const remainingSeconds = (item.duration_seconds || 0) - (item.progress_seconds || 0);
  const timeLeft = formatTime(remainingSeconds);

  const timestamp = Math.floor(item.progress_seconds || 0);
  const season = item.current_season || 1;
  const baseUrl = item.subject_type === 2
    ? `/watch/${item.subject_id}?season=${season}&episode=${item.current_episode}`
    : `/watch/${item.subject_id}?season=0&episode=0`;
  const watchUrl = timestamp > 0 ? `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}t=${timestamp}` : baseUrl;

  const handleRemove = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isRemoving) return;

    setIsRemoving(true);
    try {
      if (typeof window !== 'undefined') {
        const historyJson = localStorage.getItem('nobarfilm_watch_history');
        if (historyJson) {
          try {
            let items = JSON.parse(historyJson) as ContinueWatchingItem[];
            const normalizedTitle = item.title ? item.title.trim().toLowerCase() : '';
            items = items.filter(
              (i) =>
                i.id !== item.id &&
                i.subject_id !== item.subject_id &&
                (!normalizedTitle || !i.title || i.title.trim().toLowerCase() !== normalizedTitle)
            );
            localStorage.setItem('nobarfilm_watch_history', JSON.stringify(items));
            window.dispatchEvent(new CustomEvent('nobarfilm_watch_history_updated'));
            window.dispatchEvent(new Event('storage'));
          } catch (err) {
            console.error('Failed to update localStorage history:', err);
          }
        }
      }
      onRemove?.(item.id);
    } catch (error) {
      console.error('Failed to remove:', error);
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div className="flex-none w-40 sm:w-48 md:w-56 snap-start relative group/card">
      <Link href={watchUrl} className="block">
        <div className="relative aspect-video rounded-xl overflow-hidden bg-zinc-900 shadow-lg transition-transform duration-300 group-hover/card:scale-[1.02]" style={{ position: 'relative' }}>
          {item.cover_url ? (
            <Image unoptimized src={item.cover_url} alt={item.title} fill className="object-cover transition-opacity duration-300 group-hover/card:opacity-80" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
              <span className="text-zinc-600 text-xs">No Image</span>
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity duration-300">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-red-600 flex items-center justify-center shadow-lg">
              <Play className="w-5 h-5 text-white ml-0.5" fill="white" />
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-800">
            <div className="h-full bg-red-600" style={{ width: `${item.progress_percent}%` }} />
          </div>
        </div>

        <div className="mt-2 px-1">
          <h3 className="text-white font-medium text-sm truncate">{item.title}</h3>
          <div className="flex items-center justify-between text-xs text-zinc-400 mt-1">
            <span>{item.subject_type === 2 ? `S${season} E${item.current_episode}` : timeLeft}</span>
            <span className="text-red-500">{item.progress_percent}%</span>
          </div>
        </div>
      </Link>

      <button
        onClick={handleRemove}
        disabled={isRemoving}
        className="absolute top-2 right-2 z-10 p-1.5 bg-black/70 hover:bg-red-600 rounded-full text-white opacity-80 sm:opacity-0 sm:group-hover/card:opacity-100 transition-all duration-200 disabled:opacity-50"
        title="Remove from Continue Watching"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
