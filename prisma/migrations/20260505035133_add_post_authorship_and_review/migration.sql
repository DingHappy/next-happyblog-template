-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "authorId" TEXT,
ADD COLUMN     "reviewNote" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewerId" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'draft';

-- Backfill status from existing published flag so old posts stay public.
UPDATE "Post" SET "status" = 'published' WHERE "published" = true;

-- CreateIndex
CREATE INDEX "Post_authorId_idx" ON "Post"("authorId");

-- CreateIndex
CREATE INDEX "Post_status_idx" ON "Post"("status");

-- CreateIndex
CREATE INDEX "Post_status_updatedAt_idx" ON "Post"("status", "updatedAt");

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Restore pg_trgm GIN indexes that Prisma's introspection drops because they
-- aren't declared in schema.prisma. (Originally created by the
-- 20260504000000_add_pg_trgm_search migration.)
CREATE INDEX IF NOT EXISTS "Post_title_trgm_idx"
  ON "Post" USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Post_excerpt_trgm_idx"
  ON "Post" USING GIN (excerpt gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Post_content_trgm_idx"
  ON "Post" USING GIN (content gin_trgm_ops);
