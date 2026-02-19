import Link from 'next/link';
import { Github, Heart } from 'lucide-react';

export function Footer() {
  return (
    <footer className="relative bg-gradient-to-b from-black via-zinc-950 to-black border-t border-white/5 py-14">
      <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-red-600/60 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="col-span-1">
            <h3 className="text-2xl font-bold text-red-600 mb-4">NobarFilm</h3>
            <p className="text-gray-400 text-sm leading-relaxed">Stream movies, drama, and anime together with friends — fast, fun, and free.</p>
            <div className="mt-4 inline-flex items-center gap-2 text-sm text-red-500/90 bg-red-500/10 px-3 py-1.5 rounded-full border border-red-500/20">
              <Heart className="w-4 h-4" />
              <span>Made for binge nights</span>
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-white font-semibold mb-4">Explore</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/movie" className="text-gray-400 hover:text-white text-sm transition">
                  Movie
                </Link>
              </li>
              <li>
                <Link href="/anime" className="text-gray-400 hover:text-white text-sm transition">
                  Anime
                </Link>
              </li>
              <li>
                <Link href="/dracin" className="text-gray-400 hover:text-white text-sm transition">
                  Dracin
                </Link>
              </li>
            </ul>
          </div>

          {/* Community */}
          <div>
            <h4 className="text-white font-semibold mb-4">Community</h4>
            <ul className="space-y-2">
              <li>
                <a href="https://github.com/ridhoarmand/nobarfilm/issues" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white text-sm transition">
                  Feedback & Ideas
                </a>
              </li>
              <li>
                <a href="https://github.com/ridhoarmand/nobarfilm/issues" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white text-sm transition">
                  Report Issue
                </a>
              </li>
              <li>
                <a href="https://github.com/ridhoarmand/nobarfilm/issues" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white text-sm transition">
                  Request Content
                </a>
              </li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h4 className="text-white font-semibold mb-4">Connect</h4>
            <div className="flex gap-4">
              <a href="https://github.com/ridhoarmand/nobarfilm" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition" aria-label="GitHub">
                <Github className="w-5 h-5" />
              </a>
            </div>
            <p className="mt-4 text-xs text-gray-500">Open source @ GitHub</p>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-10 pt-8 border-t border-white/5 text-center">
          <p className="text-gray-500 text-sm">© {new Date().getFullYear()} NobarFilm. For educational purposes only.</p>
        </div>
      </div>
    </footer>
  );
}
