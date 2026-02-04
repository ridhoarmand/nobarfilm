'use client';import Image from 'next/image';
import { ChevronDown } from 'lucide-react';
import { usePlatform, type PlatformInfo } from '@/hooks/usePlatform';
import { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export function PlatformSelector() {
  const { currentPlatform, setPlatform, platforms, getPlatformInfo } = usePlatform();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  const handlePlatformChange = (platformId: any) => {
    setPlatform(platformId);
    setIsOpen(false);

    // If we're on a detail page or search page, go back to drama home
    if (pathname !== '/drama') {
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
    <div className="w-full pb-2 pt-0 px-2">
      {/* Mobile: Dropdown */}
      <div className="block md:hidden" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 transition-colors border border-white/5"
        >
          <div className="flex items-center gap-3">
            <div className="relative w-6 h-6 rounded-md overflow-hidden">
              <Image src={currentPlatformInfo.logo} alt={currentPlatformInfo.name} fill className="object-cover" sizes="24px" />
            </div>
            <span className="font-medium text-foreground">{currentPlatformInfo.name}</span>
          </div>
          <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute left-4 right-4 mt-2 bg-zinc-900 rounded-xl shadow-2xl border border-white/10 overflow-hidden z-50">
            {platforms.map((platform) => (
              <button
                key={platform.id}
                onClick={() => handlePlatformChange(platform.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${currentPlatform === platform.id ? 'bg-red-600 text-white font-bold' : 'hover:bg-zinc-800 text-white/70'}`}
              >
                <div className="relative w-6 h-6 rounded-md overflow-hidden flex items-center justify-center bg-zinc-800">
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
        relative flex items-center gap-2 px-4 py-2.5 rounded-full
        transition-all duration-300 ease-out
        ${isActive ? 'bg-red-600/10 text-red-500 ring-1 ring-red-500/50 shadow-[0_0_20px_rgba(220,38,38,0.2)]' : 'bg-zinc-900/50 hover:bg-zinc-800 border border-white/5 text-white/60'}
      `}
    >
      <div className="relative w-6 h-6 rounded-md overflow-hidden">
        <Image src={platform.logo} alt={platform.name} fill className="object-cover" sizes="24px" />
      </div>
      <span
        className={`
          font-medium text-sm whitespace-nowrap
          ${isActive ? 'text-red-500' : 'text-inherit'}
        `}
      >
        {platform.name}
      </span>
      {isActive && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-primary animate-pulse" />}
    </button>
  );
}
