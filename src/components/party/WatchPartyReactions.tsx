'use client';

import { useWatchPartyStore } from '@/stores/watchPartyStore';

export function WatchPartyReactions() {
  const reactions = useWatchPartyStore((s) => s.reactions);

  if (reactions.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-40">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes party-float-up {
              0% { opacity: 1; transform: translateY(0) scale(1); }
              50% { opacity: 0.8; transform: translateY(-100px) scale(1.2); }
              100% { opacity: 0; transform: translateY(-220px) scale(1.4); }
            }
          `,
        }}
      />
      {reactions.map((r) => (
        <span
          key={r.id}
          className="absolute text-3xl sm:text-4xl select-none"
          style={{
            left: `${r.x}%`,
            bottom: '12%',
            animation: 'party-float-up 2s ease-out forwards',
            willChange: 'transform, opacity',
          }}
        >
          {r.emoji}
        </span>
      ))}
    </div>
  );
}
