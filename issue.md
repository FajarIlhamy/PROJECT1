# Task Plan: Implementasi Automated Unit Test untuk Semua API Menggunakan Bun Test

Dokumen ini berisi perencanaan dan spesifikasi skenario pengujian (*test plan*) yang ditujukan untuk **junior programmer** atau **AI model** pelaksana. Dokumen ini menyajikan daftar skenario yang harus diuji secara terstruktur tanpa menyertakan kode implementasi mendetail, sehingga pelaksana dapat mengimplementasikan file pengujian secara mandiri.

---

## 1. Ringkasan & Tujuan

Tujuan dari tugas ini adalah membangun automated unit test menyeluruh untuk memastikan seluruh endpoint API yang tersedia pada aplikasi berjalan stabil, aman, dan konsisten.

- **Test Runner**: [Bun Test](https://bun.sh/docs/cli/test) bawaan dari Bun runtime (`bun test`).
- **Lokasi File**: Disimpan di dalam direktori `tests/`.
- **Konsistensi Data**: Database harus dibersihkan sebelum setiap skenario test dijalankan agar tidak terjadi ketergantungan antar test (*test isolation*).

---

## 2. Ketentuan & Arsitektur Pengujian

1. **Konfigurasi Script `package.json`**:
   - Daftarkan perintah pengujian pada `scripts`:
     ```json
     "test": "bun test"
     ```

2. **Struktur Direktori**:
   - Buat folder `tests/` di root proyek.
   - Organisir file test berdasarkan modul/fitur, contohnya:
     - `tests/root.test.ts` (untuk endpoint root & health check)
     - `tests/users.test.ts` (untuk semua endpoint di bawah `/api/users`)
     - Atau dipisah per endpoint sesuai kebutuhan pelaksana.

3. **Isolasi Data (Setup & Teardown)**:
   - Sebelum setiap skenario dijalankan (`beforeEach` / hook serupa), lakukan pembersihan data pada tabel `sessions` dan tabel `users` di database.
   - Pastikan penghapusan dilakukan dengan urutan yang benar (tabel anak `sessions` terlebih dahulu, lalu tabel induk `users`) untuk menghindari pelanggaran *foreign key constraint*.

---

## 3. Daftar Skenario Pengujian per API

Pelaksana wajib menguji endpoint aplikasi menggunakan metode request langsung ke instance Elysia (`app.handle(request)`). Berikut adalah seluruh skenario yang wajib dicakup:

---

### A. Endpoint Root & Health Check

#### 1. `GET /`
- **Skenario 1.1 (Sukses)**:
  - Kirim request `GET /`.
  - Ekspektasi: HTTP Status `200`, respon berupa string text `"Hello World"`.

#### 2. `GET /health`
- **Skenario 2.1 (Sukses)**:
  - Kirim request `GET /health`.
  - Ekspektasi: HTTP Status `200`, respon berupa JSON `{ "status": "ok" }`.

---

### B. Endpoint Registrasi User (`POST /api/users`)

#### 1. Skenario Positif (Happy Path)
- **Skenario 1.1 (Registrasi Sukses)**:
  - Kirim payload registrasi yang valid (`name`, `email`, `password`).
  - Ekspektasi: HTTP Status `200`, respon `{ "data": "Ok" }`.
  - Verifikasi DB: Data user baru berhasil masuk ke tabel `users`, dan kolom `password` tersimpan dalam bentuk hash bcrypt (tidak tersimpan dalam bentuk *plain text*).
- **Skenario 1.2 (Boundary Test - Batas Maksimum 255 Karakter)**:
  - Kirim nilai `name` dengan panjang tepat 255 karakter.
  - Ekspektasi: HTTP Status `200`, respon `{ "data": "Ok" }`.

#### 2. Skenario Negatif (Validasi Schema / Input)
- **Skenario 2.1 (Name Kosong)**:
  - Kirim payload dengan `name` string kosong `""`.
  - Ekspektasi: HTTP Status `422` (Ditolak oleh validator Elysia).
- **Skenario 2.2 (Name Melebihi Batas Maksimum)**:
  - Kirim nilai `name` melebihi 255 karakter (misal: 256 atau 300 karakter).
  - Ekspektasi: HTTP Status `422` (Ditolak oleh validator, tidak boleh menghasilkan status 500).
- **Skenario 2.3 (Format Email Tidak Valid)**:
  - Kirim payload dengan `email` bukan format email (misal: `"bukan-email"`).
  - Ekspektasi: HTTP Status `422`.
- **Skenario 2.4 (Email Melebihi Batas Maksimum)**:
  - Kirim `email` yang melebihi 255 karakter.
  - Ekspektasi: HTTP Status `422`.
- **Skenario 2.5 (Password Kosong)**:
  - Kirim payload dengan `password` string kosong `""`.
  - Ekspektasi: HTTP Status `422`.
- **Skenario 2.6 (Password Melebihi Batas Maksimum)**:
  - Kirim `password` melebihi 255 karakter.
  - Ekspektasi: HTTP Status `422`.
- **Skenario 2.7 (Field Wajib Tidak Ada / Missing Fields)**:
  - Kirim payload tanpa `name`, tanpa `email`, atau tanpa `password`, atau body kosong `{}`.
  - Ekspektasi: HTTP Status `422`.

#### 3. Skenario Negatif (Aturan Bisnis)
- **Skenario 3.1 (Email Duplikat)**:
  - Siapkan user awal di database, kemudian kirim request registrasi dengan email yang sama persis.
  - Ekspektasi: HTTP Status `400`, respon `{ "error": "email sudah terdaftar" }`.

---

### C. Endpoint Login User (`POST /api/users/login`)

#### 1. Skenario Positif (Happy Path)
- **Skenario 1.1 (Login Sukses)**:
  - Siapkan user di database, lalu kirim email dan password yang sesuai.
  - Ekspektasi: HTTP Status `200`, respon `{ "data": "<token>" }` di mana nilai token merupakan string UUID yang valid.
  - Verifikasi DB: Sesi baru tersimpan di tabel `sessions` dengan `userId` yang sesuai.

#### 2. Skenario Negatif (Validasi Input)
- **Skenario 2.1 (Format Email Tidak Valid)**:
  - Kirim login dengan format email tidak valid.
  - Ekspektasi: HTTP Status `422`.
- **Skenario 2.2 (Password Kosong)**:
  - Kirim login dengan password string kosong.
  - Ekspektasi: HTTP Status `422`.
- **Skenario 2.3 (Body Kosong / Field Kurang)**:
  - Kirim request login tanpa field `email` atau tanpa field `password`.
  - Ekspektasi: HTTP Status `422`.

#### 3. Skenario Negatif (Aturan Bisnis / Autentikasi)
- **Skenario 3.1 (Email Tidak Terdaftar)**:
  - Kirim login dengan email yang belum ada di database.
  - Ekspektasi: HTTP Status `400`, respon `{ "error": "email atau password salah" }`.
- **Skenario 3.2 (Password Salah)**:
  - Siapkan user di database, lalu kirim login dengan email yang terdaftar namun password tidak cocok.
  - Ekspektasi: HTTP Status `400`, respon `{ "error": "email atau password salah" }`.

---

### D. Endpoint Get Current User (`GET /api/users/current`)

#### 1. Skenario Positif (Happy Path & Keamanan)
- **Skenario 1.1 (Sukses Mendapatkan Profil User)**:
  - Siapkan user dan session aktif di database, lalu kirim header `Authorization: Bearer <token_valid>`.
  - Ekspektasi: HTTP Status `200`, respon `{ "data": { "id": ..., "name": "...", "email": "...", "created_at": "..." } }`.
- **Skenario 1.2 (Verifikasi Keamanan Password)**:
  - Periksa respon dari skenario 1.1.
  - Ekspektasi: Field `password` **tidak boleh ada** di dalam objek `data` demi alasan keamanan.

#### 2. Skenario Negatif (Header & Autentikasi)
- **Skenario 2.1 (Tanpa Header Authorization)**:
  - Kirim request tanpa menyertakan header `Authorization`.
  - Ekspektasi: HTTP Status `401`, respon `{ "error": "unauthorized" }`.
- **Skenario 2.2 (Format Header Tidak Sesuai / Bukan Bearer)**:
  - Kirim request dengan header `Authorization: Basic <token>` atau tanpa prefiks `Bearer `.
  - Ekspektasi: HTTP Status `401`, respon `{ "error": "unauthorized" }`.
- **Skenario 2.3 (Token Kosong Setelah Bearer)**:
  - Kirim request dengan header `Authorization: Bearer ` (string token kosong).
  - Ekspektasi: HTTP Status `401`, respon `{ "error": "unauthorized" }`.
- **Skenario 2.4 (Token Tidak Ditemukan di Database)**:
  - Kirim request dengan header `Authorization: Bearer <token_palsu_atau_acak>`.
  - Ekspektasi: HTTP Status `401`, respon `{ "error": "unauthorized" }`.
- **Skenario 2.5 (Session Yatim / User Terkait Telah Terhapus)**:
  - Terdapat baris session di database namun data user acuannya tidak ada di tabel `users`.
  - Ekspektasi: HTTP Status `401`, respon `{ "error": "unauthorized" }`.

---

## 4. Checklist Kriteria Penyelesaian (Definition of Done)

- [x] Script `"test": "bun test"` terdaftar di `package.json`.
- [x] Direktori `tests/` telah dibuat dan berisi file unit test.
- [x] Mekanisme pembersihan database sebelum setiap skenario (`beforeEach`) berfungsi sehingga seluruh skenario independen.
- [x] Seluruh skenario pengujian untuk endpoint Root (`GET /`) dan Health Check (`GET /health`) terimplementasi.
- [x] Seluruh skenario pengujian untuk Registrasi User (`POST /api/users`) terimplementasi (positif, validasi batas, email duplikat).
- [x] Seluruh skenario pengujian untuk Login User (`POST /api/users/login`) terimplementasi (positif, validasi, kredensial salah).
- [x] Seluruh skenario pengujian untuk Current User (`GET /api/users/current`) terimplementasi (positif, keamanan password, unauthorized header).
- [x] Semua test dapat dijalankan sekaligus dengan perintah `bun test` dan berstatus **100% PASS** tanpa error atau *race condition*.
