-- Add a slug column while preserving existing posts.
ALTER TABLE "Post" ADD COLUMN "slug" TEXT;

-- Existing rows get a stable unique fallback. New writes generate human-readable slugs in the app.
UPDATE "Post"
SET "slug" = "id"
WHERE "slug" IS NULL;

ALTER TABLE "Post" ALTER COLUMN "slug" SET NOT NULL;

CREATE UNIQUE INDEX "Post_slug_key" ON "Post"("slug");
CREATE INDEX "Post_slug_idx" ON "Post"("slug");
