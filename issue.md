# Task Plan: Implementasi Fitur Login User & Tabel Sessions (API & Database)

Dokumen ini berisi panduan implementasi langkah demi langkah (*step-by-step*) yang ditujukan untuk **junior programmer** atau **AI model** pelaksana. Ikuti setiap tahapan secara berurutan.

---

## 1. Spesifikasi Fitur

### A. Tabel Database (`sessions`)
Lokasi file: `src/db/schema.ts`
Struktur kolom yang dibutuhkan:
- `id`: Integer, Primary Key, Auto Increment (`serial`)
- `token`: Varchar(255), Not Null (Menyimpan string UUID sebagai token sesi login)
- `user_id`: Integer, Foreign Key ke tabel `users.id`
- `password`: Varchar(255), Not Null (Menyimpan hash bcrypt password user)
- `created_at`: Timestamp, default `current_timestamp` (`defaultNow()`)

### B. Endpoint Login User
- **Method**: `POST`
- **URL**: `/api/users/login`
- **Request Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  { 
    "email": "eko@localhost",
    "password": "rahasia"
  }
  ```
- **Response (Sukses - HTTP 200)**:
  ```json
  {
    "data": "123e4567-e89b-12d3-a456-426614174000"
  }
  ```
  *(Nilai `data` adalah token UUID yang dihasilkan)*

- **Response (Gagal - HTTP 400)**:
  ```json
  {
    "error": "email atau password salah"
  }
  ```
  *(Catatan keamanan: Gunakan pesan error yang sama baik ketika email tidak ditemukan maupun ketika password salah).*

---

## 2. Struktur Direktori & Konvensi File

Gunakan struktur folder dan konvensi penamaan yang sudah ada:
```text
src/
├── db/
│   ├── index.ts          # Koneksi Drizzle ke database
│   └── schema.ts         # Definisi skema tabel (users & sessions)
├── routes/
│   └── users-route.ts    # Routing ElysiaJS (format: *-route.ts)
├── services/
│   └── users-service.ts  # Logic bisnis & interaksi DB (format: *-service.ts)
└── index.ts              # Entry point server utama
```

> **Aturan Pemisahan Tanggung Jawab:**
> - `routes/users-route.ts`: Bertanggung jawab atas HTTP routing, validasi input body, penentuan HTTP status code, dan pengembalian response JSON.
> - `services/users-service.ts`: Bertanggung jawab atas query ke database, verifikasi password bcrypt, pembuatan UUID, dan penyimpanan session.

---

## 3. Catatan Khusus: UUID & Verifikasi Password di Bun

1. **Pembuatan Token UUID**:
   Gunakan fungsi standar bawaan runtime:
   ```typescript
   const token = crypto.randomUUID();
   ```
2. **Verifikasi Hash Bcrypt**:
   Gunakan API bawaan Bun untuk memverifikasi password plain text terhadap hash yang tersimpan:
   ```typescript
   const isMatch = await Bun.password.verify(inputPassword, userHashedPassword, "bcrypt");
   ```

---

## 4. Tahapan Implementasi Langkah-demi-Langkah

### Tahap 1: Pembaruan Skema Database (`src/db/schema.ts`)
1. Buka file `src/db/schema.ts`.
2. Import fungsi kolom Drizzle yang diperlukan (`int`, dsb).
3. Tambahkan definisi tabel `sessions`:
   ```typescript
   import { mysqlTable, serial, varchar, timestamp, int } from 'drizzle-orm/mysql-core';

   export const users = mysqlTable('users', {
     id: serial('id').primaryKey(),
     name: varchar('name', { length: 255 }).notNull(),
     email: varchar('email', { length: 255 }).notNull().unique(),
     password: varchar('password', { length: 255 }).notNull(),
     createdAt: timestamp('created_at').defaultNow(),
   });

   export const sessions = mysqlTable('sessions', {
     id: serial('id').primaryKey(),
     token: varchar('token', { length: 255 }).notNull(),
     userId: int('user_id').notNull().references(() => users.id),
     password: varchar('password', { length: 255 }).notNull(),
     createdAt: timestamp('created_at').defaultNow(),
   });
   ```
4. Buat file migrasi database baru:
   ```bash
   bun run db:generate
   ```

---

### Tahap 2: Tambahkan Service Login (`src/services/users-service.ts`)
1. Buka file `src/services/users-service.ts`.
2. Import tabel `sessions` dari `../db/schema`.
3. Buat dan export fungsi `loginUser(input)`:
   - **Langkah 2.1**: Cari data user berdasarkan `input.email`:
     ```typescript
     const [user] = await db.select().from(users).where(eq(users.email, input.email));
     if (!user) {
       throw new Error("email atau password salah");
     }
     ```
   - **Langkah 2.2**: Verifikasi kecocokan password:
     ```typescript
     const isMatch = await Bun.password.verify(input.password, user.password, "bcrypt");
     if (!isMatch) {
       throw new Error("email atau password salah");
     }
     ```
   - **Langkah 2.3**: Buat token UUID baru:
     ```typescript
     const token = crypto.randomUUID();
     ```
   - **Langkah 2.4**: Simpan data sesi baru ke tabel `sessions`:
     ```typescript
     await db.insert(sessions).values({
       token: token,
       userId: user.id,
       password: user.password,
     });
     ```
   - **Langkah 2.5**: Kembalikan string token:
     ```typescript
     return token;
     ```

---

### Tahap 3: Tambahkan Route Endpoint Login (`src/routes/users-route.ts`)
1. Buka file `src/routes/users-route.ts`.
2. Import fungsi `loginUser` dari `../services/users-service`.
3. Tambahkan handler route `POST /login` pada instance `usersRoute`:
   ```typescript
   .post('/login', async ({ body, set }) => {
     try {
       const token = await loginUser(body);
       set.status = 200;
       return { data: token };
     } catch (error: any) {
       if (error.message === "email atau password salah") {
         set.status = 400;
         return { error: "email atau password salah" };
       }
       set.status = 500;
       return { error: "Internal Server Error" };
     }
   }, {
     body: t.Object({
       email: t.String({ format: 'email' }),
       password: t.String({ minLength: 1 }),
     })
   })
   ```

---

### Tahap 4: Pengujian & Verifikasi

Jalankan server aplikasi:
```bash
bun run dev
```

Lakukan skenario pengujian berikut:

#### 1. Uji Registrasi User Terlebih Dahulu (Jika belum ada):
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Eko", "email": "eko@localhost", "password": "rahasia"}'
```

#### 2. Uji Login Berhasil (Valid Credentials):
```bash
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email": "eko@localhost", "password": "rahasia"}'
```
- **Ekspektasi Output (HTTP 200)**:
  ```json
  {"data": "<UUID-TOKEN-STRING>"}
  ```

#### 3. Uji Login Gagal - Password Salah:
```bash
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email": "eko@localhost", "password": "salah"}'
```
- **Ekspektasi Output (HTTP 400)**:
  ```json
  {"error": "email atau password salah"}
  ```

#### 4. Uji Login Gagal - Email Tidak Terdaftar:
```bash
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email": "tidakada@localhost", "password": "rahasia"}'
```
- **Ekspektasi Output (HTTP 400)**:
  ```json
  {"error": "email atau password salah"}
  ```

#### 5. Uji Database Sessions:
Periksa data di tabel `sessions` MySQL:
- Pastikan ada baris baru dengan kolom `token` berisi UUID yang sesuai, `user_id` merujuk ke id user Eko, dan kolom `password` terisi.

---

## 5. Checklist Kriteria Penyelesaian (Definition of Done)

- [ ] Skema tabel `sessions` ditambahkan di `src/db/schema.ts` dengan kolom `id`, `token`, `user_id`, `password`, dan `created_at`.
- [ ] File migrasi berhasil digenerate menggunakan `bun run db:generate`.
- [ ] Fungsi `loginUser` di `src/services/users-service.ts` memverifikasi password dengan `Bun.password.verify` dan menghasilkan UUID token dengan `crypto.randomUUID()`.
- [ ] Endpoint `POST /api/users/login` tersedia di `src/routes/users-route.ts` dengan validasi request body.
- [ ] Response sukses mengembalikan status HTTP 200 dengan format `{ "data": "<token>" }`.
- [ ] Response gagal (email/password salah) mengembalikan status HTTP 400 dengan format `{ "error": "email atau password salah" }`.
- [ ] Data sesi tersimpan di tabel `sessions` saat login berhasil.
