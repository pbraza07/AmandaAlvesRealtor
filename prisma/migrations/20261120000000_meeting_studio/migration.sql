CREATE TABLE "FirefliesConnection" (
  "userId" TEXT PRIMARY KEY,
  "encryptedKey" TEXT NOT NULL,
  "accountEmail" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE "MeetingReport" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "fileHash" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "audio" BYTEA,
  "accessHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'UPLOADING',
  "transcriptId" TEXT,
  "transcript" JSONB,
  "overview" TEXT NOT NULL DEFAULT '',
  "agenda" TEXT NOT NULL DEFAULT '',
  "notes" TEXT NOT NULL DEFAULT '',
  "actionItems" TEXT NOT NULL DEFAULT '',
  "reviewedAt" TIMESTAMP(3),
  "lastCheckedAt" TIMESTAMP(3),
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "MeetingReport_userId_fileHash_key" ON "MeetingReport"("userId", "fileHash");
CREATE INDEX "MeetingReport_userId_createdAt_idx" ON "MeetingReport"("userId", "createdAt");
CREATE INDEX "MeetingReport_expiresAt_idx" ON "MeetingReport"("expiresAt");
