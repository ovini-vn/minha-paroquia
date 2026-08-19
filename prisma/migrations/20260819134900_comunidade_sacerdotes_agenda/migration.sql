-- CreateEnum
CREATE TYPE "CelebrationType" AS ENUM ('missa', 'confissao', 'adoracao', 'batizado', 'casamento', 'outro');

-- AlterTable
ALTER TABLE "invitations" ADD COLUMN     "intended_role_code" TEXT;

-- CreateTable
CREATE TABLE "priest_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "parish_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "bio" TEXT,
    "photo_url" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "priest_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "celebrations" (
    "id" TEXT NOT NULL,
    "parish_id" TEXT NOT NULL,
    "type" "CelebrationType" NOT NULL DEFAULT 'missa',
    "title" TEXT,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "priest_profile_id" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "celebrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "parish_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "priest_profiles_parish_id_idx" ON "priest_profiles"("parish_id");

-- CreateIndex
CREATE UNIQUE INDEX "priest_profiles_user_id_parish_id_key" ON "priest_profiles"("user_id", "parish_id");

-- CreateIndex
CREATE INDEX "celebrations_parish_id_starts_at_idx" ON "celebrations"("parish_id", "starts_at");

-- CreateIndex
CREATE INDEX "events_parish_id_starts_at_idx" ON "events"("parish_id", "starts_at");

-- AddForeignKey
ALTER TABLE "priest_profiles" ADD CONSTRAINT "priest_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "priest_profiles" ADD CONSTRAINT "priest_profiles_parish_id_fkey" FOREIGN KEY ("parish_id") REFERENCES "parishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "celebrations" ADD CONSTRAINT "celebrations_parish_id_fkey" FOREIGN KEY ("parish_id") REFERENCES "parishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "celebrations" ADD CONSTRAINT "celebrations_priest_profile_id_fkey" FOREIGN KEY ("priest_profile_id") REFERENCES "priest_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_parish_id_fkey" FOREIGN KEY ("parish_id") REFERENCES "parishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
