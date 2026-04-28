-- Add article management fields that were introduced after the initial schema.
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "categoryId" TEXT;
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "isPublic" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "isPinned" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "scheduledAt" TIMESTAMP(3);
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "sourceHash" TEXT;

-- Categories replace the old string-based Post.category field.
CREATE TABLE IF NOT EXISTS "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "postCount" INTEGER NOT NULL DEFAULT 0,
    "order" INTEGER NOT NULL DEFAULT 0,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Category_slug_key" ON "Category"("slug");
CREATE INDEX IF NOT EXISTS "Category_slug_idx" ON "Category"("slug");
CREATE INDEX IF NOT EXISTS "Category_parentId_idx" ON "Category"("parentId");
CREATE INDEX IF NOT EXISTS "Category_createdAt_idx" ON "Category"("createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "Category_name_parentId_key" ON "Category"("name", "parentId");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Category_parentId_fkey'
    ) THEN
        ALTER TABLE "Category"
        ADD CONSTRAINT "Category_parentId_fkey"
        FOREIGN KEY ("parentId") REFERENCES "Category"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'Post' AND column_name = 'category'
    ) THEN
        INSERT INTO "Category" ("id", "name", "slug", "updatedAt")
        SELECT
            'cat_' || md5("category"),
            "category",
            lower(regexp_replace("category", '\s+', '-', 'g')),
            CURRENT_TIMESTAMP
        FROM "Post"
        WHERE "category" IS NOT NULL AND "category" <> ''
        ON CONFLICT ("slug") DO NOTHING;

        UPDATE "Post"
        SET "categoryId" = "Category"."id"
        FROM "Category"
        WHERE "Post"."categoryId" IS NULL
          AND "Category"."slug" = lower(regexp_replace("Post"."category", '\s+', '-', 'g'));

        ALTER TABLE "Post" DROP COLUMN "category";
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Post_categoryId_fkey'
    ) THEN
        ALTER TABLE "Post"
        ADD CONSTRAINT "Post_categoryId_fkey"
        FOREIGN KEY ("categoryId") REFERENCES "Category"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Post_categoryId_idx" ON "Post"("categoryId");
CREATE INDEX IF NOT EXISTS "Post_sourceHash_idx" ON "Post"("sourceHash");

-- Nested comments.
ALTER TABLE "Comment" ADD COLUMN IF NOT EXISTS "parentId" TEXT;
CREATE INDEX IF NOT EXISTS "Comment_parentId_idx" ON "Comment"("parentId");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Comment_parentId_fkey'
    ) THEN
        ALTER TABLE "Comment"
        ADD CONSTRAINT "Comment_parentId_fkey"
        FOREIGN KEY ("parentId") REFERENCES "Comment"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Friend links.
CREATE TABLE IF NOT EXISTS "FriendLink" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "description" TEXT,
    "avatar" TEXT,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FriendLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "FriendLink_name_key" ON "FriendLink"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "FriendLink_url_key" ON "FriendLink"("url");
CREATE INDEX IF NOT EXISTS "FriendLink_isVisible_idx" ON "FriendLink"("isVisible");
CREATE INDEX IF NOT EXISTS "FriendLink_order_idx" ON "FriendLink"("order");

-- Post version history.
CREATE TABLE IF NOT EXISTS "PostVersion" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT,
    "content" TEXT NOT NULL,
    "categoryId" TEXT,
    "coverImage" TEXT,
    "tags" TEXT,
    "version" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostVersion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PostVersion_postId_idx" ON "PostVersion"("postId");
CREATE INDEX IF NOT EXISTS "PostVersion_version_idx" ON "PostVersion"("version");
CREATE INDEX IF NOT EXISTS "PostVersion_createdAt_idx" ON "PostVersion"("createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "PostVersion_postId_version_key" ON "PostVersion"("postId", "version");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'PostVersion_postId_fkey'
    ) THEN
        ALTER TABLE "PostVersion"
        ADD CONSTRAINT "PostVersion_postId_fkey"
        FOREIGN KEY ("postId") REFERENCES "Post"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Site settings.
CREATE TABLE IF NOT EXISTS "Setting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT,
    "type" TEXT NOT NULL DEFAULT 'string',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Setting_key_key" ON "Setting"("key");
CREATE INDEX IF NOT EXISTS "Setting_key_idx" ON "Setting"("key");
