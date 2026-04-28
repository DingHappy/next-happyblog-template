-- AlterTable
ALTER TABLE "Post" ADD COLUMN "sourcePath" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Post_sourcePath_key" ON "Post"("sourcePath");

-- CreateIndex
CREATE INDEX "Post_sourcePath_idx" ON "Post"("sourcePath");
