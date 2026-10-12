# Task Plan: Implementasi API Logout User (Menghapus Sesi Login)

Dokumen ini berisi panduan implementasi langkah demi langkah (*step-by-step*) yang ditujukan untuk **junior programmer** atau **AI model** pelaksana. Ikuti setiap tahapan secara berurutan.

---

## 1. Spesifikasi Fitur

### A. Endpoint Logout User
- **Method**: `DELETE`
- **URL**: `/api/users/logout`
- **Request Headers**:
  - `Authorization: Bearer <token>`
  *(Catatan: Token adalah string UUID sesi login yang tersimpan di tabel `sessions`).*

### B. Aturan Bisnis
- Jika token valid dan ditemukan di database tabel `sessions`, data session tersebut **harus dihapus** dari tabel `sessions`.
- Jika header tidak ada, format salah, atau token tidak ditemukan di tabel `sessions`, kembalikan error **Unauthorized** (HTTP 401).

### C. Response Body

- **Response (Sukses - HTTP 200)**:
  ```json
  {
    "data": "OK"
  }
  ```

- **Response (Gagal / Token Tidak Valid / Unauthorized - HTTP 401)**:
  ```json
  {
    "error": "Unauthorized"
  }
  ```

---

## 2. Struktur Direktori & Konvensi File

Gunakan struktur folder dan konvensi penamaan yang sudah ada di proyek:
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
> - `routes/users-route.ts`: Bertanggung jawab mengekstrak header `Authorization`, memvalidasi format `Bearer <token>`, memanggil service logout, serta mengatur status code (200 / 401) dan response JSON.
> - `services/users-service.ts`: Bertanggung jawab memeriksa keberadaan token di tabel `sessions` dan menjalankan query delete untuk menghapus session tersebut.

---

## 3. Alur Kerja Logika Bisnis (Logout Flow)

```text
[Client Request DELETE /api/users/logout]
                     │
                     ▼
  [Header 'authorization' ada dan berawalan 'Bearer '?]
          ├── Tidak ──► Return HTTP 401: {"error": "Unauthorized"}
          └── Ya
                     │
                     ▼
            [Ambil token UUID]
                     │
                     ▼
   [Cari session di tabel 'sessions' berdasarkan token]
          ├── Tidak ditemukan ──► Return HTTP 401: {"error": "Unauthorized"}
          └── Ditemukan
                     │
                     ▼
     [Hapus data session dari tabel 'sessions']
                     │
                     ▼
     [Return HTTP 200: {"data": "OK"}]
```

---

## 4. Tahapan Implementasi Langkah-demi-Langkah

### Tahap 1: Tambahkan Service `logoutUser` di `src/services/users-service.ts`
1. Buka file `src/services/users-service.ts`.
2. Buat dan export fungsi `logoutUser(token: string)`:
   - **Langkah 1.1**: Periksa apakah token ada di database:
     ```typescript
     const [session] = await db.select().from(sessions).where(eq(sessions.token, token));
     if (!session) {
       throw new Error("unauthorized");
     }
     ```
   - **Langkah 1.2**: Hapus baris session tersebut dari tabel `sessions`:
     ```typescript
     await db.delete(sessions).where(eq(sessions.token, token));
     return true;
     ```

---

### Tahap 2: Tambahkan Endpoint `DELETE /logout` di `src/routes/users-route.ts`
1. Buka file `src/routes/users-route.ts`.
2. Import fungsi `logoutUser` dari `../services/users-service`.
3. Tambahkan handler route `.delete('/logout', ...)` pada instance `usersRoute`:
   ```typescript
   .delete('/logout', async ({ headers, set }) => {
     try {
       const authHeader = headers['authorization'];
       if (!authHeader || !authHeader.startsWith('Bearer ')) {
         set.status = 401;
         return { error: "Unauthorized" };
       }

       const token = authHeader.substring(7).trim();
       if (!token) {
         set.status = 401;
         return { error: "Unauthorized" };
       }

       await logoutUser(token);
       set.status = 200;
       return { data: "OK" };
     } catch (error: any) {
       if (error.message === "unauthorized") {
         set.status = 401;
         return { error: "Unauthorized" };
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

#### 1. Login untuk Mendapatkan Token Sesi Baru:
```bash
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email": "eko@localhost", "password": "rahasia"}'
```
*Salin nilai token yang didapatkan, misalnya: `"TOKEN_SAMPLE_UUID"`.*

#### 2. Uji Logout Berhasil (Token Valid):
```bash
curl -X DELETE http://localhost:3000/api/users/logout \
  -H "Authorization: Bearer <TOKEN_SAMPLE_UUID>"
```
- **Ekspektasi Output (HTTP 200)**:
  ```json
  {
    "data": "OK"
  }
  ```

#### 3. Verifikasi Token Telah Terhapus (Token Sudah Hangus):
Gunakan token yang baru saja di-logout untuk memanggil endpoint current user:
```bash
curl -X GET http://localhost:3000/api/users/current \
  -H "Authorization: Bearer <TOKEN_SAMPLE_UUID>"
```
- **Ekspektasi Output (HTTP 401)**:
  ```json
  {
    "error": "unauthorized"
  }
  ```

Coba juga panggil logout sekali lagi dengan token yang sama:
```bash
curl -X DELETE http://localhost:3000/api/users/logout \
  -H "Authorization: Bearer <TOKEN_SAMPLE_UUID>"
```
- **Ekspektasi Output (HTTP 401)**:
  ```json
  {
    "error": "Unauthorized"
  }
  ```

#### 4. Uji Gagal - Tanpa Header Authorization:
```bash
curl -X DELETE http://localhost:3000/api/users/logout
```
- **Ekspektasi Output (HTTP 401)**:
  ```json
  {
    "error": "Unauthorized"
  }
  ```

---

## 5. Checklist Kriteria Penyelesaian (Definition of Done)

- [ ] Fungsi `logoutUser(token)` tersedia dan diekspor di `src/services/users-service.ts`.
- [ ] Endpoint `DELETE /api/users/logout` tersedia di `src/routes/users-route.ts`.
- [ ] Validasi parsing header `Authorization: Bearer <token>` berjalan dengan benar.
- [ ] Request logout tanpa header mengembalikan status HTTP 401 dengan `{ "error": "Unauthorized" }`.
- [ ] Request logout dengan token yang tidak ada / salah mengembalikan status HTTP 401 dengan `{ "error": "Unauthorized" }`.
- [ ] Request logout dengan token valid berhasil menghapus baris session dari tabel `sessions` dan mengembalikan HTTP 200 `{ "data": "OK" }`.
- [ ] Setelah logout, token yang sama tidak dapat lagi digunakan untuk mengakses endpoint yang dilindungi (seperti `GET /api/users/current`).
