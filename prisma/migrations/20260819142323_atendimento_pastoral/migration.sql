-- CreateEnum
CREATE TYPE "AvailabilityType" AS ENUM ('atendimento', 'confissao');

-- CreateEnum
CREATE TYPE "AppointmentCategory" AS ENUM ('confissao', 'direcao_espiritual', 'conversa', 'questao_familiar', 'sacramento', 'outro');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('solicitado', 'confirmado', 'cancelado', 'concluido');

-- CreateTable
CREATE TABLE "priest_availability" (
    "id" TEXT NOT NULL,
    "parish_id" TEXT NOT NULL,
    "priest_profile_id" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "type" "AvailabilityType" NOT NULL DEFAULT 'atendimento',
    "slot_minutes" INTEGER NOT NULL DEFAULT 30,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "priest_availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "parish_id" TEXT NOT NULL,
    "priest_profile_id" TEXT NOT NULL,
    "fiel_user_id" TEXT NOT NULL,
    "category" "AppointmentCategory" NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'solicitado',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "priest_availability_parish_id_priest_profile_id_idx" ON "priest_availability"("parish_id", "priest_profile_id");

-- CreateIndex
CREATE INDEX "appointments_parish_id_priest_profile_id_scheduled_at_idx" ON "appointments"("parish_id", "priest_profile_id", "scheduled_at");

-- CreateIndex
CREATE INDEX "appointments_fiel_user_id_idx" ON "appointments"("fiel_user_id");

-- AddForeignKey
ALTER TABLE "priest_availability" ADD CONSTRAINT "priest_availability_parish_id_fkey" FOREIGN KEY ("parish_id") REFERENCES "parishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "priest_availability" ADD CONSTRAINT "priest_availability_priest_profile_id_fkey" FOREIGN KEY ("priest_profile_id") REFERENCES "priest_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_parish_id_fkey" FOREIGN KEY ("parish_id") REFERENCES "parishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_priest_profile_id_fkey" FOREIGN KEY ("priest_profile_id") REFERENCES "priest_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_fiel_user_id_fkey" FOREIGN KEY ("fiel_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
