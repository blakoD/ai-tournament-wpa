# Tournament Builder App
Can be used to create and manage tournaments, with support for single elimination, double elimination, and round robin formats. Built with Vite + React on the frontend, Fastify + Prisma on the backend, and deployed on Fly.io.

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Install API dependencies:
   `npm --prefix server install`
3. Set Supabase auth env vars in `.env.local`:
   `VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co`
   `VITE_SUPABASE_ANON_KEY=<your-anon-key>`
4. Run frontend + API in dev using local DB:
   `npm run dev:local`

The API local DB settings are loaded from `server/.env.local` by the `dev:local` script.

Authentication routes:

- `/#/signin`
- `/#/signup`
- `/#/dashboard` (protected)
- `/#/` (home with toolbar + latest 6 readonly tournaments)

Role-based access:

- Authenticated users can create, edit and delete their own tournaments in dashboard.
- Completed tournaments can only be edited/deleted by users with role `admin`.
- Role is resolved from Supabase user metadata in this order: `app_metadata.role`, then `user_metadata.role`.

Before running with ownership rules, apply latest DB migration in `server/`:

- `npm run prisma:deploy:local`

## Deploy To Fly.io (Frontend + API)

This project should be deployed as two Fly apps:

- Frontend app (root): static Vite build served by nginx (`fly.toml` + root `Dockerfile`)
- API app (`server/`): Fastify + Prisma (`server/fly.toml` + `server/Dockerfile`)

### 1. Deploy API app

From `server/`:

```bash
flyctl apps create tournament-builder-api
flyctl secrets set \
   DATABASE_URL="<pooler-url>" \
   DIRECT_URL="<direct-url>" \
   CORS_ORIGIN="https://tournament-builder.fly.dev"
flyctl deploy -c fly.toml
```

### 2. Deploy Frontend app

From project root:

```bash
flyctl apps create tournament-builder
flyctl deploy -c fly.toml --build-arg VITE_API_BASE_URL="https://tournament-builder-api.fly.dev"
```

### 3. Notes

- Frontend API client reads `VITE_API_BASE_URL` at build time and calls `${VITE_API_BASE_URL}/api`.
- Do not set `VITE_API_BASE_URL` as Fly secret for frontend. Since Vite bakes env values at build time, pass it as `--build-arg`.
- If `VITE_API_BASE_URL` is not set, it falls back to relative routes (`/api`) for local dev with Vite proxy.
- API deploy runs `npm run prisma:deploy` automatically as release command.
