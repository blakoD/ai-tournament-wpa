# Tournament Persistence Plan

## Decision Summary

- Database: Use a relational database (PostgreSQL), not NoSQL.
- Backend runtime: Use Node.js with a lightweight API framework (Fastify or Express).
- Hosting fit: Keep React/Vite frontend as static app and deploy API separately (Fly app or same app with API + static reverse proxy).

## Why This Stack

- Your domain is relational: `Tournament` has many `participants` and many `matches`.
- You need consistency for updates (match results, standings, progression), which benefits from SQL transactions.
- PostgreSQL on Fly is first-class, mature, and straightforward for backups/migrations.
- Node.js keeps language consistency with your TypeScript frontend.

## High-Level Architecture

- Frontend (existing Vite React app)
  - Calls REST endpoints instead of local storage.
- API Server (Node.js + TypeScript)
  - CRUD tournaments, participants, matches.
  - Domain actions: start tournament, update match result, swap participant.
- Database (PostgreSQL)
  - Normalized tables with foreign keys and indexes.

## Data Model (Initial)

- `tournaments`
  - `id` (uuid, pk)
  - `name`, `title`, `url_slug`, `description`
  - `participant_count`, `qualifies_by_group`, `elimination_type`, `status`
  - `created_at`, `started_at`, `completed_at`
- `participants`
  - `id` (uuid, pk)
  - `tournament_id` (fk -> tournaments.id)
  - `name`, `group_name`
  - `wins`, `matches_played`, `points_for`, `points_against`
  - `rank`, `global_rank`, `manual_rank_adjustment`
  - `is_qualified`, `is_dropped`, `original_id`
- `matches`
  - `id` (uuid, pk)
  - `tournament_id` (fk -> tournaments.id)
  - `stage`, `stage_number`, `round`
  - `participant_a_id`, `participant_b_id`
  - `score_a`, `score_b`, `winner_id`, `is_completed`
  - `group_name`, `next_match_id`, `next_match_slot`, `label`, `is_final`

## API Endpoints (Initial)

- `GET /health`
- `GET /api/tournaments`
- `POST /api/tournaments`
- `GET /api/tournaments/:id`
- `PUT /api/tournaments/:id`
- `DELETE /api/tournaments/:id`
- `POST /api/tournaments/:id/start`
- `POST /api/tournaments/:id/matches/:matchId/result`
- `POST /api/tournaments/:id/matches/:matchId/swap-participant`

## Server Tech Choices

- Runtime: Node.js 20+
- Language: TypeScript
- Framework: Fastify (preferred) or Express
- ORM: Prisma (recommended) or Drizzle
- Validation: Zod
- Auth (later): JWT or session-based

## Implementation Phases

1. Scaffold API service
- Create `server/` with TypeScript, Fastify, Prisma.
- Add health endpoint and logging.

2. Database setup
- Provision Fly Postgres.
- Add Prisma schema + first migration.
- Seed sample tournament data for testing.

3. Core tournament endpoints
- Implement CRUD for tournaments.
- Implement read/write participants and matches.
- Add transaction-safe match result update logic.

4. Frontend integration
- Replace `storageService` local persistence with HTTP client.
- Keep current `tournamentLogic` rules; move authoritative writes to API.
- Add loading/error states for API calls.

5. Deploy and harden
- Deploy API to Fly.
- Configure `CORS`, `DATABASE_URL`, and optional `API_BASE_URL` in frontend.
- Add basic rate limiting and request validation.

6. Quality and observability
- Add integration tests for progression and standings updates.
- Add structured logs and error boundaries.

## Relational vs NoSQL Recommendation

- Choose relational now.
- Choose NoSQL only if your shape becomes highly unstructured and you do not need relational constraints/transactions for progression logic.

## Notes for This Codebase

- Keep existing domain types aligned between frontend and backend DTOs.
- Consider a shared `contracts/` package for TypeScript types and Zod schemas.
- Start with REST; GraphQL is optional and not needed initially.

## Next Practical Step

- Create a `server/` folder and wire Fastify + Prisma + Postgres migration 001, then expose `GET /health` and `GET /api/tournaments/:id` first.
