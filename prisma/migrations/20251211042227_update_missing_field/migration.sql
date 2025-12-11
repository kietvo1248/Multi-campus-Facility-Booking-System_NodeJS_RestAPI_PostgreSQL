/*
  Warnings:

  - The values [STAFF,CLUB_LEADER,SECURITY] on the enum `UserRole` will be removed. If these variants are still used in the database, this will fail.
  - The primary key for the `club_priorities` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[clubId,facilityId]` on the table `club_priorities` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[code]` on the table `clubs` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[googleId]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `code` to the `clubs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `clubs` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "UserRole_new" AS ENUM ('ADMIN', 'LECTURER', 'STUDENT', 'FACILITY_ADMIN', 'SECURITY_GUARD');
ALTER TABLE "users" ALTER COLUMN "role" TYPE "UserRole_new" USING ("role"::text::"UserRole_new");
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE "public"."UserRole_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "club_priorities" DROP CONSTRAINT "club_priorities_clubId_fkey";

-- DropForeignKey
ALTER TABLE "club_priorities" DROP CONSTRAINT "club_priorities_facilityId_fkey";

-- DropForeignKey
ALTER TABLE "clubs" DROP CONSTRAINT "clubs_leaderId_fkey";

-- AlterTable
ALTER TABLE "club_priorities" DROP CONSTRAINT "club_priorities_pkey",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD COLUMN     "note" TEXT,
ALTER COLUMN "priorityScore" SET DEFAULT 0,
ADD CONSTRAINT "club_priorities_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "clubs" ADD COLUMN     "code" TEXT NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "leaderId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "facility_types" ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "googleId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "club_priorities_clubId_facilityId_key" ON "club_priorities"("clubId", "facilityId");

-- CreateIndex
CREATE UNIQUE INDEX "clubs_code_key" ON "clubs"("code");

-- CreateIndex
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");

-- AddForeignKey
ALTER TABLE "clubs" ADD CONSTRAINT "clubs_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_priorities" ADD CONSTRAINT "club_priorities_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_priorities" ADD CONSTRAINT "club_priorities_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
