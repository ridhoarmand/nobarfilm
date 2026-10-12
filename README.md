# 🎬 NobarFilm — Modern Web & Mobile Movie Streaming Engine

[![Next.js](https://img.shields.io/badge/Next.js-16_App_Router-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**NobarFilm** adalah platform streaming film dan serial TV modern berbasis Next.js 16 (App Router), React 19, TanStack Query 5, Zustand, dan Socket.IO. Proyek ini berfungsi sebagai platform web produksi sekaligus basis arsitektur untuk porting aplikasi mobile Flutter.

---

## 📚 Pusat Dokumentasi Resmi (Documentation Hub)

Dokumentasi proyek ini terorganisir secara hirarkis dan saling terhubung dengan path relatif:

| Berkas Dokumentasi | Deskripsi & Cakupan |
|---|---|
| 🗺️ [**docs/INDEX.md**](docs/INDEX.md) | **Peta Situs & Indeks Navigasi Dokumentasi Resmi**. |
| 🏗️ [**docs/ARCHITECTURE.md**](docs/ARCHITECTURE.md) | Arsitektur Web Next.js, BFF Internal, HLS Video Player & Proxy. |
| 📱 [**docs/FLUTTER_PORTING_GUIDE.md**](docs/FLUTTER_PORTING_GUIDE.md) | Panduan Porting ke Flutter & SDK Spesifikasi Bahasa Dart. |
| 🤖 [**AGENTS.md**](AGENTS.md) | Pedoman & Direktif Otorisasi untuk AI Agent (Cursor / Antigravity). |
| 📦 [**repack-moviebox/README.md**](repack-moviebox/README.md) | **Sub-Hub Reverse Engineering, API SDK & Tools Repacking**. |

### 🛠️ Sub-Modul Reverse Engineering (`repack-moviebox/docs/`)

- 📥 [**repack-moviebox/docs/DOWNLOAD_AND_APK_GUIDE.md**](repack-moviebox/docs/DOWNLOAD_AND_APK_GUIDE.md): Panduan detail unduh APK, ekstraksi direct link F12/cURL, & manajemen folder lokal.
- 📡 [**repack-moviebox/docs/API.md**](repack-moviebox/docs/API.md): Spesifikasi lengkap REST API Mobile App BFF (`api6.aoneroom.com`).
- 🛠️ [**repack-moviebox/docs/TOOLS_AND_WORKFLOWS.md**](repack-moviebox/docs/TOOLS_AND_WORKFLOWS.md): Katalog Tools (JADX, Frida, Objection, Ghidra, HTTP Toolkit) & Alur Kerja.
- 🔑 [**repack-moviebox/docs/EXTRACT_SIGNATURE.md**](repack-moviebox/docs/EXTRACT_SIGNATURE.md): Panduan teknis ekstraksi HMAC-MD5 signature & secret keys.
- 🔧 [**repack-moviebox/docs/GUIDE_REPACK.md**](repack-moviebox/docs/GUIDE_REPACK.md): Panduan decompile, Smali patching, build, zipalign & sign APK.
- 🤖 [**repack-moviebox/docs/AGENT.md**](repack-moviebox/docs/AGENT.md): SOP & System Prompt AI Agent untuk otomatisasi pekerjaan.

---

## 🚀 Panduan Setup & Instalasi Lokal

### 1. Prasyarat Sistem
- **Node.js**: v18.0.0 atau versi lebih baru
- **Package Manager**: `npm`, `yarn`, atau `pnpm`

### 2. Langkah Instalasi

```bash
# 1. Clone Repository
git clone https://github.com/ridhoarmand/nobarfilm.git
cd nobarfilm

# 2. Install Dependencies
npm install

# 3. Konfigurasi Environment Variable
cp .env.example .env.local

# 4. Jalankan Mode Development
npm run dev
```

Buka browser di `http://localhost:3000`.

Letakkan skrip percobaan di `scratch/`. Cache `.codegraph/`, cache compiler TypeScript, dan berkas `.env` lokal tidak ikut Git atau konteks build container; `.env.example` tetap disertakan.

---

## 🧪 Script Diagnostik & Health-Check Service

Untuk memverifikasi koneksi API dan signature secara otomatis tanpa perlu setup AI:

```bash
npx tsx repack-moviebox/scripts/extract_keys.ts
```

Output yang diharapkan: `HTTP 200 OK` beserta Master Bearer Token valid.

---

## 🐳 Deploy Menggunakan Docker

```bash
docker-compose up -d --build
```
Aplikasi akan berjalan di port `3000`.

---

## 🔁 Ganti Host API & DNS

Konfigurasi host API H5 via environment variable (lihat `src/lib/moviebox/config.ts`):

- **`MOVIEBOX_WEB_BFF_HOSTS`** — daftar host API urut, dipisah koma. Default: `https://h5-api.aoneroom.com,https://officialmoviebox.com`. Host pertama = primer, sisanya = fallback berurutan.
- **`MOVIEBOX_WEB_REFERER_ORIGIN`** — origin referer request. Default: `https://officialmoviebox.com`. Hanya diubah jika provider memindahkan situs webnya.

**Perilaku fallback:** setiap request dicoba ke host satu per satu dari kiri ke kanan saat terjadi network error, 404, atau 5xx. Host pertama yang berhasil dipakai.

**Catatan DNS:** DNS server Anda memblokir domain di atas? Set DNS sistem ke `8.8.8.8` / `1.1.1.1` (atau gunakan DoH). Browser tidak pernah resolve host CDN video secara langsung karena semua video melewati `/api/proxy/video` server-side.

---

## Playback H5: Suara dan Subtitle

- Sumber video diambil melalui `/subject/play`; subtitle terpisah diambil melalui `/subject/caption` dengan `format`, ID stream, `subjectId`, dan `detailPath`. Kedua request tidak menggunakan login, Bearer, atau HMAC.
- Subtitle SRT melewati `/api/subtitle` untuk dikonversi menjadi WebVTT. Referer mengikuti `MOVIEBOX_WEB_REFERER_ORIGIN`; ketersediaan bahasa bergantung pada judul dan episode.
- Cache playback browser menggunakan versi payload agar data lama tanpa subtitle tidak digunakan kembali.
- Tombol **Nyalakan Suara** memulihkan volume terakhir yang terdengar ketika volume nol. Perubahan mute/volume native juga disinkronkan dengan kontrol dan preferensi browser.
- **Audio & Subtitle → Cari subtitle lain** mencari subtitle Indonesia melalui SubDL. Pilih kandidat judul/tahun, lalu release dan **Gunakan**. Season/episode mengikuti video aktif; subtitle bawaan tetap aktif sampai file tambahan berhasil dimuat. Hasil SubDL hanya tersedia untuk media asalnya; pemilihan subtitle tetap pribadi saat nobar.
- Unggahan `.srt` atau `.vtt` tersedia di **Audio & Subtitle → Pengaturan subtitle**. SRT dikonversi ke WebVTT di browser; URL Blob bertahan selama halaman watch terbuka dan dicabut saat keluar. Ukuran, delay, dan posisi diterapkan kembali setelah cue dimuat, termasuk setelah ganti kualitas.
- Buffering memakai indikator tanpa persentase; kegagalan video menampilkan pesan terpisah dengan tombol **Coba putar lagi**.
- **Batal** pada banner episode berikutnya menonaktifkan auto-next untuk episode aktif, bukan sekadar menutup banner. Pilihan **Sampai video selesai** menghentikan playback pada event `ended` dan mengalahkan auto-next; timer 15/30/45/60 menit tetap berdasarkan waktu nyata.
- Set `SUBDL_API_KEY` sebagai secret runtime server dari [panel SubDL](https://subdl.com/panel/api). `.env.example` menyediakan nama variabel kosong dan Compose meneruskannya saat runtime; jangan memakai `NEXT_PUBLIC_*` atau build args. Tanpa key valid, pencarian menampilkan pesan belum dikonfigurasi; playback dan subtitle bawaan tetap berjalan.
- [API SubDL v2](https://subdl.com/developers) memakai kuota bersama untuk satu key. Akun Free yang diuji menyediakan 2.000 pencarian dan 50 unduhan per hari. Cache sukses dan ticket unduhan berlaku 300 detik dalam proses server; restart memerlukan pencarian ulang. Deployment banyak replica perlu sticky routing untuk alur pencarian/unduhan.
- Hasil pencarian belum menjamin file dapat dimainkan atau timing sinkron. Integrasi menerima file individual SRT/VTT, bukan ZIP/ASS/SSA; provider dapat menolak unduhan meski metadata menampilkan satu file. Pilih release lain jika file ditolak atau berbeda cut, dan gunakan delay untuk offset konstan. Tidak ada retry otomatis yang menghabiskan kuota.

Verifikasi lokal: jalankan `npm run dev`, buka halaman watch, pilih subtitle bawaan atau **Cari subtitle lain**, lalu uji upload dari **Pengaturan subtitle**, Nonaktif, ganti kualitas/episode, dan nobar dengan pilihan subtitle berbeda. Regresi BFF/converter: `node --import tsx --test src/lib/subdl.test.mts src/lib/subtitleCache.test.mts`. Sampel provider: Dune (2021) berhasil dimuat; Inception dan satu hasil Breaking Bad S5E1 ditemukan tetapi tidak dapat diunduh sebagai file individual. Ini bukan pengukuran keberhasilan seluruh katalog atau sinkronisasi sepanjang film.

---

## UI Responsif dan Navigasi Keyboard

- Header dan footer memakai ikon brand yang sudah tersedia di `public/icon-192.png`.
- HP: navigasi bawah **Beranda / Cari / Favorit**, tombol sentuh minimal 44px, hero ringkas, hasil pencarian dua kolom, dan tata letak detail tanpa potongan horizontal. Favorit tersimpan lokal; menu Favorit menuju bagian `/#favorit`.
- Laptop: pencarian cepat di header, kontrol carousel yang terlihat, judul kartu terbaca tanpa hover, serta tombol favorit terpisah dari tautan detail. Carousel berhenti saat interaksi/fokus dan menghormati preferensi reduced motion.
- Hero beranda dan detail memisahkan backdrop/banner dari poster. Hanya gambar backdrop dengan rasio asli minimal 1,3:1 yang mengisi latar landscape; metadata ukuran cover sintetis tidak dipakai untuk menentukan rasio. Poster portrait ditampilkan utuh (`object-contain`), di kanan teks pada desktop dan di atas teks pada HP/tablet. Jika backdrop gagal atau bukan landscape, hero memakai poster; jika semua gambar gagal, judul dan tombol tetap tersedia. Kartu katalog tidak berubah.
- Layar besar/TV: tipografi lebih besar dan fokus putih-merah. Tombol arah memindahkan fokus antar tautan/tombol dan menggulir kartu ke tampilan; Enter mengaktifkan kontrol yang dipilih.
- Pemutar: header berisi kembali, judul, dan kontrol nobar; footer berisi satu timeline dan satu baris Putar/Jeda, mute, **Audio & Subtitle**, **Pengaturan pemutar**, dan fullscreen. Layout mengikuti lebar pemutar, termasuk ketika panel nobar terbuka. Enter saat belum memfokuskan kontrol memfokuskan tombol Putar/Jeda; kontrol tetap terlihat saat dijeda, fokus keyboard/remote aktif, atau panel terbuka.
- Seek/volume memakai slider native: kiri/kanan mengubah nilai, atas/bawah memindahkan fokus keluar slider. Input teks dan pilihan native tidak diambil alih oleh navigasi arah.
- **Pengaturan pemutar** memuat kualitas, episode (jika tersedia), PiP (jika didukung), kunci layar, timer tidur, dan tips. Panel kualitas, episode, serta audio/subtitle memakai satu pola panel dengan header tetap dan konten bergulir; Escape menutup panel dan mengembalikan fokus ke pembukanya. **Otomatis** hanya menampilkan resolusi aktif jika diketahui dari HLS.
- Episode detail memakai musim aktif yang benar, termasuk ketika musim pertama yang tersedia bukan musim 1.

Verifikasi lokal: jalankan `npm run dev`; periksa beranda, pencarian, favorit, detail, dan pemutar pada 390×844, 844×390, 1365×768, serta 1920×1080. Uji Tab/tombol arah/Enter, seek, pilihan subtitle, dan Escape. Dukungan fullscreen/PiP bergantung pada browser; viewport TV bukan pengujian perangkat TV fisik.
Regresi artwork hero: `node --import tsx --test src/lib/heroArtwork.test.mts`. Smoke browser memakai poster nyata Terikat Janji dan Inception pada 320×740, 390×844, 768×1024, 844×390, dan 1365×768; tidak ada crop portrait, tumpang tindih teks/poster, atau overflow horizontal. Jalur landscape diuji dengan fixture terang 1600×900, termasuk backdrop persegi, gambar gagal, banner tanpa poster, dan gambar kosong; fixture ini bukan bukti ketersediaan backdrop dari provider.

---

## ⚠️ Educational & Non-Commercial Disclaimer

Proyek ini dikembangkan **murni untuk tujuan edukasi, riset teknologi web, dan pemeliharaan SDK internal mandiri**.

1. **Bukan Server Media**: NobarFilm **TIDAK mem-host, menyimpan, atau menyediakan** berkas video/media apa pun di server sendiri.
2. **Penafian Tanggung Jawab**: Pengembang open-source **TIDAK bertanggung jawab** atas segala bentuk penyalahgunaan atau deployment pihak ketiga.

---

## 📄 Lisensi

Di bawah lisensi [MIT License](LICENSE).
