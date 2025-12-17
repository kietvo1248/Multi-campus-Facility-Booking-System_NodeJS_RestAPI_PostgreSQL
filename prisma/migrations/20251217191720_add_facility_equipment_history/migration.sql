DO $$ BEGIN
  CREATE TYPE "EquipmentCondition" AS ENUM ('good', 'poor');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

UPDATE "facility_equipments"
SET "condition" = LOWER("condition");

UPDATE "facility_equipments"
SET "condition" = 'good'
WHERE "condition" NOT IN ('good', 'poor');

ALTER TABLE "facility_equipments"
  ALTER COLUMN "condition" TYPE "EquipmentCondition"
  USING ("condition"::text::"EquipmentCondition");

-- (không add primary key nữa)

CREATE TABLE IF NOT EXISTS "facility_equipment_histories" (
  "id" SERIAL NOT NULL,
  "facilityId" INTEGER NOT NULL,
  "equipmentTypeId" INTEGER NOT NULL,
  "action" TEXT NOT NULL,
  "note" TEXT,
  "oldQuantity" INTEGER,
  "newQuantity" INTEGER,
  "oldCondition" "EquipmentCondition",
  "newCondition" "EquipmentCondition",
  "createdById" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "facility_equipment_histories_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "facility_equipment_histories_facilityId_equipmentTypeId_idx"
ON "facility_equipment_histories"("facilityId", "equipmentTypeId");

DO $$ BEGIN
  ALTER TABLE "facility_equipment_histories"
    ADD CONSTRAINT "facility_equipment_histories_facilityId_fkey"
    FOREIGN KEY ("facilityId") REFERENCES "facilities"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "facility_equipment_histories"
    ADD CONSTRAINT "facility_equipment_histories_equipmentTypeId_fkey"
    FOREIGN KEY ("equipmentTypeId") REFERENCES "equipment_types"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "facility_equipment_histories"
    ADD CONSTRAINT "facility_equipment_histories_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
