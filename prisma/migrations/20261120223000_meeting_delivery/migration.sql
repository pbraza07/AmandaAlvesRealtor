ALTER TABLE "MeetingReport"
  ADD COLUMN "deliveryAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "nextDeliveryAt" TIMESTAMP(3);
CREATE INDEX "MeetingReport_status_nextDeliveryAt_idx" ON "MeetingReport"("status", "nextDeliveryAt");
