-- CreateEnum
CREATE TYPE "FontScale" AS ENUM ('p', 'm', 'g');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "font_scale" "FontScale" NOT NULL DEFAULT 'p';
