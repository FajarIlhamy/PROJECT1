import { beforeEach, describe, expect, it } from "bun:test";
import { app } from "../src";
import { db } from "../src/db";
import { users, sessions } from "../src/db/schema";
import { eq } from "drizzle-orm";
import { clearDatabase } from "./test-helper";

describe("Users API", () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  describe("POST /api/users (Registrasi User)", () => {
    // 1. Skenario Positif
    it("Skenario 1.1: Berhasil registrasi user baru dengan data valid", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "John Doe",
            email: "john@example.com",
            password: "password123",
          }),
        })
      );

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json).toEqual({ data: "Ok" });

      // Verifikasi di database
      const [savedUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, "john@example.com"));

      expect(savedUser).toBeDefined();
      expect(savedUser.name).toBe("John Doe");
      expect(savedUser.email).toBe("john@example.com");
      expect(savedUser.password).not.toBe("password123");
      expect(savedUser.password.startsWith("$2")).toBeTrue();
    });

    it("Skenario 1.2: Berhasil registrasi dengan panjang nama tepat 255 karakter", async () => {
      const longName = "A".repeat(255);
      const response = await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: longName,
            email: "exact255@example.com",
            password: "password123",
          }),
        })
      );

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json).toEqual({ data: "Ok" });

      const [savedUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, "exact255@example.com"));
      expect(savedUser).toBeDefined();
      expect(savedUser.name).toBe(longName);
    });

    // 2. Skenario Negatif (Validasi Input)
    it("Skenario 2.1: Gagal jika name kosong", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "",
            email: "test@example.com",
            password: "password123",
          }),
        })
      );

      expect(response.status).toBe(422);
    });

    it("Skenario 2.2: Gagal jika name melebihi 255 karakter", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "A".repeat(256),
            email: "test256@example.com",
            password: "password123",
          }),
        })
      );

      expect(response.status).toBe(422);
    });

    it("Skenario 2.3: Gagal jika format email tidak valid", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Test User",
            email: "bukan-format-email",
            password: "password123",
          }),
        })
      );

      expect(response.status).toBe(422);
    });

    it("Skenario 2.4: Gagal jika email melebihi 255 karakter", async () => {
      const longEmail = "a".repeat(250) + "@b.com";
      const response = await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Test User",
            email: longEmail,
            password: "password123",
          }),
        })
      );

      expect(response.status).toBe(422);
    });

    it("Skenario 2.5: Gagal jika password kosong", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Test User",
            email: "test@example.com",
            password: "",
          }),
        })
      );

      expect(response.status).toBe(422);
    });

    it("Skenario 2.6: Gagal jika password melebihi 255 karakter", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Test User",
            email: "test@example.com",
            password: "P".repeat(256),
          }),
        })
      );

      expect(response.status).toBe(422);
    });

    it("Skenario 2.7: Gagal jika request body kosong atau field wajib tidak lengkap", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        })
      );

      expect(response.status).toBe(422);
    });

    // 3. Skenario Negatif (Aturan Bisnis)
    it("Skenario 3.1: Gagal jika email sudah terdaftar sebelumnya", async () => {
      // Daftarkan user pertama
      await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "First User",
            email: "duplicate@example.com",
            password: "password123",
          }),
        })
      );

      // Daftarkan user kedua dengan email yang sama
      const duplicateResponse = await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Second User",
            email: "duplicate@example.com",
            password: "password456",
          }),
        })
      );

      expect(duplicateResponse.status).toBe(400);
      const json = await duplicateResponse.json();
      expect(json).toEqual({ error: "email sudah terdaftar" });
    });
  });

  describe("POST /api/users/login (Login User)", () => {
    // 1. Skenario Positif
    it("Skenario 1.1: Berhasil login dengan email dan password yang benar", async () => {
      // Registrasi user terlebih dahulu
      await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Login User",
            email: "login@example.com",
            password: "correctpassword",
          }),
        })
      );

      // Request login
      const response = await app.handle(
        new Request("http://localhost/api/users/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "login@example.com",
            password: "correctpassword",
          }),
        })
      );

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.data).toBeDefined();
      expect(typeof json.data).toBe("string");

      // Verifikasi token UUID tersimpan di tabel sessions
      const [savedSession] = await db
        .select()
        .from(sessions)
        .where(eq(sessions.token, json.data));

      expect(savedSession).toBeDefined();
      expect(savedSession.token).toBe(json.data);
    });

    // 2. Skenario Negatif (Validasi Input)
    it("Skenario 2.1: Gagal jika format email login tidak valid", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/users/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "bukan-email",
            password: "password123",
          }),
        })
      );

      expect(response.status).toBe(422);
    });

    it("Skenario 2.2: Gagal jika password login kosong", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/users/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "user@example.com",
            password: "",
          }),
        })
      );

      expect(response.status).toBe(422);
    });

    it("Skenario 2.3: Gagal jika request body kosong atau properti kurang", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/users/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "user@example.com" }),
        })
      );

      expect(response.status).toBe(422);
    });

    // 3. Skenario Negatif (Aturan Bisnis / Autentikasi)
    it("Skenario 3.1: Gagal login jika email belum terdaftar", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/users/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "notfound@example.com",
            password: "password123",
          }),
        })
      );

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json).toEqual({ error: "email atau password salah" });
    });

    it("Skenario 3.2: Gagal login jika password salah", async () => {
      await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Wrong Pwd User",
            email: "wrongpwd@example.com",
            password: "correctpassword",
          }),
        })
      );

      const response = await app.handle(
        new Request("http://localhost/api/users/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "wrongpwd@example.com",
            password: "incorrectpassword",
          }),
        })
      );

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json).toEqual({ error: "email atau password salah" });
    });
  });

  describe("GET /api/users/current (Get Current User)", () => {
    // 1. Skenario Positif & Keamanan
    it("Skenario 1.1 & 1.2: Berhasil mengambil profil user yang valid dan password TIDAK bocor", async () => {
      // Registrasi user
      await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Current User",
            email: "current@example.com",
            password: "secretpassword",
          }),
        })
      );

      // Login untuk mendapatkan token
      const loginResponse = await app.handle(
        new Request("http://localhost/api/users/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "current@example.com",
            password: "secretpassword",
          }),
        })
      );
      const { data: token } = await loginResponse.json();

      // Request get current user
      const response = await app.handle(
        new Request("http://localhost/api/users/current", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
      );

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.data).toBeDefined();
      expect(json.data.name).toBe("Current User");
      expect(json.data.email).toBe("current@example.com");
      expect(json.data.id).toBeDefined();
      expect(json.data.created_at).toBeDefined();

      // Verifikasi Keamanan: field password TIDAK boleh ada
      expect(json.data.password).toBeUndefined();
    });

    // 2. Skenario Negatif (Header & Autentikasi)
    it("Skenario 2.1: Gagal jika header Authorization tidak ada", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/users/current", {
          method: "GET",
        })
      );

      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json).toEqual({ error: "unauthorized" });
    });

    it("Skenario 2.2: Gagal jika skema header bukan Bearer", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/users/current", {
          method: "GET",
          headers: {
            Authorization: "Basic some-token",
          },
        })
      );

      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json).toEqual({ error: "unauthorized" });
    });

    it("Skenario 2.3: Gagal jika token kosong setelah 'Bearer '", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/users/current", {
          method: "GET",
          headers: {
            Authorization: "Bearer   ",
          },
        })
      );

      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json).toEqual({ error: "unauthorized" });
    });

    it("Skenario 2.4: Gagal jika token tidak terdaftar di database sessions", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/users/current", {
          method: "GET",
          headers: {
            Authorization: "Bearer 00000000-0000-0000-0000-000000000000",
          },
        })
      );

      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json).toEqual({ error: "unauthorized" });
    });

    it("Skenario 2.5: Gagal jika session ada tetapi user tidak ditemukan di database users", async () => {
      const orphanToken = "orphan-session-token-123";
      // Buat session tanpa user yang valid
      await db.insert(sessions).values({
        token: orphanToken,
        userId: 999999,
        password: "hashedpassword",
      });

      const response = await app.handle(
        new Request("http://localhost/api/users/current", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${orphanToken}`,
          },
        })
      );

      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json).toEqual({ error: "unauthorized" });
    });
  });
});
