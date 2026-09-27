import { db } from '../db';
import { users, sessions } from '../db/schema';
import { eq } from 'drizzle-orm';

export async function registerUser(input: any) {
  // Cek apakah email sudah terdaftar
  const existing = await db.select().from(users).where(eq(users.email, input.email));
  if (existing.length > 0) {
    throw new Error("email sudah terdaftar");
  }

  // Hash password menggunakan Bun bawaan
  const hashedPassword = await Bun.password.hash(input.password, {
    algorithm: "bcrypt",
    cost: 10,
  });

  // Simpan user baru ke database
  await db.insert(users).values({
    name: input.name,
    email: input.email,
    password: hashedPassword,
  });

  return true;
}

export async function loginUser(input: any) {
  // Cari user berdasarkan email
  const [user] = await db.select().from(users).where(eq(users.email, input.email));
  if (!user) {
    throw new Error("email atau password salah");
  }

  // Verifikasi kecocokan password
  const isMatch = await Bun.password.verify(input.password, user.password, "bcrypt");
  if (!isMatch) {
    throw new Error("email atau password salah");
  }

  // Buat UUID token
  const token = crypto.randomUUID();

  // Simpan session ke database
  await db.insert(sessions).values({
    token: token,
    userId: user.id,
    password: user.password,
  });

  return token;
}
