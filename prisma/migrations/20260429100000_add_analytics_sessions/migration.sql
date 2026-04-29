-- Extend page-view tracking and add anonymous analytics sessions.

ALTER TABLE "PostView" ALTER COLUMN "postId" DROP NOT NULL;
ALTER TABLE "PostView" ADD COLUMN "sessionId" TEXT;
ALTER TABLE "PostView" ADD COLUMN "ip" TEXT;
ALTER TABLE "PostView" ADD COLUMN "userAgent" TEXT;
ALTER TABLE "PostView" ADD COLUMN "referer" TEXT;
ALTER TABLE "PostView" ADD COLUMN "path" TEXT;
ALTER TABLE "PostView" ADD COLUMN "duration" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "AnalyticsSession" (
  "id" TEXT NOT NULL,
  "visitorId" TEXT NOT NULL,
  "ip" TEXT,
  "userAgent" TEXT,
  "referer" TEXT,
  "entryPath" TEXT,
  "exitPath" TEXT,
  "duration" INTEGER NOT NULL DEFAULT 0,
  "pageViews" INTEGER NOT NULL DEFAULT 1,
  "country" TEXT,
  "region" TEXT,
  "city" TEXT,
  "device" TEXT,
  "browser" TEXT,
  "os" TEXT,
  "isBot" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AnalyticsSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PostView_sessionId_idx" ON "PostView"("sessionId");
CREATE INDEX "PostView_path_idx" ON "PostView"("path");
CREATE INDEX "AnalyticsSession_visitorId_idx" ON "AnalyticsSession"("visitorId");
CREATE INDEX "AnalyticsSession_createdAt_idx" ON "AnalyticsSession"("createdAt");
CREATE INDEX "AnalyticsSession_country_idx" ON "AnalyticsSession"("country");
CREATE INDEX "AnalyticsSession_device_idx" ON "AnalyticsSession"("device");
CREATE INDEX "AnalyticsSession_isBot_idx" ON "AnalyticsSession"("isBot");
