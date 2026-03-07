CREATE TABLE "app_parameters" (
  "id" INTEGER PRIMARY KEY,
  "read_only" BOOLEAN NOT NULL DEFAULT TRUE,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO "app_parameters" ("id", "read_only")
VALUES (1, TRUE)
ON CONFLICT ("id") DO NOTHING;

ALTER TABLE "tournaments"
DROP COLUMN IF EXISTS "read_only";
