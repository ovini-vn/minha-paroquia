-- CreateEnum
CREATE TYPE "PrayerRequestStatus" AS ENUM ('pendente', 'aprovado', 'recusado');

-- AlterTable
ALTER TABLE "prayer_requests" ADD COLUMN     "status" "PrayerRequestStatus" NOT NULL DEFAULT 'pendente',
ADD COLUMN     "moderated_by" TEXT,
ADD COLUMN     "moderated_at" TIMESTAMP(3);

-- Pedidos que já existiam continuam onde estavam: quem escreveu não pode
-- ver o próprio pedido sumir do mural por causa de uma regra criada depois.
UPDATE "prayer_requests" SET "status" = 'aprovado';
