-- AlterTable
ALTER TABLE "Salon" ADD COLUMN     "stripeEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stripeSecretKeyEncrypted" TEXT,
ADD COLUMN     "stripeWebhookSecretEncrypted" TEXT;
