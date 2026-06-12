-- Add shares_enabled column to tournaments
ALTER TABLE "tournaments" ADD COLUMN "shares_enabled" BOOLEAN NOT NULL DEFAULT true;

-- Create tournament_shares table
CREATE TABLE "tournament_shares" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tournament_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tournament_shares_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraint with cascade delete
ALTER TABLE "tournament_shares" ADD CONSTRAINT "tournament_shares_tournament_id_fkey"
    FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Unique constraint: one share per email per tournament
CREATE UNIQUE INDEX "tournament_shares_tournament_id_email_key" ON "tournament_shares"("tournament_id", "email");

-- Performance indexes
CREATE INDEX "tournament_shares_tournament_id_idx" ON "tournament_shares"("tournament_id");
CREATE INDEX "tournament_shares_email_idx" ON "tournament_shares"("email");
