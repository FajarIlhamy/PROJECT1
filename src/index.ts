import { Elysia } from "elysia";
import { usersRoutes } from "./routes/users";

const app = new Elysia()
  .get("/", () => "Hello World")
  .get("/health", () => {
    return { status: "ok" };
  })
  .use(usersRoutes)
  .listen(process.env.PORT || 3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
