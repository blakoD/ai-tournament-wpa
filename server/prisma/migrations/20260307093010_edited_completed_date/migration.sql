-- DropForeignKey
ALTER TABLE "matches" DROP CONSTRAINT "matches_next_match_id_fkey";

-- DropForeignKey
ALTER TABLE "matches" DROP CONSTRAINT "matches_participant_a_id_fkey";

-- DropForeignKey
ALTER TABLE "matches" DROP CONSTRAINT "matches_participant_b_id_fkey";

-- DropForeignKey
ALTER TABLE "matches" DROP CONSTRAINT "matches_tournament_id_fkey";

-- DropForeignKey
ALTER TABLE "matches" DROP CONSTRAINT "matches_winner_id_fkey";

-- DropForeignKey
ALTER TABLE "participants" DROP CONSTRAINT "participants_tournament_id_fkey";

-- AlterTable
ALTER TABLE "tournaments" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "started_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "completed_at" SET DATA TYPE TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "participants" ADD CONSTRAINT "participants_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
