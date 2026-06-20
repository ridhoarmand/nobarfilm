# 🎬 NobarFilm

Platform streaming film dan series TV yang mirip dengan Netflix. Project ini dibangun menggunakan Next.js App Router terbaru, fokus pada performa cepat dan user experience yang modern.

## Fitur Utama

- **Streaming Film & Series** - Akses ribuan judul film dan serial TV.
- **Search Engine** - Cari film dan series dengan keyword secara instan.
- **Multi-quality** - Pilihan kualitas resolusi video dari 360p hingga 1080p.
- **Dua Bahasa / Dubbing** - Mendukung pergantian trek audio/dubbing (misalnya dubbing bahasa Inggris, Arab, dll.) yang secara otomatis melanjutkan posisi menonton (*resume play*).
- **Subtitle Manager** - Integrasi subtitle eksternal (.srt) yang otomatis dikonversi menjadi WebVTT secara optimal lengkap dengan dukungan encoding utf-8.
- **Download Manager** - Unduh film/series untuk ditonton secara offline secara langsung dari browser dengan visualisasi progress.
- **PWA (Progressive Web App)** - Dapat diinstall di HP/Desktop layaknya aplikasi native dengan dukungan Service Worker.
- **Watch History** - Menyimpan riwayat tontonan terakhir (memerlukan akun/login).

## Tech Stack

- **Framework**: Next.js 16 (App Router) & React 19
- **Language**: TypeScript
- **Styling**: TailwindCSS v4
- **State Management**: React Query (TanStack Query) & Zustand
- **Video Player**: HTML5 Video Player (Native Player)
- **Upstream Integration**: MovieBox Mobile & H5 APIs

## Install & Setup

### Prerequisites
- Node.js 18+
- npm atau yarn

### Development

1. **Clone repository:**
   ```bash
   git clone https://github.com/ridhoarmand/nobarfilm.git
   cd nobarfilm
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Setup environment variables:**
   Buat file `.env.local` di root direktori:
   ```bash
   cp .env.example .env.local
   ```
   Lalu konfigurasikan variabel berikut pada `.env.local`:
   - `MOVIEBOX_MASTER_EMAIL`: Email akun MovieBox untuk guest fallback.
   - `MOVIEBOX_MASTER_PASSWORD`: Password akun MovieBox untuk guest fallback.

4. **Jalankan dev server:**
   ```bash
   npm run dev
   ```
   Buka browser di `http://localhost:3000`.

### Production Build

```bash
npm run build
npm start
```

## Project Structure

```
src/
├── app/                  # Next.js App Router pages & API routes
│   ├── [id]/            # Halaman detail film / series
│   ├── api/             # API routes (auth, moviebox SDK proxy, subtitle converter)
│   ├── auth/            # Halaman Login & Register
│   ├── search/          # Halaman pencarian film
│   └── watch/           # Halaman video streaming player
├── components/          # React components
│   ├── cards/          # Komponen kartu media (UnifiedMediaCard)
│   ├── layout/         # Layout utama (Navbar, Footer)
│   └── player/         # Video player component (MoviePlayer)
├── hooks/              # Custom React hooks (useMovieBox, dll)
├── lib/                # Utility, API utils & SDK moviebox
└── types/              # TypeScript type definitions
```

---
Project ini dibuat untuk pembelajaran dan eksperimen. Jika menemukan bug atau memiliki saran, silakan buat issue atau pull request.

