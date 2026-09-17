# Task Plan: Inisialisasi Project Backend (Bun + ElysiaJS + Drizzle + MySQL)

## 1. Ringkasan & Tujuan
Menginisialisasi dan menyiapkan fondasi arsitektur project backend baru menggunakan **Bun runtime**, framework **ElysiaJS**, dan ORM **Drizzle** yang terhubung ke database **MySQL**.

Dokumen ini berfungsi sebagai panduan *high-level* untuk developer atau AI model pelaksana dalam membangun struktur dasar project hingga siap digunakan untuk pengembangan fitur bisnis.

---

## 2. Tech Stack & Dependensi Utama

- **Runtime & Package Manager**: [Bun](https://bun.sh/)
- **Web Framework**: [ElysiaJS](https://elysiajs.com/)
- **Database & ORM**:
  - Database: MySQL
  - ORM: Drizzle ORM (`drizzle-orm`)
  - Driver: `mysql2`
  - Migration Tooling: `drizzle-kit`
- **TypeScript**: Didukung *out-of-the-box* oleh Bun

---

## 3. High-Level Roadmap / Milestone

### Milestone 1: Inisialisasi Project & Konfigurasi Dasar
1. Inisialisasi project Bun di root folder (`bun init`).
2. Pasang dependensi utama:
   - Framework & Driver: `elysia`, `drizzle-orm`, `mysql2`
   - Dev Dependencies: `drizzle-kit`, `@types/bun`
3. Siapkan template variabel lingkungan (`.env.example` dan `.env`):
   - Konfigurasi koneksi MySQL: host, port, user, password, database name.
   - Konfigurasi aplikasi: port server.
4. Buat `.gitignore` yang mencakup file `.env`, `node_modules/`, dan build artifacts.

---

### Milestone 2: Struktur Direktori & Konfigurasi Database (Drizzle)
1. Rancang struktur direktori yang modular dan rapi di dalam `src/`, contoh:
   ```text
   src/
   ├── config/      # Konfigurasi aplikasi & env
   ├── db/          # Setup koneksi Drizzle, schema, migrasi
   │   ├── schema/  # Definisi tabel Drizzle
   │   └── index.ts # Inisialisasi client database
   ├── routes/      # Handler / controller endpoint Elysia
   └── index.ts     # Entry point server Elysia
   ```
2. Setup koneksi database di modul database (`src/db/`):
   - Buat *connection pool* MySQL dan inisialisasi Drizzle client.
3. Buat file konfigurasi Drizzle (`drizzle.config.ts`) di root project untuk mengarahkan schema dan folder output migrasi.
4. Buat minimal satu skema tabel dasar sebagai *proof of concept* (misalnya tabel `users` atau health check table).

---

### Milestone 3: Entry Point & Routing Server (ElysiaJS)
1. Buat entry point aplikasi (`src/index.ts`):
   - Inisialisasi instance Elysia.
   - Pasang port listener sesuai variabel lingkungan.
2. Tambahkan endpoint standar:
   - `GET /` atau `GET /health`: Endpoint health check untuk memverifikasi status server dan konektivitas database.
3. Siapkan pola modular routing (menggunakan Elysia plugins/group) agar rute baru mudah ditambahkan.

---

### Milestone 4: Skrip CLI & Verifikasi
1. Daftarkan perintah praktis pada `package.json` (scripts):
   - Script dev server dengan hot reload (`bun run --watch src/index.ts` atau `bun dev`).
   - Script migrasi database menggunakan `drizzle-kit` (`generate`, `migrate`, atau `push`).
2. Lakukan pengujian akhir:
   - Server dapat dijalankan tanpa error.
   - Rute health check merespons dengan status 200.
   - Perintah migrasi Drizzle berhasil membaca skema dan terhubung ke MySQL.

---

## 4. Kriteria Keberhasilan (Definition of Done)
- [ ] File `package.json` dan `tsconfig.json` terkonfigurasi dengan runtime Bun.
- [ ] Seluruh dependensi (`elysia`, `drizzle-orm`, `mysql2`, `drizzle-kit`) terpasang.
- [ ] Koneksi Drizzle ke MySQL telah diinisialisasi dan siap digunakan.
- [ ] Server Elysia dapat dinyalakan dan merespons request HTTP.
- [ ] Skrip Drizzle kit untuk migrasi berfungsi dengan baik.
- [ ] Tersedia dokumentasi singkat pada `README.md` mengenai cara setup `.env` dan menjalankan project.
