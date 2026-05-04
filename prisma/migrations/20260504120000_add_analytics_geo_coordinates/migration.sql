ALTER TABLE "AnalyticsSession" ADD COLUMN "latitude" DOUBLE PRECISION;
ALTER TABLE "AnalyticsSession" ADD COLUMN "longitude" DOUBLE PRECISION;

CREATE INDEX "AnalyticsSession_latitude_longitude_idx" ON "AnalyticsSession"("latitude", "longitude");
