DROP TABLE IF EXISTS "app_parameters";

CREATE TABLE "app_parameters" (
  "key" TEXT PRIMARY KEY,
  "value" JSONB NOT NULL,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO "app_parameters" ("key", "value")
VALUES ('read_only', 'true'::jsonb)
ON CONFLICT ("key") DO NOTHING;
