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

## ⚠️ Educational & Non-Commercial Disclaimer

Proyek ini dikembangkan **murni untuk tujuan edukasi, riset teknologi web, dan pemeliharaan SDK internal mandiri**.

1. **Bukan Server Media**: NobarFilm **TIDAK mem-host, menyimpan, atau menyediakan** berkas video/media apa pun di server sendiri.
2. **Penafian Tanggung Jawab**: Pengembang open-source **TIDAK bertanggung jawab** atas segala bentuk penyalahgunaan atau deployment pihak ketiga.

---

## 📄 Lisensi

Di bawah lisensi [MIT License](LICENSE).
