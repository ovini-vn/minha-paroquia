-- CreateEnum
CREATE TYPE "LiturgicalRoleType" AS ENUM ('leitor', 'salmista', 'ministro', 'acolhida', 'musica', 'outro');

-- CreateTable
CREATE TABLE "liturgical_availability" (
    "id" TEXT NOT NULL,
    "parish_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role_type" "LiturgicalRoleType" NOT NULL,
    "weekday_pref" INTEGER,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "liturgical_availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "liturgical_schedules" (
    "id" TEXT NOT NULL,
    "parish_id" TEXT NOT NULL,
    "celebration_id" TEXT NOT NULL,
    "role_type" "LiturgicalRoleType" NOT NULL,
    "user_id" TEXT NOT NULL,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "liturgical_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "liturgical_availability_parish_id_idx" ON "liturgical_availability"("parish_id");

-- CreateIndex
CREATE UNIQUE INDEX "liturgical_availability_user_id_role_type_key" ON "liturgical_availability"("user_id", "role_type");

-- CreateIndex
CREATE INDEX "liturgical_schedules_parish_id_idx" ON "liturgical_schedules"("parish_id");

-- CreateIndex
CREATE INDEX "liturgical_schedules_user_id_idx" ON "liturgical_schedules"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "liturgical_schedules_celebration_id_role_type_user_id_key" ON "liturgical_schedules"("celebration_id", "role_type", "user_id");

-- AddForeignKey
ALTER TABLE "liturgical_availability" ADD CONSTRAINT "liturgical_availability_parish_id_fkey" FOREIGN KEY ("parish_id") REFERENCES "parishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liturgical_availability" ADD CONSTRAINT "liturgical_availability_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liturgical_schedules" ADD CONSTRAINT "liturgical_schedules_parish_id_fkey" FOREIGN KEY ("parish_id") REFERENCES "parishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liturgical_schedules" ADD CONSTRAINT "liturgical_schedules_celebration_id_fkey" FOREIGN KEY ("celebration_id") REFERENCES "celebrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liturgical_schedules" ADD CONSTRAINT "liturgical_schedules_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
