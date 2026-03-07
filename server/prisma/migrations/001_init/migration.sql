CREATE TYPE "TournamentStatus" AS ENUM ('SETUP', 'STARTED', 'COMPLETED');
CREATE TYPE "StageType" AS ENUM ('RR', 'SE');
CREATE TYPE "EliminationType" AS ENUM ('SINGLE_ELIMINATION', 'ROUND_ROBIN_2');

CREATE TABLE "tournaments" (
  "id" UUID PRIMARY KEY,
  "name" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "url_slug" TEXT NOT NULL UNIQUE,
  "description" TEXT NOT NULL,
  "participant_count" INTEGER NOT NULL,
  "qualifies_by_group" INTEGER NOT NULL,
  "elimination_type" "EliminationType" NOT NULL,
  "status" "TournamentStatus" NOT NULL DEFAULT 'SETUP',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "started_at" TIMESTAMPTZ,
  "completed_at" TIMESTAMPTZ
);

CREATE TABLE "participants" (
  "id" UUID PRIMARY KEY,
  "tournament_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "group_name" TEXT NOT NULL DEFAULT 'A',
  "wins" INTEGER NOT NULL DEFAULT 0,
  "matches_played" INTEGER NOT NULL DEFAULT 0,
  "points_for" INTEGER NOT NULL DEFAULT 0,
  "points_against" INTEGER NOT NULL DEFAULT 0,
  "rank" INTEGER NOT NULL DEFAULT 0,
  "global_rank" INTEGER,
  "manual_rank_adjustment" INTEGER NOT NULL DEFAULT 0,
  "is_qualified" BOOLEAN NOT NULL DEFAULT FALSE,
  "is_dropped" BOOLEAN NOT NULL DEFAULT FALSE,
  "original_id" UUID,
  CONSTRAINT "participants_tournament_id_fkey"
    FOREIGN KEY ("tournament_id")
    REFERENCES "tournaments" ("id")
    ON DELETE CASCADE
);

CREATE TABLE "matches" (
  "id" UUID PRIMARY KEY,
  "tournament_id" UUID NOT NULL,
  "stage" "StageType" NOT NULL,
  "stage_number" INTEGER NOT NULL,
  "round" INTEGER NOT NULL,
  "participant_a_id" UUID,
  "participant_b_id" UUID,
  "score_a" INTEGER,
  "score_b" INTEGER,
  "winner_id" UUID,
  "is_completed" BOOLEAN NOT NULL DEFAULT FALSE,
  "group_name" TEXT,
  "next_match_id" UUID,
  "next_match_slot" TEXT,
  "label" TEXT,
  "is_final" BOOLEAN,
  CONSTRAINT "matches_tournament_id_fkey"
    FOREIGN KEY ("tournament_id")
    REFERENCES "tournaments" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "matches_participant_a_id_fkey"
    FOREIGN KEY ("participant_a_id")
    REFERENCES "participants" ("id")
    ON DELETE SET NULL,
  CONSTRAINT "matches_participant_b_id_fkey"
    FOREIGN KEY ("participant_b_id")
    REFERENCES "participants" ("id")
    ON DELETE SET NULL,
  CONSTRAINT "matches_winner_id_fkey"
    FOREIGN KEY ("winner_id")
    REFERENCES "participants" ("id")
    ON DELETE SET NULL,
  CONSTRAINT "matches_next_match_id_fkey"
    FOREIGN KEY ("next_match_id")
    REFERENCES "matches" ("id")
    ON DELETE SET NULL
);

CREATE INDEX "participants_tournament_id_idx" ON "participants" ("tournament_id");
CREATE INDEX "participants_group_name_idx" ON "participants" ("group_name");
CREATE INDEX "matches_tournament_id_idx" ON "matches" ("tournament_id");
CREATE INDEX "matches_stage_number_idx" ON "matches" ("stage_number");
CREATE INDEX "matches_round_idx" ON "matches" ("round");
