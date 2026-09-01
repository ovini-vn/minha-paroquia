-- CreateEnum
CREATE TYPE "CategoriaDaAgenda" AS ENUM ('missa', 'oracao', 'sacramento', 'formacao', 'comunidade', 'festa', 'outro');

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "categoria" "CategoriaDaAgenda" NOT NULL DEFAULT 'outro';

