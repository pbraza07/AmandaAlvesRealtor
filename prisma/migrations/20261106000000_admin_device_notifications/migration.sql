CREATE TABLE "AdminPushSubscription" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "endpointHash" TEXT NOT NULL,
  "endpoint" TEXT NOT NULL,
  "p256dh" TEXT NOT NULL,
  "auth" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AdminPushSubscription_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AdminPushSubscription_endpointHash_key" ON "AdminPushSubscription"("endpointHash");
CREATE INDEX "AdminPushSubscription_userId_idx" ON "AdminPushSubscription"("userId");
ALTER TABLE "AdminPushSubscription" ADD CONSTRAINT "AdminPushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE TABLE "LeadPushEvent" (
  "leadId" TEXT NOT NULL,
  "sent" INTEGER NOT NULL DEFAULT 0,
  "failed" INTEGER NOT NULL DEFAULT 0,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LeadPushEvent_pkey" PRIMARY KEY ("leadId")
);
ALTER TABLE "LeadPushEvent" ADD CONSTRAINT "LeadPushEvent_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
