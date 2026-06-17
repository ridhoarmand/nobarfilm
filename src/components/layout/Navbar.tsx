'use client';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, profile, logout } = useAuth();

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setIsSearchFocused(false);
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
    }
  };

  return (
    <nav 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-out ${
        isScrolled 
          ? 'bg-black/80 backdrop-blur-xl border-b border-white/10 shadow-2xl py-1' 
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
              <form onSubmit={handleSearch} className="hidden md:block relative">
                <div 
                  className={`relative flex items-center transition-all duration-300 ${
                    isSearchFocused ? 'w-80' : 'w-64'
                  }`}
                >
                  <Search className={`absolute left-3 w-4 h-4 transition-colors duration-300 ${isSearchFocused ? 'text-red-500' : 'text-gray-400'}`} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setIsSearchFocused(false)}
                    placeholder="Search movies..."
                    className="w-full bg-white/5 border border-white/10 hover:border-white/20 rounded-full py-2 pl-10 pr-4 text-sm text-white placeholder-gray-400 focus:outline-none focus:bg-white/10 focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all shadow-inner"
                  />
                </div>
              </form>
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

            {/* Auth Controls */}
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.full_name || 'User'}
                    className="w-8 h-8 rounded-full border border-white/20 object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-red-600/20 border border-red-500/30 flex items-center justify-center text-xs font-semibold text-red-500">
                    {(profile?.full_name || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="hidden sm:inline text-sm font-medium text-zinc-300">
                  {profile?.full_name || 'User'}
                </span>
                <button
                  onClick={() => logout()}
                  className="bg-zinc-850 hover:bg-zinc-800 border border-zinc-700/60 text-xs px-3 py-1.5 rounded-lg text-zinc-300 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="bg-red-600 hover:bg-red-700 text-sm font-semibold px-4 py-2 rounded-full transition-all shadow-[0_0_15px_rgba(220,38,38,0.3)] hover:shadow-[0_0_20px_rgba(220,38,38,0.5)]"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
