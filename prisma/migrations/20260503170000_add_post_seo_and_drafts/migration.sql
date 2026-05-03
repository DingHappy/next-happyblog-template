ALTER TABLE "Post"
  ADD COLUMN "seoTitle" TEXT,
  ADD COLUMN "seoDescription" TEXT,
  ADD COLUMN "canonicalUrl" TEXT,
  ADD COLUMN "ogImage" TEXT,
  ADD COLUMN "noIndex" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "PostDraft" (
  "id" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "slug" TEXT,
  "excerpt" TEXT,
  "content" TEXT NOT NULL,
  "categoryId" TEXT,
  "coverImage" TEXT,
  "tags" TEXT,
  "seoTitle" TEXT,
  "seoDescription" TEXT,
  "canonicalUrl" TEXT,
  "ogImage" TEXT,
  "noIndex" BOOLEAN NOT NULL DEFAULT false,
  "published" BOOLEAN NOT NULL DEFAULT true,
  "isPublic" BOOLEAN NOT NULL DEFAULT true,
  "isPinned" BOOLEAN NOT NULL DEFAULT false,
  "scheduledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PostDraft_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PostDraft_postId_key" ON "PostDraft"("postId");
CREATE INDEX "PostDraft_updatedAt_idx" ON "PostDraft"("updatedAt");
CREATE INDEX "Post_noIndex_idx" ON "Post"("noIndex");

ALTER TABLE "PostDraft" ADD CONSTRAINT "PostDraft_postId_fkey"
  FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
