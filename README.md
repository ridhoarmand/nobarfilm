# 🎬 NobarFilm

Platform streaming film yang mirip Netflix dengan fitur nonton bareng (Watch Party).
Project ini dibuat menggunakan Next.js App Router terbaru, fokus pada performa dan user experience yang native-like.

---

## Fitur Utama

### 🎥 Streaming & Download
- **Nonton Sepuasnya** - Akses ribuan film dan series dari berbagai sumber.
- **Download Manager** - Bisa download film dan subtitle (background process), ada indikator progress real-time.
- **Save Data** - Support PWA (Progressive Web App), bisa diinstall di HP/Desktop.
- **Smart Quality** - Pilihan resolusi dari 360p hingga 1080p.

### 👥 Nonton Bareng (Nobar)
- **Real-time Sync** - Nonton bareng teman dengan delay hampir nol.
- **Live Chat** - Ngobrol langsung saat nonton.
- **Room System** - Buat room private dan undang teman pakai kode.

### 🛠️ Tech Stack
- **Framework**: Next.js 16 (App Router)
- **UI**: TailwindCSS, Lucide Icons, React Hot Toast
- **State**: Zustand (untuk Download Manager & Global State)
- **Real-time**: Socket.io
- **Deployment**: Docker & Portainer (CI/CD via GitHub Actions)

---

## Cara Install & Jalankan

### Syarat
Pastikan sudah install Node.js (v18+) dan Git.

### 1. Clone Project
```bash
git clone https://github.com/ridhoarmand/nobarfilm.git
cd nobarfilm
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Environment
Copy file `.env.example` ke `.env.local`:
```bash
cp .env.example .env.local
```
Lalu isi variabel yang dibutuhkan (API Endpoint, dll).

### 4. Jalankan (Dev Mode)
```bash
npm run dev
```
Buka browser di `http://localhost:3000`.

---

## Deployment (Docker & CI/CD)

Project ini sudah siap deploy menggunakan Docker.

### Cara Deploy Manual
```bash
# Build image
docker build -t nobarfilm .

# Jalankan container
docker run -d -p 3000:3000 nobarfilm
```

### CI/CD Otomatis (GitHub Actions)
Kami menggunakan flow GitOps sederhana:
1. Push code ke branch `main`.
2. GitHub Actions otomatis build Docker Image -> Push ke Docker Hub.
3. Webhook men-trigger Portainer untuk pull image baru.

**File penting:**
- `.github/workflows/deploy.yml`: Konfigurasi CI/CD.
- `docker-compose.prod.yml`: Konfigurasi untuk production server.

---

## Struktur Folder
- `/src/app` - Halaman website (Next.js App Router).
- `/src/components` - Komponen UI (Navbar, Modal, Player, dll).
- `/src/lib` - Logika bisnis, hook, dan utility (termasuk Download Manager).
- `/src/types` - Definisi TypeScript.

---

## 🎯 Roadmap & Status

Berikut adalah status pengembangan fitur saat ini:

- [x] **Homepage** (Trending, Top Picks)
- [x] **Pencarian** (Movies & Series)
- [x] **Halaman Detail** (Info Cast, Season/Episode)
- [x] **Streaming Player** (Support Multi-quality)
- [x] **Download Manager** (Background process, Toast notification)
- [x] **PWA Support** (Installable App)
- [x] **CI/CD Pipeline** (Docker & GitHub Actions)
- [ ] **Watch Party System** (Room, Sync, Chat)
- [ ] **User Auth** (Login/Register untuk simpan history)
- [ ] **Watch History & Favorites**
- [ ] **Chromecast / AirPlay Support**

---

**Note Development:**
Project ini masih dalam tahap pengembangan aktif. Beberapa fitur mungkin berubah sewaktu-waktu.
Jika menemukan bug, silakan report di Issues.

Selamat menonton! 🍿
