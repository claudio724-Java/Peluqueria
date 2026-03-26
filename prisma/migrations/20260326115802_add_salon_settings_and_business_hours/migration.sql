-- CreateEnum
CREATE TYPE "SalonShift" AS ENUM ('MORNING', 'AFTERNOON');

-- AlterTable
ALTER TABLE "Salon" ADD COLUMN     "address" TEXT,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'EUR',
ADD COLUMN     "email" TEXT,
ADD COLUMN     "slotIntervalMin" INTEGER NOT NULL DEFAULT 30;

-- CreateTable
CREATE TABLE "SalonBusinessHour" (
    "id" TEXT NOT NULL,
    "salonId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "shift" "SalonShift" NOT NULL,
    "isOpen" BOOLEAN NOT NULL DEFAULT false,
    "startMin" INTEGER,
    "endMin" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalonBusinessHour_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SalonBusinessHour_salonId_dayOfWeek_idx" ON "SalonBusinessHour"("salonId", "dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "SalonBusinessHour_salonId_dayOfWeek_shift_key" ON "SalonBusinessHour"("salonId", "dayOfWeek", "shift");

-- AddForeignKey
ALTER TABLE "SalonBusinessHour" ADD CONSTRAINT "SalonBusinessHour_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
