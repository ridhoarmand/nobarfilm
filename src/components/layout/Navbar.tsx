'use client';import Link from 'next/link';
import { Search, Menu, X, User, LogOut, Settings, Film, Tv, Clapperboard } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, isAuthenticated, logout } = useAuth();

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setIsMobileMenuOpen(false);

      // Check if we are in drama section
      if (pathname.startsWith('/drama')) {
        router.push(`/drama/search?q=${encodeURIComponent(searchQuery)}`);
      } else {
        router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
      }

      setSearchQuery('');
    }
  };

  const handleLogout = async () => {
    await logout();
    setIsUserMenuOpen(false);
    router.push('/movie');
  };

  // Navigation items
  const navItems = [
    { href: '/movie', label: 'Movie' },
    { href: '/anime', label: 'Anime' },
    { href: '/drama', label: 'Drama' },
    { href: '/akun', label: 'Akun', authRequired: true },
  ];

  const isActive = (href: string) => {
    if (href === '/movie' && pathname === '/') return true;
    return pathname.startsWith(href);
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-black/95 backdrop-blur-sm shadow-lg' : 'bg-gradient-to-b from-black/90 to-transparent'}`}>
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/movie" className="flex-shrink-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-red-600 hover:text-red-500 transition">{pathname.startsWith('/drama') ? 'NobarDrama' : 'NobarFilm'}</h1>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => {
              // Skip Akun tab if not authenticated
              if (item.authRequired && !isAuthenticated) return null;

              return (
                <Link key={item.href} href={item.href} className={`text-sm font-semibold transition-all relative pb-1 ${isActive(item.href) ? 'text-white' : 'text-gray-400 hover:text-gray-200'}`}>
                  {item.label}
                  {isActive(item.href) && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600 rounded-full" />}
                </Link>
              );
            })}
          </div>

          {/* Right Side: Search & User */}
          <div className="flex items-center gap-3">
            {/* Search Bar - Desktop */}
            {pathname !== '/browse' && pathname !== '/search' && pathname !== '/drama/search' && (
              <form onSubmit={handleSearch} className="hidden lg:block">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search..."
                    className="w-48 xl:w-64 bg-zinc-900 border border-zinc-700 rounded-full px-4 py-1.5 pl-10 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition"
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
              </form>
            )}

            {/* User Menu - Desktop */}
            <div className="hidden md:block relative">
              {isAuthenticated ? (
                <>
                  <button onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 transition">
                    <div className="w-7 h-7 rounded-full bg-red-600 flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm text-white font-medium max-w-[100px] truncate">{profile?.full_name || user?.email?.split('@')[0]}</span>
                  </button>

                  {/* User Dropdown */}
                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl overflow-hidden">
                      <Link href="/akun" onClick={() => setIsUserMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-zinc-800 transition">
                        <Settings className="w-4 h-4" />
                        Profile Settings
                      </Link>
                      <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-zinc-800 transition">
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <Link href="/login" className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-full transition">
                  Login
                </Link>
              )}
            </div>

            {/* Mobile Search Icon */}
            <Link href="/browse" className="lg:hidden p-2 text-gray-300 hover:text-white transition">
              <Search className="w-5 h-5" />
            </Link>

            {/* Mobile Menu Button */}
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden p-2 text-gray-300 hover:text-white transition">
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-black/98 border-t border-zinc-800">
          <div className="px-4 py-4 space-y-1">
            {navItems.map((item) => {
              if (item.authRequired && !isAuthenticated) return null;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block px-3 py-2 text-base font-medium rounded-lg transition ${isActive(item.href) ? 'bg-red-600 text-white' : 'text-gray-300 hover:bg-zinc-800'}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              );
            })}

            {/* Mobile Auth Section */}
            <div className="pt-3 mt-3 border-t border-zinc-700">
              {isAuthenticated ? (
                <>
                  <div className="px-3 py-2 text-sm text-gray-400">
                    Logged in as <span className="text-white font-medium">{profile?.full_name || user?.email}</span>
                  </div>
                  <button onClick={handleLogout} className="w-full mt-2 px-3 py-2 text-left text-base font-medium text-red-400 hover:bg-zinc-800 rounded-lg transition">
                    Logout
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  className="block px-3 py-2 text-base font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition text-center"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Login
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
