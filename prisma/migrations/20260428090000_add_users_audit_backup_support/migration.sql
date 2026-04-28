-- Add user accounts, audit logs, and comment subscriptions for admin hardening.

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "username" TEXT NOT NULL,
  "email" TEXT,
  "password" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'author',
  "displayName" TEXT,
  "avatar" TEXT,
  "bio" TEXT,
  "lastLoginAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "action" TEXT NOT NULL,
  "resource" TEXT NOT NULL,
  "resourceId" TEXT,
  "oldData" TEXT,
  "newData" TEXT,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommentSubscription" (
  "id" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "confirmed" BOOLEAN NOT NULL DEFAULT false,
  "confirmToken" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CommentSubscription_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Session" ADD COLUMN "userId" TEXT;

CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_username_idx" ON "User"("username");
CREATE INDEX "User_email_idx" ON "User"("email");
CREATE INDEX "User_role_idx" ON "User"("role");

CREATE INDEX "Session_userId_idx" ON "Session"("userId");

CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX "AuditLog_resource_idx" ON "AuditLog"("resource");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX "AuditLog_action_resource_createdAt_idx" ON "AuditLog"("action", "resource", "createdAt");
CREATE INDEX "AuditLog_ipAddress_idx" ON "AuditLog"("ipAddress");

CREATE UNIQUE INDEX "CommentSubscription_confirmToken_key" ON "CommentSubscription"("confirmToken");
CREATE INDEX "CommentSubscription_postId_idx" ON "CommentSubscription"("postId");
CREATE INDEX "CommentSubscription_email_idx" ON "CommentSubscription"("email");
CREATE UNIQUE INDEX "CommentSubscription_postId_email_key" ON "CommentSubscription"("postId", "email");

CREATE INDEX "Post_published_isPublic_createdAt_idx" ON "Post"("published", "isPublic", "createdAt");
CREATE INDEX "Post_published_isPublic_isPinned_createdAt_idx" ON "Post"("published", "isPublic", "isPinned", "createdAt");
CREATE INDEX "Post_viewCount_idx" ON "Post"("viewCount");
CREATE INDEX "Post_updatedAt_idx" ON "Post"("updatedAt");

CREATE INDEX "Comment_approved_idx" ON "Comment"("approved");
CREATE INDEX "Comment_approved_createdAt_idx" ON "Comment"("approved", "createdAt");
CREATE INDEX "Comment_email_idx" ON "Comment"("email");

ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CommentSubscription" ADD CONSTRAINT "CommentSubscription_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
