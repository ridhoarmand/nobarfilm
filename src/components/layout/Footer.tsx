import Link from 'next/link';
import { Github, AlertTriangle } from 'lucide-react';

export function Footer() {
  return (
    <footer className="w-full bg-[#0a0a0a] text-gray-400 py-10 mt-auto border-t border-zinc-800/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-8">
          {/* Left Section: Brand & Disclaimer */}
          <div className="flex-1 max-w-xl text-center md:text-left">
            <Link href="/" className="inline-block">
              <h2 className="text-3xl font-black text-white mb-4 tracking-wide flex items-center justify-center md:justify-start gap-1">
                NOBAR<span className="text-red-600">FILM</span>
              </h2>
            </Link>
            <div className="bg-red-950/20 border border-red-900/30 rounded-lg p-3 flex items-start gap-3 mt-2">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-gray-400 leading-relaxed text-left">
                <span className="font-semibold text-gray-300">Disclaimer:</span> NobarFilm does not store any files on our server. All contents are provided by non-affiliated third parties.
              </p>
            </div>
          </div>

          {/* Right Section: Navigation Links & Socials */}
          <div className="flex-1 flex flex-col md:flex-row justify-center md:justify-end gap-x-12 gap-y-8 mt-6 md:mt-0 text-center md:text-left">
            {/* Explore Column */}
            <div>
              <h4 className="text-white font-semibold mb-4">Explore</h4>
              <ul className="space-y-2">
                <li>
                  <a href="https://anime.idho.eu.org" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white text-sm transition">
                    Anime
                  </a>
                </li>
                <li>
                  <a href="https://film.idho.eu.org" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white text-sm transition">
                    Film & Series
                  </a>
                </li>
                <li>
                  <a href="https://dracin.idho.eu.org" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white text-sm transition">
                    Dracin
                  </a>
                </li>
                <li>
                  <a href="https://drakor.idho.eu.org" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white text-sm transition">
                    Drakor
                  </a>
                </li>
              </ul>
            </div>

            {/* Other Tools Column */}
            <div>
              <h4 className="text-white font-semibold mb-4">Other Tools</h4>
              <ul className="space-y-2">
                <li>
                  <a href="https://pdf.idho.eu.org" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white text-sm transition">
                    PDF Tools
                  </a>
                </li>
                <li>
                  <a href="https://excalidraw.idho.eu.org" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white text-sm transition">
                    Excalidraw
                  </a>
                </li>
              </ul>
            </div>

            {/* Connect Column */}
            <div>
              <h4 className="text-white font-semibold mb-4">Connect</h4>
              <div className="flex justify-center md:justify-start gap-4">
                <a
                  href="https://github.com/ridhoarmand"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 bg-zinc-900 rounded-full text-gray-400 hover:bg-white hover:text-black transition-all duration-300 border border-zinc-800 hover:border-transparent"
                  aria-label="GitHub"
                >
                  <Github className="w-4 h-4" />
                </a>
                <a
                  href="https://www.linkedin.com/in/ridhoarmand"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 bg-zinc-900 rounded-full font-bold text-gray-400 hover:bg-blue-600 hover:text-white transition-all duration-300 border border-zinc-800 hover:border-transparent flex items-center justify-center leading-none"
                  aria-label="LinkedIn"
                >
                  in
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent my-8" />

        {/* Bottom Section */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 text-xs text-gray-500">
          <p>© {new Date().getFullYear()} NobarFilm. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
