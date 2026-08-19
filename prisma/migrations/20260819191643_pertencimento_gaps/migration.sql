-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('published', 'archived');

-- CreateEnum
CREATE TYPE "AvisoStatus" AS ENUM ('published', 'archived');

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "status" "EventStatus" NOT NULL DEFAULT 'published';

-- AlterTable
ALTER TABLE "parishes" ADD COLUMN     "address" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "logo_url" TEXT,
ADD COLUMN     "phone" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "birth_date" DATE,
ADD COLUMN     "phone" TEXT;

-- CreateTable
CREATE TABLE "avisos" (
    "id" TEXT NOT NULL,
    "parish_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "AvisoStatus" NOT NULL DEFAULT 'published',
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "avisos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "avisos_parish_id_created_at_idx" ON "avisos"("parish_id", "created_at");

-- AddForeignKey
ALTER TABLE "avisos" ADD CONSTRAINT "avisos_parish_id_fkey" FOREIGN KEY ("parish_id") REFERENCES "parishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
