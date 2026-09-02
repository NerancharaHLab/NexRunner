-- AlterTable
ALTER TABLE "suites" ADD COLUMN     "siteId" TEXT;

-- CreateIndex
CREATE INDEX "suites_siteId_idx" ON "suites"("siteId");

-- AddForeignKey
ALTER TABLE "suites" ADD CONSTRAINT "suites_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
