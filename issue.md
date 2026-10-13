# Task Plan: Perbaikan Bug Validasi Panjang Karakter Nama User (ER_DATA_TOO_LONG / HTTP 500)

Dokumen ini berisi panduan perbaikan langkah demi langkah (*step-by-step*) yang ditujukan untuk **junior programmer** atau **AI model** pelaksana. Ikuti setiap tahapan secara berurutan dengan teliti.

---

## 1. Deskripsi Masalah & Analisis Bug

### A. Gejala Bug
Ketika klien mengirimkan request registrasi user baru dengan nilai `name` yang memiliki panjang lebih dari 255 karakter (contoh: 300 karakter), server mengembalikan respon:
```json
HTTP 500 Internal Server Error
{
  "error": "Internal Server Error"
}
```

### B. Akar Masalah (Root Cause)
1. **Validasi Skema Route Tidak Membatasi Panjang Maksimum**:
   Pada file `src/routes/users-route.ts`, validasi request body menggunakan TypeBox Elysia (`t.Object`) hanya menetapkan `{ minLength: 1 }` tanpa properti `maxLength`:
   ```typescript
   body: t.Object({
     name: t.String({ minLength: 1 }),
     email: t.String({ format: 'email' }),
     password: t.String({ minLength: 1 }),
   })
   ```
   Hal ini menyebabkan input nama dengan panjang berapapun (misal 300 karakter) lolos dari validasi layer routing HTTP.

2. **Kolom Database Berukuran Terbatas**:
   Pada file `src/db/schema.ts`, kolom `name` pada tabel `users` didefinisikan sebagai `varchar(255)`:
   ```typescript
   name: varchar('name', { length: 255 }).notNull(),
   ```

3. **Database Error Tertangkap Fallback 500**:
   Saat Drizzle ORM mencoba mengeksekusi query `INSERT` ke database MySQL, MySQL menolak query dengan error:
   ```text
   ER_DATA_TOO_LONG: Data too long for column 'name' at row 1 (errno: 1406, sqlState: 22001)
   ```
   Karena `src/routes/users-route.ts` hanya menangani error `"email sudah terdaftar"` secara spesifik, error database tersebut jatuh ke blok fallback `set.status = 500; return { error: "Internal Server Error" }`.

### C. Solusi yang Diharapkan
- Validasi harus menangkap string yang melebihi batas sebelum query database dijalankan.
- Tambahkan batasan `maxLength: 255` pada field `name` (dan field relevan lainnya seperti `email` dan `password`).
- Input yang melebihi batas harus otomatis ditolak oleh Elysia dengan kode status HTTP yang tepat (HTTP 400 / 422 Validation Error) dan tidak menghasilkan HTTP 500.

---

## 2. Struktur Direktori & File yang Terkait

```text
src/
├── db/
│   ├── index.ts          # Koneksi Drizzle ke database
│   └── schema.ts         # Definisi skema tabel users (panjang varchar: 255)
├── routes/
│   └── users-route.ts    # [FILE TARGET] Skema validasi body & handling route registrasi
├── services/
│   └── users-service.ts  # Logic registrasi user & hashing password
└── index.ts              # Entry point server aplikasi
```

---

## 3. Alur Kerja Sebelum vs Sesudah Perbaikan

### Sebelum Perbaikan (Buggy):
```text
[Request POST /api/users (name 300 chars)]
                   │
                   ▼
       [Validasi Elysia (minLength: 1)] ──► LOLOS
                   │
                   ▼
         [Panggil registerUser()]
                   │
                   ▼
       [Insert ke MySQL varchar(255)] ──► GAGAL (ER_DATA_TOO_LONG)
                   │
                   ▼
     [Catch Error di Route] ──► Return HTTP 500 Internal Server Error
```

### Sesudah Perbaikan (Fixed):
```text
[Request POST /api/users (name 300 chars)]
                   │
                   ▼
 [Validasi Elysia (minLength: 1, maxLength: 255)]
                   │
                   ├──► Tidak Valid (> 255 chars) ──► Return HTTP 422 / 400 Validation Error
                   └──► Valid (1 - 255 chars)
                             │
                             ▼
                   [Lanjut eksekusi registerUser()]
```

---

## 4. Tahapan Implementasi Langkah-demi-Langkah

### Tahap 1: Buka File `src/routes/users-route.ts`
Cari definisi route `POST /api/users` pada baris skema validasi `body: t.Object(...)`.

### Tahap 2: Tambahkan Batasan `maxLength` pada Skema Validasi Body
Ubah validasi pada `t.Object` agar memiliki batasan `maxLength: 255` yang selaras dengan kapasitas kolom database:

```typescript
    body: t.Object({
      name: t.String({ minLength: 1, maxLength: 255 }),
      email: t.String({ format: 'email', maxLength: 255 }),
      password: t.String({ minLength: 1, maxLength: 255 }),
    })
```

> **Catatan Penting untuk Junior Developer:**
> - Mengapa `email` juga diberi `maxLength: 255`? Karena kolom `email` di database juga bertipe `varchar(255)`.
> - Mengapa `password` diberi `maxLength: 255`? Selain kolom password bertipe `varchar(255)`, algoritma hashing bcrypt memiliki limit efektivitas panjang string (biasanya 72 byte), sehingga membatasi panjang raw input password adalah praktik keamanan yang baik untuk mencegah serangan Denial-of-Service (DoS) melalui hashing string berukuran raksasa.

---

## 5. Panduan Pengujian & Verifikasi

Jalankan server aplikasi (pastikan MySQL sudah aktif):
```bash
bun run dev
```

### Skenario 1: Uji Input Nama Melebihi Batas (300 Karakter)
Kirim request dengan nama sepanjang 300 karakter:

```bash
# Menggunakan Bun / cURL / Postman
bun -e "fetch('http://localhost:3000/api/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'A'.repeat(300),
    email: 'test_panjang@example.com',
    password: 'password123'
  })
}).then(async r => {
  console.log('Status:', r.status);
  console.log('Body:', await r.text());
})"
```
- **Ekspektasi Output**:
  - Status HTTP: **422** (Unprocessable Entity) atau **400** (Bad Request) dari validator Elysia.
  - **TIDAK BOLEH** menghasilkan status HTTP `500`.

---

### Skenario 2: Uji Nilai Batas Maksimum (255 Karakter)
Kirim request dengan nama tepat 255 karakter:

```bash
bun -e "fetch('http://localhost:3000/api/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'A'.repeat(255),
    email: 'user_tepat255@example.com',
    password: 'password123'
  })
}).then(async r => {
  console.log('Status:', r.status);
  console.log('Body:', await r.text());
})"
```
- **Ekspektasi Output**:
  - Status HTTP: **200 OK**
  - Body: `{"data": "Ok"}`

---

### Skenario 3: Uji Nilai Batas Melebihi Sedikit (256 Karakter)
Kirim request dengan nama tepat 256 karakter:

```bash
bun -e "fetch('http://localhost:3000/api/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'A'.repeat(256),
    email: 'user_256@example.com',
    password: 'password123'
  })
}).then(async r => {
  console.log('Status:', r.status);
  console.log('Body:', await r.text());
})"
```
- **Ekspektasi Output**:
  - Status HTTP: **422** atau **400** (Ditolak oleh validator).
  - Tidak boleh masuk ke database dan tidak menghasilkan error 500.

---

### Skenario 4: Uji Registrasi Normal (Regresi)
Pastikan registrasi user biasa tetap berjalan normal seperti sedia kala:

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Budi Santoso", "email": "budi@example.com", "password": "password123"}'
```
- **Ekspektasi Output**:
  - Status HTTP: **200 OK**
  - Body: `{"data": "Ok"}`

---

## 6. Checklist Kriteria Penyelesaian (Definition of Done)

- [x] Batasan `maxLength: 255` diterapkan pada field `name` di skema `POST /api/users` (`src/routes/users-route.ts`).
- [x] Batasan `maxLength: 255` diterapkan pada field `email` dan `password` untuk konsistensi skema.
- [x] Request registrasi dengan nama > 255 karakter ditolak oleh Elysia (HTTP 422/400) dan tidak pernah menghasilkan HTTP 500.
- [x] Request registrasi dengan nama <= 255 karakter berhasil disimpan ke database (HTTP 200).
- [x] Tidak ada regresi pada endpoint yang sudah ada (`POST /api/users/login`, `GET /api/users/current`, dll).
