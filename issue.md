# Task Plan: Implementasi API Get Current User (User yang Sedang Login)

Dokumen ini berisi panduan implementasi langkah demi langkah (*step-by-step*) yang ditujukan untuk **junior programmer** atau **AI model** pelaksana. Ikuti setiap tahapan secara berurutan.

---

## 1. Spesifikasi Fitur

### A. Endpoint Get Current User
- **Method**: `GET`
- **URL**: `/api/users/current`
- **Request Headers**:
  - `Authorization: Bearer <token>`
  *(Catatan: Token adalah token UUID sesi login yang tersimpan di tabel `sessions`).*

### B. Response Body

- **Response (Sukses - HTTP 200)**:
  ```json
  {
    "data": {
      "id": 1,
      "name": "Eko",
      "email": "eko@localhost",
      "created_at": "2026-10-05T12:00:00.000Z"
    }
  }
  ```
  *(PENTING: Jangan sertakan field `password` dalam response demi alasan keamanan).*

- **Response (Gagal / Token Tidak Valid / Tidak Ada Header - HTTP 401)**:
  ```json
  {
    "error": "unauthorized"
  }
  ```

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
> - `routes/users-route.ts`: Bertanggung jawab membaca header `Authorization`, memvalidasi format token `Bearer <token>`, memanggil service, menentukan HTTP status code (200 / 401), dan mengembalikan response JSON.
> - `services/users-service.ts`: Bertanggung jawab mencari session berdasarkan token di tabel `sessions`, mengambil data user dari tabel `users`, dan memfilter data (menghapus password).

---

## 3. Alur Kerja Logika Bisnis (Authentication Flow)

```text
[Client Request GET /api/users/current]
                  │
                  ▼
  [Header 'authorization' ada dan berawalan 'Bearer '?]
          ├── Tidak ──► Return HTTP 401: {"error": "unauthorized"}
          └── Ya
                  │
                  ▼
         [Ambil token UUID]
                  │
                  ▼
   [Cari session di tabel 'sessions' berdasarkan token]
          ├── Tidak ditemukan ──► Return HTTP 401: {"error": "unauthorized"}
          └── Ditemukan
                  │
                  ▼
   [Cari user di tabel 'users' berdasarkan session.userId]
          ├── Tidak ditemukan ──► Return HTTP 401: {"error": "unauthorized"}
          └── Ditemukan
                  │
                  ▼
   [Return HTTP 200: { data: { id, name, email, created_at } }]
```

---

## 4. Tahapan Implementasi Langkah-demi-Langkah

### Tahap 1: Tambahkan Service `getCurrentUser` di `src/services/users-service.ts`
1. Buka file `src/services/users-service.ts`.
2. Buat dan export fungsi `getCurrentUser(token: string)`:
   - **Langkah 1.1**: Cari session di database berdasarkan `token`:
     ```typescript
     const [session] = await db.select().from(sessions).where(eq(sessions.token, token));
     if (!session) {
       throw new Error("unauthorized");
     }
     ```
   - **Langkah 1.2**: Cari user berdasarkan `session.userId`:
     ```typescript
     const [user] = await db.select().from(users).where(eq(users.id, session.userId));
     if (!user) {
       throw new Error("unauthorized");
     }
     ```
   - **Langkah 1.3**: Kembalikan data user tanpa menyertakan password:
     ```typescript
     return {
       id: user.id,
       name: user.name,
       email: user.email,
       created_at: user.createdAt,
     };
     ```

---

### Tahap 2: Tambahkan Endpoint `GET /current` di `src/routes/users-route.ts`
1. Buka file `src/routes/users-route.ts`.
2. Import fungsi `getCurrentUser` dari `../services/users-service`.
3. Tambahkan handler route `.get('/current', ...)` pada instance `usersRoute`:
   ```typescript
   .get('/current', async ({ headers, set }) => {
     try {
       const authHeader = headers['authorization'];
       if (!authHeader || !authHeader.startsWith('Bearer ')) {
         set.status = 401;
         return { error: "unauthorized" };
       }

       const token = authHeader.substring(7).trim();
       if (!token) {
         set.status = 401;
         return { error: "unauthorized" };
       }

       const user = await getCurrentUser(token);
       set.status = 200;
       return { data: user };
     } catch (error: any) {
       if (error.message === "unauthorized") {
         set.status = 401;
         return { error: "unauthorized" };
       }
       set.status = 500;
       return { error: "Internal Server Error" };
     }
   })
   ```

---

### Tahap 3: Pengujian & Verifikasi

Jalankan server aplikasi:
```bash
bun run dev
```

Lakukan skenario pengujian berikut secara berurutan:

#### 1. Registrasi & Login untuk Mendapatkan Token:
```bash
# Registrasi user (jika belum ada)
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Eko", "email": "eko@localhost", "password": "rahasia"}'

# Login user untuk mendapatkan token
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email": "eko@localhost", "password": "rahasia"}'
```
*Salin nilai token yang didapatkan dari response login, misalnya: `"9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"`.*

#### 2. Uji Get Current User Berhasil (Token Valid):
```bash
curl -X GET http://localhost:3000/api/users/current \
  -H "Authorization: Bearer <GANTI_DENGAN_TOKEN_LOGIN>"
```
- **Ekspektasi Output (HTTP 200)**:
  ```json
  {
    "data": {
      "id": 1,
      "name": "Eko",
      "email": "eko@localhost",
      "created_at": "..."
    }
  }
  ```
- **Verifikasi Keamanan**: Pastikan properti `password` **tidak ada** dalam output JSON.

#### 3. Uji Gagal - Tanpa Header Authorization:
```bash
curl -X GET http://localhost:3000/api/users/current
```
- **Ekspektasi Output (HTTP 401)**:
  ```json
  {"error": "unauthorized"}
  ```

#### 4. Uji Gagal - Token Palsu / Tidak Terdaftar:
```bash
curl -X GET http://localhost:3000/api/users/current \
  -H "Authorization: Bearer token-asal-palsu"
```
- **Ekspektasi Output (HTTP 401)**:
  ```json
  {"error": "unauthorized"}
  ```

---

## 5. Checklist Kriteria Penyelesaian (Definition of Done)

- [ ] Fungsi `getCurrentUser(token)` tersedia di `src/services/users-service.ts`.
- [ ] Endpoint `GET /api/users/current` tersedia di `src/routes/users-route.ts`.
- [ ] Parsing header `Authorization: Bearer <token>` berjalan dengan benar.
- [ ] Request tanpa header authorization mengembalikan HTTP 401 dengan `{ "error": "unauthorized" }`.
- [ ] Request dengan token yang tidak ada di tabel `sessions` mengembalikan HTTP 401 dengan `{ "error": "unauthorized" }`.
- [ ] Request dengan token valid mengembalikan data user (id, name, email, created_at) dengan HTTP 200.
- [ ] Field password **tidak bocor** pada response `data`.
