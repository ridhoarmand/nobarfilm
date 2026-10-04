import Link from 'next/link';
import Image from 'next/image';
import { Github, AlertTriangle } from 'lucide-react';

export function Footer() {
  return (
    <footer className="w-full bg-[#0a0a0a] text-gray-400 py-10 mt-auto border-t border-zinc-800/60">
      <div className="content-container">
        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-8">
          {/* Left Section: Brand & Disclaimer */}
          <div className="flex-1 max-w-xl text-center md:text-left">
            <Link href="/" aria-label="NobarFilm — Beranda" className="mb-4 inline-flex min-h-11 items-center gap-3 rounded-xl">
              <Image src="/icon-192.png" alt="" width={64} height={64} className="size-16 shrink-0 rounded-xl" />
              <h2 className="text-2xl font-black text-white tracking-wide flex items-center justify-center md:justify-start gap-1">
                NOBAR<span className="text-red-600">FILM</span>
              </h2>
            </Link>
            <div className="bg-red-950/20 border border-red-900/30 rounded-lg p-3 flex items-start gap-3 mt-2">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-gray-400 leading-relaxed text-left">
                <span className="font-semibold text-gray-300">Informasi:</span> NobarFilm tidak menyimpan berkas video. Konten disediakan oleh pihak ketiga yang tidak berafiliasi dengan NobarFilm.
              </p>
            </div>
          </div>

          {/* Right Section: Navigation Links & Socials */}
          <div className="flex-1 flex flex-col md:flex-row justify-center md:justify-end gap-x-12 gap-y-8 mt-6 md:mt-0 text-center md:text-left">
            {/* Explore Column */}
            <div>
              <h4 className="text-white font-semibold mb-2">Jelajahi</h4>
              <ul>
                <li><Link href="/" className="inline-flex min-h-11 items-center rounded-lg text-sm transition hover:text-white">Beranda</Link></li>
                <li><Link href="/search" className="inline-flex min-h-11 items-center rounded-lg text-sm transition hover:text-white">Cari film &amp; serial</Link></li>
                <li><Link href="/#favorit" className="inline-flex min-h-11 items-center rounded-lg text-sm transition hover:text-white">Favorit saya</Link></li>
                <li>
                  <a href="https://anime.idho.eu.org" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-lg text-gray-400 hover:text-white text-sm transition">
                    NobarAnime
                  </a>
                </li>
                <li>
                  <a href="https://film.idho.eu.org" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-lg text-gray-400 hover:text-white text-sm transition">
                    NobarFilm
                  </a>
                </li>
              </ul>
            </div>

            {/* Other Tools Column */}
            <div>
              <h4 className="text-white font-semibold mb-2">Alat lainnya</h4>
              <ul>
                <li>
                  <a href="https://pdf.idho.eu.org" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-lg text-gray-400 hover:text-white text-sm transition">
                    PDF Tools
                  </a>
                </li>
                <li>
                  <a href="https://excalidraw.idho.eu.org" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-lg text-gray-400 hover:text-white text-sm transition">
                    Excalidraw
                  </a>
                </li>
              </ul>
            </div>

            {/* Connect Column */}
            <div>
              <h4 className="text-white font-semibold mb-4">Sosial</h4>
              <div className="flex justify-center md:justify-start gap-4">
                <a
                  href="https://github.com/ridhoarmand"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex size-11 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 text-gray-400 transition-colors hover:bg-white hover:text-black"
                  aria-label="GitHub"
                >
                  <Github className="w-4 h-4" />
                </a>
                <a
                  href="https://www.linkedin.com/in/ridhoarmand"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex size-11 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 font-bold text-gray-400 transition-colors hover:bg-blue-600 hover:text-white"
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
          <p>© {new Date().getFullYear()} NobarFilm. Seluruh hak dilindungi.</p>
        </div>
      </div>
    </footer>
  );
}
