import { Elysia, t } from 'elysia';
import { registerUser, loginUser, getCurrentUser } from '../services/users-service';

export const usersRoute = new Elysia({ prefix: '/api/users' })
  .post('/', async ({ body, set }) => {
    try {
      await registerUser(body);
      set.status = 200;
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
  })
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
  });
