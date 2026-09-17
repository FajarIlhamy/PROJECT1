import { Elysia, t } from 'elysia';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

export const usersRoutes = new Elysia({ prefix: '/users' })
  // Get all users
  .get('/', async () => {
    const allUsers = await db.select().from(users);
    return { data: allUsers };
  })
  // Get user by ID
  .get('/:id', async ({ params: { id }, error }) => {
    const user = await db.select().from(users).where(eq(users.id, Number(id)));
    if (!user.length) return error(404, { message: "User not found" });
    return { data: user[0] };
  }, {
    params: t.Object({ id: t.String() })
  })
  // Create a new user
  .post('/', async ({ body }) => {
    const [result] = await db.insert(users).values(body);
    return { message: "User created", insertId: result.insertId };
  }, {
    body: t.Object({
      name: t.String({ minLength: 1 })
    })
  })
  // Update a user
  .put('/:id', async ({ params: { id }, body }) => {
    await db.update(users)
      .set({ name: body.name })
      .where(eq(users.id, Number(id)));
    
    return { message: "User updated", id: Number(id) };
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({
      name: t.String({ minLength: 1 })
    })
  })
  // Delete a user
  .delete('/:id', async ({ params: { id } }) => {
    await db.delete(users).where(eq(users.id, Number(id)));
    return { message: "User deleted", id: Number(id) };
  }, {
    params: t.Object({ id: t.String() })
  });
