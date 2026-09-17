# ElysiaJS + Bun + Drizzle + MySQL Project

## Setup Instructions

1. Install dependencies:
   ```bash
   bun install
   ```

2. Setup Environment Variables:
   Copy `.env.example` to `.env` and fill in your MySQL database credentials:
   ```bash
   cp .env.example .env
   ```

3. Generate and Push Database Schema:
   Ensure your MySQL server is running and the database specified in `.env` exists.
   ```bash
   bun run db:generate
   bun run db:migrate
   ```

4. Start Development Server:
   ```bash
   bun run dev
   ```

The server will start on `http://localhost:3000` (or the port specified in `.env`). You can test it by visiting `http://localhost:3000/health`.
