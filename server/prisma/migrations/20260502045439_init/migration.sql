-- CreateEnum
CREATE TYPE "TournamentStatus" AS ENUM ('SETUP', 'STARTED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "StageType" AS ENUM ('RR', 'SE');

-- CreateEnum
CREATE TYPE "EliminationType" AS ENUM ('SINGLE_ELIMINATION', 'ROUND_ROBIN_2');

-- CreateTable
CREATE TABLE "tournaments" (
    "id" UUID NOT NULL,
    "owner_id" TEXT,
    "owner_email" TEXT,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url_slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "participant_count" INTEGER NOT NULL,
    "qualifies_by_group" INTEGER NOT NULL,
    "elimination_type" "EliminationType" NOT NULL,
    "status" "TournamentStatus" NOT NULL DEFAULT 'SETUP',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "tournaments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_parameters" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_parameters_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "participants" (
    "id" UUID NOT NULL,
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
    "is_qualified" BOOLEAN NOT NULL DEFAULT false,
    "is_dropped" BOOLEAN NOT NULL DEFAULT false,
    "original_id" UUID,

    CONSTRAINT "participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matches" (
    "id" UUID NOT NULL,
    "tournament_id" UUID NOT NULL,
    "stage" "StageType" NOT NULL,
    "stage_number" INTEGER NOT NULL,
    "round" INTEGER NOT NULL,
    "participant_a_id" UUID,
    "participant_b_id" UUID,
    "score_a" INTEGER,
    "score_b" INTEGER,
    "winner_id" UUID,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "group_name" TEXT,
    "next_match_id" UUID,
    "next_match_slot" TEXT,
    "label" TEXT,
    "is_final" BOOLEAN,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tournaments_url_slug_key" ON "tournaments"("url_slug");

-- CreateIndex
CREATE INDEX "participants_tournament_id_idx" ON "participants"("tournament_id");

-- CreateIndex
CREATE INDEX "participants_group_name_idx" ON "participants"("group_name");

-- CreateIndex
CREATE INDEX "matches_tournament_id_idx" ON "matches"("tournament_id");

-- CreateIndex
CREATE INDEX "matches_stage_number_idx" ON "matches"("stage_number");

-- CreateIndex
CREATE INDEX "matches_round_idx" ON "matches"("round");

-- AddForeignKey
ALTER TABLE "participants" ADD CONSTRAINT "participants_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
