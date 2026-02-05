# 🎬 NobarFilm

Platform streaming dengan fitur nonton bareng (watch party). Mendukung berbagai sumber konten seperti MovieBox, ReelShort, DramaBox, NetShort, FlickReels, FreeReels, dan Melolo.

## Fitur

- **Multi-platform streaming** - Support MovieBox, ReelShort, DramaBox, NetShort, FlickReels, FreeReels, Melolo
- **Download manager** - Download film/series dengan progress tracking
- **Watch party** - Nonton bareng secara real-time dengan sinkronisasi otomatis (pause, play, skip)
- **PWA** - Dapat diinstall sebagai aplikasi native
- **Watch history** - Melanjutkan playback dari posisi terakhir (memerlukan login)
- **Multi-quality** - Pilihan kualitas video dari 360p hingga 1080p

## Tech Stack

- Next.js 16 (App Router)
- TypeScript
- TailwindCSS
- React Query (TanStack Query)
- Plyr (video player)
- Socket.IO (watch party sync)
- Supabase (auth & database)

## Install & Setup

### Prerequisites
- Node.js 18+
- npm atau yarn

### Development

```bash
# Clone repo
git clone https://github.com/ridhoarmand/nobarfilm.git
cd nobarfilm

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local
# Edit .env.local sesuai kebutuhan

# Run dev server
npm run dev

# Run socket server
npm run socket
```

Buka browser di `http://localhost:3000`

### Build Production

```bash
npm run build
npm start
```

## Deployment

### Docker

```bash
docker build -t nobarfilm .
docker run -d -p 3000:3000 nobarfilm
```

### Docker Compose

```bash
docker-compose up -d
```

## Project Structure

```
src/
├── app/                  # Next.js App Router pages
│   ├── api/             # API routes (proxy ke upstream APIs)
│   ├── drama/           # Drama platform pages
│   ├── movie/           # Movie pages
│   ├── watch/           # Watch page (MovieBox)
│   └── watch-party/     # Watch party rooms
├── components/          # React components
│   ├── player/         # Video player & hooks
│   ├── layout/         # Navbar, Footer
│   └── ...
├── hooks/              # Custom hooks (useMovieBox, useDramaBox, etc)
├── lib/                # Utils & helpers
└── types/              # TypeScript types
```

## Notes

- Watch party memerlukan Socket.IO server (lihat `src/server/socket-server.ts`)
- Authentication dan watch history menggunakan Supabase
- Video sources di-proxy melalui Next.js API routes untuk menghindari CORS

Project ini dibuat untuk pembelajaran dan eksperimen. Jika menemukan bug atau memiliki saran, silakan buat issue atau pull request.
