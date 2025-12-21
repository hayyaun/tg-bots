-- AlterTable
ALTER TABLE "reports" ADD COLUMN "resolved" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "reports_resolved_idx" ON "reports"("resolved");

