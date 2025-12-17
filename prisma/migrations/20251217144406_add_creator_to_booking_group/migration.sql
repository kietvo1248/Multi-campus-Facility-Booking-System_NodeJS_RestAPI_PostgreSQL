/*
  Warnings:

  - Added the required column `createdById` to the `booking_groups` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "booking_groups" ADD COLUMN     "createdById" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "booking_groups" ADD CONSTRAINT "booking_groups_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
