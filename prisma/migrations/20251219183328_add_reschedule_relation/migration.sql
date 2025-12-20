-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "rescheduleFromId" INTEGER;

-- CreateIndex
CREATE INDEX "bookings_rescheduleFromId_idx" ON "bookings"("rescheduleFromId");

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_rescheduleFromId_fkey" FOREIGN KEY ("rescheduleFromId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
