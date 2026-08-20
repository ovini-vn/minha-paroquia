-- CreateEnum
CREATE TYPE "ColorScheme" AS ENUM ('light', 'dark');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "color_scheme" "ColorScheme" NOT NULL DEFAULT 'light';
