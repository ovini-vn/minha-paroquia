-- CreateEnum
CREATE TYPE "SacramentType" AS ENUM ('batismo', 'primeira_eucaristia', 'crisma', 'matrimonio', 'outro');

-- CreateEnum
CREATE TYPE "SacramentStatus" AS ENUM ('self_reported', 'validated');

-- CreateTable
CREATE TABLE "mass_participations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "parish_id" TEXT NOT NULL,
    "celebration_id" TEXT,
    "participated_at" DATE NOT NULL,
    "reflection_text" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mass_participations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sacraments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "parish_id" TEXT NOT NULL,
    "type" "SacramentType" NOT NULL,
    "date" DATE NOT NULL,
    "location" TEXT,
    "priest_profile_id" TEXT,
    "note" TEXT,
    "status" "SacramentStatus" NOT NULL DEFAULT 'self_reported',
    "validated_by" TEXT,
    "validated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sacraments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "confession_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "parish_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "confession_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mass_participations_parish_id_user_id_idx" ON "mass_participations"("parish_id", "user_id");

-- CreateIndex
CREATE INDEX "mass_participations_parish_id_participated_at_idx" ON "mass_participations"("parish_id", "participated_at");

-- CreateIndex
CREATE INDEX "sacraments_parish_id_user_id_idx" ON "sacraments"("parish_id", "user_id");

-- CreateIndex
CREATE INDEX "confession_logs_parish_id_user_id_idx" ON "confession_logs"("parish_id", "user_id");

-- AddForeignKey
ALTER TABLE "mass_participations" ADD CONSTRAINT "mass_participations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mass_participations" ADD CONSTRAINT "mass_participations_parish_id_fkey" FOREIGN KEY ("parish_id") REFERENCES "parishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mass_participations" ADD CONSTRAINT "mass_participations_celebration_id_fkey" FOREIGN KEY ("celebration_id") REFERENCES "celebrations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sacraments" ADD CONSTRAINT "sacraments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sacraments" ADD CONSTRAINT "sacraments_parish_id_fkey" FOREIGN KEY ("parish_id") REFERENCES "parishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sacraments" ADD CONSTRAINT "sacraments_priest_profile_id_fkey" FOREIGN KEY ("priest_profile_id") REFERENCES "priest_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "confession_logs" ADD CONSTRAINT "confession_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "confession_logs" ADD CONSTRAINT "confession_logs_parish_id_fkey" FOREIGN KEY ("parish_id") REFERENCES "parishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
