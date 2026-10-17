# 🎬 NobarFilm

[![Next.js](https://img.shields.io/badge/Next.js-16_App_Router-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Platform streaming film & serial TV bersubtitle Indonesia dengan watch party (nobar), dibangun di atas Next.js 16 (App Router), React 19, TanStack Query 5, Zustand, dan Socket.IO.

## ✨ Fitur

- **Streaming** video HLS via proxy server — browser tidak pernah resolve host CDN video secara langsung.
- **Subtitle** bawaan dari provider, pencarian SubDL, dan upload `.srt`/`.vtt` (font, delay ±5 dtk, posisi).
- **Watch party** Socket.IO — maks 4 orang, sinkronisasi playback host → guest, chat & reaksi.
- **Kualitas HLS** adaptif (ABR) dengan pemilihan manual per resolusi.
- **PWA** — manifest + ikon, installable layar utama.

## 🚀 Setup

Prasyarat: Node.js ≥ 20 (Dockerfile memakai `node:20-alpine`).

```bash
git clone https://github.com/ridhoarmand/nobarfilm.git
cd nobarfilm
npm install
cp .env.example .env
npm run dev   # dev server + Socket.IO (tsx server/dev.ts) → http://localhost:3000
```

## 🔐 Environment Variables

Sumber: `src/lib/moviebox/config.ts` dan `.env.example`.

| Variabel | Wajib | Keterangan |
|---|---|---|
| `SUBDL_API_KEY` | tidak | Secret **runtime server** (bukan `NEXT_PUBLIC_*`), dari [panel SubDL](https://subdl.com/panel/api). Tanpa key: pencarian subtitle lain mati, playback & subtitle bawaan tetap jalan. |
| `MOVIEBOX_WEB_BFF_HOSTS` | tidak | Daftar host API urut, dipisah koma. Default `https://h5-api.aoneroom.com,https://officialmoviebox.com`. Fallback berurutan saat network error / 404 / 5xx. |
| `MOVIEBOX_WEB_REFERER_ORIGIN` | tidak | Origin referer request. Default `https://officialmoviebox.com`. Hanya diubah jika provider memindahkan situs webnya. |
| `MOVIEBOX_MASTER_EMAIL` + `MOVIEBOX_MASTER_PASSWORD` | tidak | Fallback opsional akun master mobile API. Guest device-session dipakai lebih dulu; konten tetap jalan tanpa keduanya. Detail: `src/lib/moviebox/client.ts`. |

**Catatan DNS:** DNS ISP memblokir domain provider? Pakai `8.8.8.8` / `1.1.1.1` atau DoH. Semua video tetap lewat `/api/proxy/video` server-side.

## 🐳 Docker

```bash
docker compose up -d
```

Image `ridhoarmand/nobarfilm:latest`, port `3000`, healthcheck `/api/health`. CI (`.github/workflows/deploy.yml`) build-push ke Docker Hub dan redeploy Portainer otomatis saat push ke `master`.

## 🧪 Uji

```bash
node --import tsx --test src/lib/*.test.mts src/lib/moviebox/*.test.mts
```

## ⚠️ Educational & Non-Commercial Disclaimer

Proyek ini dikembangkan **murni untuk tujuan edukasi, riset teknologi web, dan pemeliharaan SDK internal mandiri**.

1. **Bukan Server Media**: NobarFilm **TIDAK mem-host, menyimpan, atau menyediakan** berkas video/media apa pun di server sendiri.
2. **Penafian Tanggung Jawab**: Pengembang open-source **TIDAK bertanggung jawab** atas segala bentuk penyalahgunaan atau deployment pihak ketiga.

---

## 📄 Lisensi

Di bawah lisensi [MIT License](LICENSE).
