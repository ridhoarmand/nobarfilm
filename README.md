# 🎬 NobarFilm — Modern Web Streaming Platform

**NobarFilm** adalah aplikasi web streaming film dan serial TV dengan antarmuka modern yang cepat, estetis, dan responsif. Dibuat menggunakan Next.js App Router terbaru, TailwindCSS, dan pemutar video HLS kustom untuk memberikan pengalaman menonton berkualitas tinggi tanpa jeda.

---

## 🚀 Panduan Setup & Instalasi Lokal

### 1. Prasyarat Sistem
- **Node.js**: v18.0.0 atau versi lebih baru
- **Package Manager**: `npm`, `yarn`, atau `pnpm`

### 2. Langkah Instalasi

1. **Clone Repository**:
   ```bash
   git clone https://github.com/ridhoarmand/nobarfilm.git
   cd nobarfilm
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Konfigurasi Environment Variable**:
   Salin berkas `.env.example` menjadi `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
   *Isi berkas `.env.local` (Opsional, sistem menggunakan fallback otomatis jika dikosongkan)*:
   ```env
   # Email & Password Akun Gateway (Opsional)
   MOVIEBOX_MASTER_EMAIL=
   MOVIEBOX_MASTER_PASSWORD=
   ```

4. **Jalankan Mode Development**:
   ```bash
   npm run dev
   ```
   Buka browser di alamat: `http://localhost:3000`

---

## 🐳 Deploy Menggunakan Docker & Docker Compose

Proyek ini telah dilengkapi konfigurasi Docker untuk kemudahan deployment di VPS / Portainer.

### Jalankan dengan Docker Compose:
```bash
docker-compose up -d --build
```
Aplikasi akan berjalan di port `3000`.

---

## 📦 Production Build (Manual)

Untuk melakukan kompilasi manual pada server non-Docker:

```bash
# 1. Typecheck & Kompilasi Build
npm run build

# 2. Jalankan Server Production
npm start
```

---

## 📁 Struktur Direktori Proyek

```
nobarfilm/
├── public/                 # PWA Manifest, favicon, & aset publik
├── src/
│   ├── app/                # Next.js App Router (Pages & REST API routes)
│   ├── components/         # Komponen UI (Player, Layout, Cards, Modals)
│   ├── hooks/              # Custom React Hooks (useMovieBox, search, player control)
│   ├── lib/                # Utility & SDK engine (src/lib/moviebox/)
│   ├── styles/             # Global CSS & Tailwind configuration
│   └── types/              # Deklarasi tipe TypeScript
├── docker-compose.yml      # Konfigurasi Docker Compose
├── Dockerfile              # Docker build file
└── README.md
```

---

## ⚠️ Educational & Non-Commercial Disclaimer

Proyek perangkat lunak ini dikembangkan **murni untuk tujuan edukasi, pembelajaran, dan riset teknologi web** (demonstrasi arsitektur Next.js App Router, HLS Video Player Engine, PWA, dan React 19).

1. **Bukan Server Media (No Media Hosting)**: NobarFilm **TIDAK mem-host, menyimpan, mengunggah, atau menyediakan** berkas video/media apa pun di server sendiri. Seluruh data metadata dan link stream diperoleh secara dinamis (*on-demand*) dari layanan pihak ketiga eksternal.
2. **Penafian Tanggung Jawab (Author Non-Liability)**: Pengembang open-source perangkat lunak ini **TIDAK bertanggung jawab** atas segala bentuk penyalahgunaan, pendistribusian ulang, atau deployment pihak ketiga atas kode sumber ini.
3. **DMCA / Pembersihan Hak Cipta**: Jika Anda adalah pemegang hak cipta dan memiliki kekhawatiran terkait sumber stream pihak ketiga eksternal, silakan hubungi penyedia pihak ketiga terkait secara langsung.

---

## 📄 Lisensi

Proyek ini dilindungi di bawah lisensi [MIT License](LICENSE). 
Proyek ini dibuat untuk keperluan pembelajaran dan eksperimen web development modern.

