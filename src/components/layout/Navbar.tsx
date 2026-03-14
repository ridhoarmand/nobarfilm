'use client';
import Link from 'next/link';
import { Search, Menu, X, User, LogOut, Settings } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, isAuthenticated, logout } = useAuth();

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
      setIsMobileMenuOpen(false);
      setIsSearchFocused(false);
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
    }
  };

  const handleLogout = async () => {
    await logout();
    setIsUserMenuOpen(false);
    router.push('/');
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

          {/* Right Side: Search & User */}
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

            {/* User Menu - Desktop */}
            <div className="hidden md:block relative">
              {isAuthenticated ? (
                <>
                  <button 
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} 
                    className="flex items-center gap-2 pl-2 pr-4 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center shadow-md">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm text-gray-200 font-medium max-w-[120px] truncate">
                      {profile?.full_name || user?.email?.split('@')[0]}
                    </span>
                  </button>

                  {/* User Dropdown */}
                  <div className={`absolute right-0 mt-3 w-56 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden transition-all duration-200 origin-top-right ${
                    isUserMenuOpen ? 'opacity-100 scale-100 visible' : 'opacity-0 scale-95 invisible'
                  }`}>
                    <div className="p-2 space-y-1">
                      <Link 
                        href="/auth/akun" 
                        onClick={() => setIsUserMenuOpen(false)} 
                        className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <Settings className="w-4 h-4" />
                        Profile Settings
                      </Link>
                      <button 
                        onClick={handleLogout} 
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <Link 
                  href="/auth/login" 
                  className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-full transition-all duration-300 shadow-[0_0_15px_rgba(220,38,38,0.4)] hover:shadow-[0_0_20px_rgba(220,38,38,0.6)]"
                >
                  Sign In
                </Link>
              )}
            </div>

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

            {/* Mobile Menu Button */}
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
              className="md:hidden p-2 text-gray-300 hover:text-white transition-colors focus:outline-none"
            >
              <div className="relative w-6 h-6 flex items-center justify-center">
                <span className={`absolute transition-all duration-300 ${isMobileMenuOpen ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'}`}>
                  <Menu className="w-6 h-6" />
                </span>
                <span className={`absolute transition-all duration-300 ${isMobileMenuOpen ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'}`}>
                  <X className="w-6 h-6" />
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      <div 
        className={`md:hidden absolute top-full left-0 w-full bg-black/95 backdrop-blur-2xl border-b border-white/10 transition-all duration-300 ease-in-out overflow-hidden ${
          isMobileMenuOpen ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0 border-transparent'
        }`}
      >
        <div className="px-4 py-6 space-y-2">
          {/* Mobile Auth Section */}
          <div className="pt-2">
            {isAuthenticated ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 px-4 py-2">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center shadow-md">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-400">Logged in as</span>
                    <span className="text-sm text-white font-medium">{profile?.full_name || user?.email}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 px-2">
                  <Link 
                    href="/auth/akun" 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-sm font-medium text-white rounded-xl transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </Link>
                  <button 
                    onClick={handleLogout} 
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-sm font-medium text-red-500 rounded-xl transition-colors border border-red-500/20"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              </div>
            ) : (
              <div className="px-2">
                <Link
                  href="/auth/login"
                  className="flex items-center justify-center w-full px-4 py-3 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-lg shadow-red-600/20"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Sign In
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
