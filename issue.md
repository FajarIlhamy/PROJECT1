# Task Plan: Implementasi Fitur Registrasi User Baru (API & Database)

Dokumen ini berisi panduan implementasi langkah demi langkah (*step-by-step*) yang ditujukan untuk **junior programmer** atau **AI model** pelaksana. Ikuti setiap tahapan secara berurutan.

---

## 1. Spesifikasi Fitur

### A. Tabel Database (`users`)
Lokasi file: `src/db/schema.ts`
Struktur kolom yang dibutuhkan:
- `id`: Integer, Primary Key, Auto Increment (`serial`)
- `name`: Varchar(255), Not Null
- `email`: Varchar(255), Not Null, Unique
- `password`: Varchar(255), Not Null (Menyimpan hasil hash bcrypt)
- `created_at`: Timestamp, default `current_timestamp` (`defaultNow()`)

### B. Endpoint Registrasi User
- **Method**: `POST`
- **URL**: `/api/users`
- **Request Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  { 
    "name": "Eko",
    "email": "eko@localhost",
    "password": "rahasia"
  }
  ```
- **Response (Sukses - HTTP 200 atau 201)**:
  ```json
  {
    "data": "Ok"
  }
  ```
- **Response (Gagal / Email Duplikat - HTTP 400)**:
  ```json
  {
    "error": "email sudah terdaftar"
  }
  ```

---

## 2. Struktur Direktori & Konvensi File

Ikuti struktur folder dan konvensi penamaan berikut:
```text
src/
├── db/
│   ├── index.ts          # Koneksi Drizzle ke database
│   └── schema.ts         # Definisi skema tabel (users)
├── routes/
│   └── users-route.ts    # Routing ElysiaJS (format: *-route.ts)
├── services/
│   └── users-service.ts  # Logic bisnis & interaksi DB (format: *-service.ts)
└── index.ts              # Entry point server utama
```

> **Catatan Pemisahan Tanggung Jawab:**
> - `routes/users-route.ts`: Hanya menangani HTTP request, validasi input body, pemetaan status code, dan pengiriman HTTP response.
> - `services/users-service.ts`: Menangani logika bisnis, pengecekan email unik ke database, hashing password, dan penyimpanan data.

---

## 3. Catatan Khusus: Password Hashing (Bcrypt)

Karena proyek ini menggunakan **Bun**, hashing password dengan bcrypt dapat dilakukan secara native tanpa perlu menginstal dependensi tambahan:
```typescript
// Menggunakan API bawaan Bun:
const hashedPassword = await Bun.password.hash(password, {
  algorithm: "bcrypt",
  cost: 10,
});
```
*Catatan: Jika menggunakan library alternatif seperti `bcryptjs`, pastikan modul terpasang dengan `bun add bcryptjs` dan `bun add -d @types/bcryptjs`.*

---

## 4. Tahapan Implementasi Langkah-demi-Langkah

### Tahap 1: Pembaruan Skema Database (`src/db/schema.ts`)
1. Buka file `src/db/schema.ts`.
2. Perbarui tabel `users` dengan menambahkan kolom `email` (unique) dan `password`.
   ```typescript
   import { mysqlTable, serial, varchar, timestamp } from 'drizzle-orm/mysql-core';

   export const users = mysqlTable('users', {
     id: serial('id').primaryKey(),
     name: varchar('name', { length: 255 }).notNull(),
     email: varchar('email', { length: 255 }).notNull().unique(),
     password: varchar('password', { length: 255 }).notNull(),
     createdAt: timestamp('created_at').defaultNow(),
   });
   ```
3. Sinkronisasikan perubahan skema ke database dengan menjalankan perintah:
   ```bash
   bun run db:migrate
   ```

---

### Tahap 2: Buat Service Registrasi (`src/services/users-service.ts`)
1. Buat folder baru `src/services/` jika belum ada.
2. Buat file `src/services/users-service.ts`.
3. Buat fungsi registrasi user (misal: `registerUser(input)`):
   - **Langkah 2.1**: Cek apakah email sudah terdaftar di database:
     ```typescript
     import { db } from '../db';
     import { users } from '../db/schema';
     import { eq } from 'drizzle-orm';

     const existing = await db.select().from(users).where(eq(users.email, input.email));
     ```
   - **Langkah 2.2**: Jika email sudah ada (`existing.length > 0`), lempar error spesifik (misal: `throw new Error("email sudah terdaftar")`).
   - **Langkah 2.3**: Jika belum ada, hash password input menggunakan bcrypt:
     ```typescript
     const hashedPassword = await Bun.password.hash(input.password, {
       algorithm: "bcrypt",
       cost: 10,
     });
     ```
   - **Langkah 2.4**: Simpan user baru ke database:
     ```typescript
     await db.insert(users).values({
       name: input.name,
       email: input.email,
       password: hashedPassword,
     });
     ```
   - **Langkah 2.5**: Kembalikan indikator sukses.

---

### Tahap 3: Buat Route Controller (`src/routes/users-route.ts`)
1. Buat file `src/routes/users-route.ts` (menggantikan file routing lama jika ada).
2. Terapkan route Elysia dengan prefix `/api/users`:
   ```typescript
   import { Elysia, t } from 'elysia';
   import { registerUser } from '../services/users-service';

   export const usersRoute = new Elysia({ prefix: '/api/users' })
     .post('/', async ({ body, set }) => {
       try {
         await registerUser(body);
         set.status = 200; // atau 201
         return { data: "Ok" };
       } catch (error: any) {
         if (error.message === "email sudah terdaftar") {
           set.status = 400;
           return { error: "email sudah terdaftar" };
         }
         set.status = 500;
         return { error: "Internal Server Error" };
       }
     }, {
       body: t.Object({
         name: t.String({ minLength: 1 }),
         email: t.String({ format: 'email' }),
         password: t.String({ minLength: 1 }),
       })
     });
   ```

---

### Tahap 4: Daftarkan Route ke Entry Point (`src/index.ts`)
1. Buka file `src/index.ts`.
2. Import `usersRoute` dari `./routes/users-route`.
3. Pasang route ke instance Elysia menggunakan `.use(usersRoute)`.
4. Hapus import atau route lama yang tidak lagi sesuai dengan struktur baru.

---

### Tahap 5: Pengujian & Verifikasi

Jalankan server pengembangan:
```bash
bun run dev
```

Lakukan pengujian berikut (bisa menggunakan `curl`, Postman, atau ekstensi REST Client):

#### 1. Uji Registrasi Berhasil:
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Eko", "email": "eko@localhost", "password": "rahasia"}'
```
- **Ekspektasi Output**:
  ```json
  {"data": "Ok"}
  ```

#### 2. Uji Registrasi Email Duplikat (Gagal):
Kirim kembali request yang sama persis dengan email `"eko@localhost"`.
- **Ekspektasi Output (HTTP Status 400)**:
  ```json
  {"error": "email sudah terdaftar"}
  ```

#### 3. Uji Keamanan Password di Database:
Periksa data di tabel `users` MySQL:
- Pastikan kolom `password` **bukan** bertuliskan `"rahasia"`, melainkan string hash bcrypt yang diawali dengan `$2a$` atau `$2b$`.

---

## 5. Checklist Kriteria Penyelesaian (Definition of Done)

- [ ] Skema tabel `users` di `src/db/schema.ts` memiliki kolom `id`, `name`, `email` (unique), `password`, dan `created_at`.
- [ ] Migrasi database berhasil dijalankan tanpa error.
- [ ] File `src/services/users-service.ts` menangani logic pengecekan duplikasi email dan hashing password bcrypt.
- [ ] File `src/routes/users-route.ts` menangani endpoint `POST /api/users` dengan validasi request body.
- [ ] Response sukses mengembalikan `{ "data": "Ok" }`.
- [ ] Response saat email duplikat mengembalikan HTTP 400 dengan `{ "error": "email sudah terdaftar" }`.
- [ ] Route terhubung ke server utama di `src/index.ts` dan server berjalan normal.
