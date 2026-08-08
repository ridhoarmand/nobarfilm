'use client';
import Link from 'next/link';
import { Search, Loader2, Star, Film, X } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface SearchResultItem {
  subjectId: string;
  title: string;
  cover?: { url: string };
  imdbRatingValue?: string;
  releaseDate?: string;
  subjectType?: number;
}

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle click outside to close autocomplete popover
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced instant live search API fetch
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      setShowDropdown(true);
      try {
        const res = await fetch(`/api/moviebox/search?q=${encodeURIComponent(searchQuery.trim())}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setSearchResults(data.slice(0, 6)); // Top 6 instant results
        } else if (data.items && Array.isArray(data.items)) {
          setSearchResults(data.items.slice(0, 6));
        } else {
          setSearchResults([]);
        }
      } catch (err) {
        console.error('Instant search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setShowDropdown(false);
      setIsSearchFocused(false);
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <nav 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-out ${
        isScrolled 
          ? 'bg-black/85 backdrop-blur-xl border-b border-white/10 shadow-2xl py-1' 
          : 'bg-gradient-to-b from-black/90 via-black/50 to-transparent py-4'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0 group">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-red-600 transition-all duration-300 group-hover:text-red-500 drop-shadow-[0_0_15px_rgba(220,38,38,0.3)] group-hover:drop-shadow-[0_0_20px_rgba(220,38,38,0.6)]">
              NobarFilm
            </h1>
          </Link>

          {/* Right Side: Search & Auth */}
          <div className="flex items-center gap-4">
            {/* Search Bar - Desktop */}
            {!pathname.includes('/search') && (
              <div ref={searchRef} className="hidden md:block relative">
                <form onSubmit={handleSearchSubmit}>
                  <div 
                    className={`relative flex items-center transition-all duration-300 ${
                      isSearchFocused || showDropdown ? 'w-80' : 'w-64'
                    }`}
                  >
                    <Search className={`absolute left-3.5 w-4 h-4 transition-colors duration-300 ${isSearchFocused ? 'text-red-500' : 'text-gray-400'}`} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => {
                        setIsSearchFocused(true);
                        if (searchResults.length > 0) setShowDropdown(true);
                      }}
                      placeholder="Cari film & series..."
                      className="w-full bg-white/5 border border-white/10 hover:border-white/20 rounded-full py-2 pl-10 pr-9 text-sm text-white placeholder-gray-400 focus:outline-none focus:bg-white/10 focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all shadow-inner"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setShowDropdown(false);
                        }}
                        className="absolute right-3 p-0.5 rounded-full text-gray-400 hover:text-white transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </form>

                {/* Instant Autocomplete Popover Dropdown */}
                {showDropdown && searchQuery.trim().length >= 2 && (
                  <div className="absolute right-0 top-full mt-2 w-96 bg-zinc-950/95 border border-zinc-800 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden z-50 animate-fade-in divide-y divide-zinc-850">
                    <div className="p-3 bg-zinc-900/60 flex items-center justify-between text-xs text-zinc-400 font-semibold uppercase tracking-wider">
                      <span>Hasil Pencarian</span>
                      {isSearching && <Loader2 className="w-3.5 h-3.5 text-red-500 animate-spin" />}
                    </div>

                    <div className="max-h-80 overflow-y-auto divide-y divide-zinc-900/60">
                      {isSearching && searchResults.length === 0 ? (
                        <div className="p-6 text-center text-xs text-zinc-400 flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 text-red-500 animate-spin" />
                          <span>Mencari film...</span>
                        </div>
                      ) : searchResults.length > 0 ? (
                        searchResults.map((item) => {
                          const year = item.releaseDate ? new Date(item.releaseDate).getFullYear() : null;
                          return (
                            <Link
                              key={item.subjectId}
                              href={`/${item.subjectId}`}
                              onClick={() => setShowDropdown(false)}
                              className="flex items-center gap-3 p-2.5 hover:bg-zinc-900/80 transition-colors group"
                            >
                              <div className="w-10 h-14 bg-zinc-900 rounded-lg overflow-hidden flex-shrink-0 relative shadow-md">
                                {item.cover?.url ? (
                                  /* eslint-disable-next-line @next/next/no-img-element */
                                  <img
                                    src={item.cover.url}
                                    alt={item.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-zinc-700">
                                    <Film className="w-5 h-5" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-xs font-bold text-white group-hover:text-red-400 transition-colors truncate">
                                  {item.title}
                                </h4>
                                <div className="flex items-center gap-2 mt-1 text-[11px] text-zinc-400">
                                  {year && <span>{year}</span>}
                                  {item.imdbRatingValue && parseFloat(item.imdbRatingValue) > 0 && (
                                    <span className="flex items-center gap-0.5 text-yellow-400 font-semibold">
                                      <Star className="w-3 h-3 fill-yellow-400" />
                                      {item.imdbRatingValue}
                                    </span>
                                  )}
                                  <span className="px-1.5 py-0.5 bg-zinc-800 rounded text-[10px] text-zinc-300 uppercase font-semibold ml-auto">
                                    {item.subjectType === 2 ? 'Series' : 'Movie'}
                                  </span>
                                </div>
                              </div>
                            </Link>
                          );
                        })
                      ) : (
                        <div className="p-6 text-center text-xs text-zinc-500 italic">
                          Tidak ada film ditemukan untuk &quot;{searchQuery}&quot;
                        </div>
                      )}
                    </div>

                    {searchResults.length > 0 && (
                      <button
                        onClick={handleSearchSubmit}
                        className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-850 text-center text-xs font-semibold text-red-400 hover:text-red-300 transition-colors block border-t border-zinc-850"
                      >
                        Lihat Semua Hasil untuk &quot;{searchQuery}&quot; →
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Mobile Search Icon */}
            {!pathname.includes('/search') && (
              <button
                onClick={() => {
                  router.push('/search');
                }}
                className="md:hidden p-2 text-gray-300 hover:text-white transition-colors"
                aria-label="Search"
              >
                <Search className="w-5 h-5" />
              </button>
            )}

          </div>
        </div>
      </div>
    </nav>
  );
}
