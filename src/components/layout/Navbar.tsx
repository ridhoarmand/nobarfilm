'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Heart, Home, Loader2, Search, Star, X } from 'lucide-react';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useDebounce } from '@/hooks/useDebounce';
import { useMovieBoxSearch } from '@/hooks/useMovieBox';

function subscribeToHash(callback: () => void) {
  window.addEventListener('hashchange', callback);
  window.addEventListener('popstate', callback);
  return () => {
    window.removeEventListener('hashchange', callback);
    window.removeEventListener('popstate', callback);
  };
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const hash = useSyncExternalStore(subscribeToHash, () => window.location.hash, () => '');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(searchQuery.trim(), 300);
  const { data, isFetching, isError } = useMovieBoxSearch(debouncedQuery, 1, {
    enabled: showDropdown && debouncedQuery.length >= 2,
  });
  const results = data?.items.slice(0, 5) || [];
  const isPending = isFetching || searchQuery.trim() !== debouncedQuery;
  const isSearchPage = pathname.startsWith('/search');
  const isFavorites = pathname === '/' && hash === '#favorit';
  const navigation = [
    { href: '/', label: 'Beranda', icon: Home, active: pathname === '/' && !isFavorites },
    { href: '/search', label: 'Cari', icon: Search, active: isSearchPage },
    { href: '/#favorit', label: 'Favorit', icon: Heart, active: isFavorites },
  ];

  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !searchRef.current?.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, []);

  const submitSearch = () => {
    const query = searchQuery.trim();
    if (!query) return;
    setShowDropdown(false);
    router.push(`/search?q=${encodeURIComponent(query)}`);
  };

  return (
    <>
      <a href="#main-content" className="skip-link">Lewati ke konten</a>
      <header className="site-header fixed inset-x-0 top-0 z-50 border-b border-white/8 bg-[#101014]/90 backdrop-blur-xl">
        <div className="content-container flex h-[var(--header-height)] items-center justify-between gap-4">
          <Link href="/" aria-label="NobarFilm — Beranda" className="flex min-h-11 shrink-0 items-center gap-2.5 rounded-xl">
            <Image src="/icon-192.png" alt="" width={44} height={44} className="size-11 shrink-0 rounded-xl" priority />
            <span className="text-lg font-black tracking-tight sm:text-xl">NOBAR<span className="text-red-500">FILM</span></span>
          </Link>

          <nav aria-label="Navigasi utama" className="hidden items-center gap-1 md:flex">
            {navigation.map(({ href, label, active }) => (
              <Link key={label} href={href} aria-current={active ? 'page' : undefined}
                className={`flex min-h-11 items-center rounded-xl px-4 text-sm font-semibold transition-colors ${active ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}>
                {label}
              </Link>
            ))}
          </nav>

          <div className="flex min-w-0 items-center gap-3">
            {!isSearchPage && (
              <div ref={searchRef} className="relative hidden lg:block"
                onKeyDownCapture={(event) => {
                  if (event.key !== 'Escape') return;
                  event.preventDefault();
                  event.stopPropagation();
                  searchInputRef.current?.focus();
                  setShowDropdown(false);
                }}
                onBlurCapture={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget)) setShowDropdown(false);
                }}>
                <form role="search" onSubmit={(event) => { event.preventDefault(); submitSearch(); }}>
                  <label htmlFor="nav-search" className="sr-only">Cari film atau serial</label>
                  <div className="relative w-56 lg:w-72 xl:w-80">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-400" aria-hidden="true" />
                    <input id="nav-search" ref={searchInputRef} type="search" autoComplete="off"
                      value={searchQuery} onChange={(event) => { setSearchQuery(event.target.value); setShowDropdown(true); }}
                      onFocus={() => setShowDropdown(true)}
                      onKeyDown={(event) => {
                        if (event.key === 'ArrowDown' && showDropdown && results.length > 0) {
                          event.preventDefault();
                          searchRef.current?.querySelector<HTMLAnchorElement>('[data-search-result]')?.focus();
                        }
                      }}
                      aria-expanded={showDropdown && searchQuery.trim().length >= 2}
                      aria-controls="nav-search-results"
                      placeholder="Cari film atau serial…"
                      className="min-h-11 w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-11 text-sm text-white placeholder:text-zinc-500 focus:border-red-500 focus:bg-zinc-900" />
                    {searchQuery && <button type="button" aria-label="Hapus pencarian"
                      onClick={() => { setSearchQuery(''); setShowDropdown(false); searchInputRef.current?.focus(); }}
                      className="absolute right-0 top-0 flex size-11 items-center justify-center rounded-xl text-zinc-400 hover:text-white"><X className="size-4" /></button>}
                  </div>
                </form>

                {showDropdown && searchQuery.trim().length >= 2 && (
                  <div id="nav-search-results" role="region" aria-label="Hasil pencarian cepat"
                    className="absolute right-0 top-full mt-3 w-96 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-white/10 bg-[#18181d] shadow-2xl shadow-black/60">
                    <div className="flex items-center justify-between px-4 py-3 text-xs font-semibold text-zinc-400">
                      <span>HASIL PENCARIAN</span>{isPending && <Loader2 className="size-4 animate-spin" aria-label="Mencari" />}
                    </div>
                    <div aria-live="polite" className="max-h-[min(24rem,60dvh)] overflow-y-auto">
                      {isPending ? <p className="px-4 py-6 text-sm text-zinc-400">Mencari judul…</p> : isError ? (
                        <p className="px-4 py-6 text-sm text-zinc-400">Pencarian belum tersedia. Coba lagi sebentar.</p>
                      ) : results.length > 0 ? results.map((item) => (
                        <Link data-search-result key={item.subjectId} href={`/${item.subjectId}`} onClick={() => setShowDropdown(false)}
                          className="flex min-h-16 items-center gap-3 border-t border-white/5 px-4 py-3 hover:bg-white/5 focus-visible:bg-white/10">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={item.cover.url} alt="" className="h-16 w-11 shrink-0 rounded-lg bg-zinc-800 object-cover" />
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 text-sm font-semibold text-white">{item.title}</p>
                            <p className="mt-1 flex items-center gap-2 text-xs text-zinc-400">
                              <span>{item.subjectType === 2 ? 'Serial' : 'Film'}</span>
                              {item.releaseDate && <span>{new Date(item.releaseDate).getFullYear()}</span>}
                              {Number(item.imdbRatingValue) > 0 && <span className="flex items-center gap-1 text-amber-300"><Star className="size-3 fill-current" />{item.imdbRatingValue}</span>}
                            </p>
                          </div>
                        </Link>
                      )) : <p className="px-4 py-6 text-sm text-zinc-400">Tidak ada judul yang cocok. Coba kata kunci lain.</p>}
                    </div>
                    <button type="button" onClick={submitSearch} className="min-h-12 w-full border-t border-white/10 px-4 text-left text-sm font-semibold text-red-400 hover:bg-white/5">Lihat semua hasil →</button>
                  </div>
                )}
              </div>
            )}
            <span className="hidden items-center gap-2 text-xs text-zinc-400 min-[1800px]:inline-flex"><span aria-hidden="true" className="rounded-lg border border-white/20 px-2 py-1">↑ ↓ ← →</span> Navigasi tombol arah</span>
            {!isSearchPage && <Link href="/search" aria-label="Cari film atau serial" className="flex size-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-200 lg:hidden"><Search className="size-5" /></Link>}
          </div>
        </div>
      </header>

      <nav aria-label="Navigasi seluler" className="mobile-navigation fixed inset-x-0 bottom-0 z-50 flex border-t border-white/10 bg-[#101014]/95 backdrop-blur-xl md:hidden">
        {navigation.map(({ href, label, icon: Icon, active }) => (
          <Link key={label} href={href} aria-current={active ? 'page' : undefined}
            className={`flex min-h-16 flex-1 flex-col items-center justify-center gap-1 rounded-xl py-2 text-[11px] font-semibold transition-colors ${active ? 'text-red-400' : 'text-zinc-400 hover:text-white'}`}>
            <Icon className="size-5" aria-hidden="true" /><span>{label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
