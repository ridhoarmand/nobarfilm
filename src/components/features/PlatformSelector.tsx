'use client';

import Image from 'next/image';
import { ChevronDown } from 'lucide-react';
import { usePlatform, type PlatformInfo } from '@/hooks/usePlatform';
import { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

export function PlatformSelector() {
  const { currentPlatform, setPlatform, platforms, getPlatformInfo } = usePlatform();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handlePlatformChange = (platformId: any) => {
    setPlatform(platformId);
    setIsOpen(false);

    // Check if we're on a search page
    const isSearchPage = pathname === '/drama/search';
    const searchQuery = searchParams.get('q');

    if (isSearchPage) {
      const queryParam = searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : '';
      router.push(`/drama/search?platform=${encodeURIComponent(platformId)}${queryParam}`);
    } else if (pathname !== '/drama') {
      // If we're on a detail page or other page, go back to drama home
      router.push('/drama');
    }
  };

  const currentPlatformInfo = getPlatformInfo(currentPlatform);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="w-full pb-3 pt-1 px-2">
      {/* Mobile: Dropdown */}
      <div className="block md:hidden" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between gap-3 px-4 py-3.5 rounded-2xl bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 hover:from-zinc-800 hover:to-zinc-900 transition-colors border border-white/10 shadow-[0_10px_30px_-20px_rgba(255,255,255,0.2)]"
        >
          <div className="flex items-center gap-3">
            <div className="relative w-7 h-7 rounded-lg overflow-hidden ring-1 ring-white/10">
              <Image src={currentPlatformInfo.logo} alt={currentPlatformInfo.name} fill className="object-cover" sizes="24px" />
            </div>
            <span className="font-semibold text-foreground">{currentPlatformInfo.name}</span>
          </div>
          <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute left-4 right-4 mt-2 bg-zinc-900 rounded-2xl shadow-2xl border border-white/10 overflow-hidden z-50">
            {platforms.map((platform) => (
              <button
                key={platform.id}
                onClick={() => handlePlatformChange(platform.id)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 transition-colors ${currentPlatform === platform.id ? 'bg-red-600 text-white font-bold' : 'hover:bg-zinc-800 text-white/70'}`}
              >
                <div className="relative w-7 h-7 rounded-lg overflow-hidden flex items-center justify-center bg-zinc-800 ring-1 ring-white/10">
                  <Image src={platform.logo} alt={platform.name} fill className="object-cover" sizes="24px" />
                </div>
                <span className="font-medium">{platform.name}</span>
                {currentPlatform === platform.id && <span className="ml-auto w-2 h-2 rounded-full bg-primary" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Desktop: Horizontal tabs */}
      <div className="hidden md:flex items-center gap-3">
        {platforms.map((platform) => (
          <PlatformButton key={platform.id} platform={platform} isActive={currentPlatform === platform.id} onClick={() => handlePlatformChange(platform.id)} />
        ))}
      </div>
    </div>
  );
}

interface PlatformButtonProps {
  platform: PlatformInfo;
  isActive: boolean;
  onClick: () => void;
}

function PlatformButton({ platform, isActive, onClick }: PlatformButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        relative flex items-center gap-2.5 px-5 py-3 rounded-full
        transition-all duration-300 ease-out
        ${isActive ? 'bg-gradient-to-r from-red-600/15 to-red-500/10 text-red-400 ring-1 ring-red-500/40 shadow-[0_10px_30px_-18px_rgba(220,38,38,0.5)]' : 'bg-zinc-900/60 hover:bg-zinc-800 border border-white/10 text-white/70'}
      `}
    >
      <div className="relative w-7 h-7 rounded-lg overflow-hidden ring-1 ring-white/10">
        <Image src={platform.logo} alt={platform.name} fill className="object-cover" sizes="24px" />
      </div>
      <span
        className={`
          font-semibold text-sm whitespace-nowrap
          ${isActive ? 'text-red-500' : 'text-inherit'}
        `}
      >
        {platform.name}
      </span>
      {isActive && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-primary animate-pulse" />}
    </button>
  );
}
