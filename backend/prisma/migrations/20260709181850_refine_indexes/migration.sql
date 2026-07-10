-- DropIndex
DROP INDEX "links_shortCode_idx";

-- CreateIndex
CREATE INDEX "links_deletedAt_status_idx" ON "links"("deletedAt", "status");

-- CreateIndex
CREATE INDEX "links_deletedAt_expiresAt_idx" ON "links"("deletedAt", "expiresAt");
