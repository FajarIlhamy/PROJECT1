import { db } from '../db';
import { users } from '../db/schema';
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
