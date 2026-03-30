<div align="center">

<img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=700&size=40&pause=1000&color=6366F1&center=true&vCenter=true&width=600&height=80&lines=SmartPOS+%F0%9F%9B%92;Point+of+Sale+System" alt="SmartPOS" />

<br/>

**SmartPOS** adalah sistem Point of Sale modern dan cerdas yang dibangun dengan arsitektur multi-stack — menggabungkan kekuatan **Laravel**, **React.js**, dan **Django** untuk pengalaman kasir yang cepat, andal, dan mudah digunakan.

<br/>

[![Laravel](https://img.shields.io/badge/Laravel-11.x-FF2D20?style=for-the-badge&logo=laravel&logoColor=white)](https://laravel.com)
[![React](https://img.shields.io/badge/React-18.x-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![Django](https://img.shields.io/badge/Django-5.x-092E20?style=for-the-badge&logo=django&logoColor=white)](https://djangoproject.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-Cache-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

<br/>

![GitHub last commit](https://img.shields.io/github/last-commit/iostream-code/smartpos?style=flat-square&color=6366F1)
![GitHub issues](https://img.shields.io/github/issues/iostream-code/smartpos?style=flat-square&color=f59e0b)
![GitHub stars](https://img.shields.io/github/stars/iostream-code/smartpos?style=flat-square&color=facc15)

</div>

---

## 📸 Screenshots

<div align="center">

| Dashboard | Kasir / POS | Laporan |
|:---------:|:-----------:|:-------:|
| ![Dashboard](umkm-pos-asset/smartpos-dashboard.png) | ![POS](umkm-pos-asset/smartpos-pos.png) | ![Report](umkm-pos-asset/smartpos-analytics.png) |
| Ringkasan penjualan harian | Antarmuka kasir real-time | Analitik & grafik penjualan |

</div>

---

## 🏗️ Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────────┐
│                        SmartPOS System                      │
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Frontend   │    │  Backend API │    │  AI/Analytics│  │
│  │  React.js    │◄──►│   Laravel    │◄──►│    Django    │  │
│  │              │    │              │    │              │  │
│  │ • Kasir UI   │    │ • REST API   │    │ • ML Model   │  │
│  │ • Dashboard  │    │ • Auth/RBAC  │    │ • Forecasting│  │
│  │ • Laporan    │    │ • Inventory  │    │ • Reports    │  │
│  └──────────────┘    └──────┬───────┘    └──────────────┘  │
│                             │                               │
│                    ┌────────▼────────┐                      │
│                    │   Database      │                      │
│                    │ PostgreSQL+Redis │                      │
│                    └─────────────────┘                      │
└─────────────────────────────────────────────────────────────┘
```

---

## ✨ Fitur Utama

### 🛒 Point of Sale
- Antarmuka kasir yang **cepat dan responsif**
- Pencarian produk real-time dengan barcode scanner
- Keranjang belanja dinamis dengan diskon & promo
- Cetak struk otomatis (PDF / Thermal Printer)
- Pembayaran multi-metode: tunai, QRIS, kartu debit/kredit

### 📦 Manajemen Inventori
- Stok real-time dengan notifikasi low-stock
- Multi-gudang & multi-cabang
- Riwayat mutasi barang lengkap
- Import/export produk via Excel

### 📊 Laporan & Analitik
- Dashboard penjualan harian, mingguan, bulanan
- Laporan laba-rugi otomatis
- Prediksi tren penjualan berbasis AI (Django ML)
- Export laporan ke PDF & Excel

### 👥 Manajemen Pengguna
- Role-based access control (Admin, Kasir, Manager)
- Multi-cabang dengan hak akses terpisah
- Log aktivitas pengguna

### 🔌 Integrasi
- Payment gateway (Midtrans / Xendit)
- Marketplace sync (opsional)
- WhatsApp notification (order & stok)

---

## 🛠️ Tech Stack

| Layer | Teknologi | Fungsi |
|-------|-----------|--------|
| **Frontend** | React.js 18, Vite, Tailwind CSS | Antarmuka pengguna (SPA) |
| **State Management** | Redux Toolkit / Zustand | Manajemen state global |
| **Backend API** | Laravel 13, Sanctum | REST API utama, autentikasi |
| **AI/ML Service** | Django 5, DRF, Pandas | Analitik, prediksi, laporan |
| **Database** | PostgreSQL 18 | Data utama |
| **Cache/Queue** | Redis | Caching, job queue |
| **Storage** | Laravel Storage | Penyimpanan file & gambar |

---

## 📁 Struktur Proyek

```
umkm-pos-app/
├── 📂 umkm-pos-fe/               # React.js Application
│   ├── src/
│   │   ├── components/        # UI Components
│   │   ├── pages/             # Halaman (Dashboard, POS, dll)
│   │   ├── store/             # Redux / Zustand store
│   │   ├── hooks/             # Custom hooks
│   │   └── services/          # API service calls
│   ├── public/
│   └── package.json
│
├── 📂 umkm-pos-be/                # Laravel Application
│   ├── app/
│   │   ├── Http/Controllers/  # API Controllers
│   │   ├── Models/            # Eloquent Models
│   │   ├── Services/          # Business logic
│   │   └── Policies/          # Authorization
│   ├── database/
│   │   ├── migrations/
│   │   └── seeders/
│   ├── routes/api.php
│   └── composer.json
│
├── 📂 umkm-pos-ml/              # Django Application
│   ├── apps/
│   │   ├── reports/           # Laporan & analitik
│   │   ├── forecasting/       # Prediksi ML
│   │   └── api/               # DRF endpoints
│   ├── manage.py
│   └── requirements.txt
│
├── docker-compose.yml
└── README.md
```

---

## 🚀 Instalasi & Setup

### Prasyarat

Pastikan sudah terinstal:
- **PHP** >= 8.2
- **Node.js** >= 20.x
- **Python** >= 3.11
- **Composer** >= 2.x
- **PostgreSQL** >= 16.0
- **Redis**

---

### 1️⃣ Clone Repository

```bash
git clone https://github.com/iostream-code/umkm-pos-app.git
cd umkm-pos-app
```

---

### 2️⃣ Setup Backend (Laravel)

```bash
cd umkm-pos-be

# Install dependencies
composer install

# Salin file environment
cp .env.example .env

# Generate app key
php artisan key:generate

# Konfigurasi .env (database, redis, dll)
nano .env

# Jalankan migrasi & seeder
php artisan migrate --seed

# Generate API docs (opsional)
php artisan l5-swagger:generate

# Jalankan server
php artisan serve
```

> Laravel API akan berjalan di `http://localhost:8000`

---

### 3️⃣ Setup Frontend (React.js)

```bash
cd umkm-pos-fe

# Install dependencies
npm install

# Salin file environment
cp .env.example .env.local

# Sesuaikan VITE_API_URL di .env.local
# VITE_API_URL=http://localhost:8000/api

# Jalankan development server
npm run dev
```

> Frontend akan berjalan di `http://localhost:5173`

---

### 4️⃣ Setup Analytics Service (Django)

```bash
cd umkm-pos-ml

# Buat virtual environment
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Salin file environment
cp .env.example .env

# Jalankan migrasi
python manage.py migrate

# Jalankan server
python manage.py runserver 8001
```

> Django API akan berjalan di `http://localhost:8001`

---

### 5️⃣ Setup dengan Docker (Opsional)

```bash
# Copy env file
cp .env.example .env

# Build & jalankan semua service sekaligus
docker-compose up --build

# Jalankan migrasi di dalam container
docker-compose exec backend php artisan migrate --seed
```

Akses aplikasi:
| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Laravel API | http://localhost:8000 |
| Django API | http://localhost:8001 |

---

## ⚙️ Konfigurasi Environment

### Backend (`umkm-pos-be/.env`)

```env
APP_NAME=SmartPOS
APP_ENV=local
APP_KEY=
APP_URL=http://localhost:8000

DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=smartpos
DB_USERNAME=root
DB_PASSWORD=

REDIS_HOST=127.0.0.1
REDIS_PORT=6379

ANALYTICS_SERVICE_URL=http://localhost:8001
```

### Frontend (`umkm-pos-fe/.env.local`)

```env
VITE_APP_NAME=SmartPOS
VITE_API_URL=http://localhost:8000/api
VITE_ANALYTICS_URL=http://localhost:8001/api
```

### Analytics (`umkm-pos-ml/.env`)

```env
DEBUG=True
SECRET_KEY=your-django-secret-key
DATABASE_URL=pgsql://root:password@localhost:3306/smartpos_analytics
ALLOWED_HOSTS=localhost,127.0.0.1
LARAVEL_API_URL=http://localhost:8000/api
```

---

## 🔌 API Endpoints

### Laravel (Backend Utama)

```
POST   /api/auth/login          # Login
POST   /api/auth/logout         # Logout
GET    /api/products             # Daftar produk
POST   /api/transactions         # Buat transaksi
GET    /api/inventory            # Cek stok
GET    /api/users                # Manajemen user
```

### Django (Analytics Service)

```
GET    /api/reports/daily        # Laporan harian
GET    /api/reports/monthly      # Laporan bulanan
GET    /api/forecast/sales       # Prediksi penjualan
GET    /api/analytics/top-items  # Produk terlaris
```

---

## 🤝 Kontribusi

Kontribusi sangat diterima! Ikuti langkah berikut:

1. **Fork** repository ini
2. Buat branch fitur: `git checkout -b feature/nama-fitur`
3. Commit perubahan: `git commit -m 'feat: menambahkan fitur X'`
4. Push ke branch: `git push origin feature/nama-fitur`
5. Buat **Pull Request**

### Konvensi Commit

Gunakan format [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: menambahkan fitur baru
fix: memperbaiki bug
docs: update dokumentasi
style: perubahan styling
refactor: refaktor kode
test: menambahkan unit test
```

---

## 🧪 Testing

```bash
# Laravel Tests
cd umkm-pos-be
php artisan test

# React Tests
cd umkm-pos-fe
npm run test

# Django Tests
cd umkm-pos-ml
python manage.py test
```

---

## 📄 Lisensi

Proyek ini dilisensikan di bawah **MIT License** — lihat file [LICENSE](LICENSE) untuk detail.

---

## 👨‍💻 Tim Pengembang

<div align="center">

| Avatar | Nama | Role |
|:------:|:----:|:----:|
| ![Dev]([umkm-pos-asset/profile.jpeg](https://placehold.co/60x60/6366f1/white?text=IC)) | **iostream-code** | Full Stack Developer |

</div>

---

<div align="center">

**SmartPOS** — Dibuat dengan ❤️ di Indonesia 🇮🇩

⭐ Jangan lupa beri bintang jika proyek ini membantu!

[![GitHub stars](https://img.shields.io/github/stars/iostream-code/smartpos?style=social)](https://github.com/iostream-code/umkm-pos-app)

</div>
