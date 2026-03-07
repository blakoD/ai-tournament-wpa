<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/bae4f8ea-f016-464c-8bb1-cd42fddc6f65

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

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
