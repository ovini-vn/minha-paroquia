-- CreateEnum
CREATE TYPE "ThemePreference" AS ENUM ('default', 'liturgical');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "theme_preference" "ThemePreference" NOT NULL DEFAULT 'default';
