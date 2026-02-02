'use client';
import Link from 'next/link';
import { Search, Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();
  const pathname = usePathname();

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
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
    }
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-black/95 backdrop-blur-sm' : 'bg-gradient-to-b from-black/80 to-transparent'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex-shrink-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-red-600">NobarFilm</h1>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-6">
              <Link href="/" className="text-sm font-medium text-gray-300 hover:text-white transition">
                Home
              </Link>
              <Link href="/browse" className="text-sm font-medium text-gray-300 hover:text-white transition">
                Browse
              </Link>
            </div>
          </div>

          {/* Search & Mobile Menu */}
          <div className="flex items-center gap-4">
            {/* Search Bar - Hidden on Browse and Search pages */}
            {pathname !== '/browse' && pathname !== '/search' && (
              <form onSubmit={handleSearch} className="hidden sm:block">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search movies, series..."
                    className="w-48 lg:w-64 bg-zinc-900 border border-zinc-700 rounded-md px-4 py-1.5 pl-10 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition"
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
              </form>
            )}

            {/* Mobile Search Icon */}
            <Link href="/browse" className="sm:hidden p-2 text-gray-300 hover:text-white transition">
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
          <div className="px-4 py-3 space-y-3">
            <Link href="/" className="block text-sm font-medium text-gray-300 hover:text-white transition" onClick={() => setIsMobileMenuOpen(false)}>
              Home
            </Link>
            <Link href="/browse" className="block text-sm font-medium text-gray-300 hover:text-white transition" onClick={() => setIsMobileMenuOpen(false)}>
              Browse
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
