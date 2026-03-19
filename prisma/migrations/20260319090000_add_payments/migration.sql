-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('STRIPE', 'MANUAL');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'EXPIRED', 'FAILED', 'CANCELED');

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "salonId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "provider" "PaymentProvider" NOT NULL DEFAULT 'STRIPE',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "description" TEXT,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "customerEmail" TEXT,
    "providerPaymentId" TEXT,
    "providerCheckoutUrl" TEXT,
    "paidAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Payment_salonId_createdAt_idx" ON "Payment"("salonId", "createdAt");

-- CreateIndex
CREATE INDEX "Payment_appointmentId_idx" ON "Payment"("appointmentId");

-- CreateIndex
CREATE INDEX "Payment_provider_providerPaymentId_idx" ON "Payment"("provider", "providerPaymentId");

-- CreateIndex
CREATE INDEX "Payment_status_createdAt_idx" ON "Payment"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
