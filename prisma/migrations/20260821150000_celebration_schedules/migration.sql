-- CreateEnum
CREATE TYPE "RecurrenceFrequency" AS ENUM ('semanal', 'mensal');

-- AlterTable
ALTER TABLE "celebrations" ADD COLUMN     "canceled_at" TIMESTAMP(3),
ADD COLUMN     "schedule_id" TEXT;

-- CreateTable
CREATE TABLE "celebration_schedules" (
    "id" TEXT NOT NULL,
    "parish_id" TEXT NOT NULL,
    "type" "CelebrationType" NOT NULL DEFAULT 'missa',
    "title" TEXT,
    "location" TEXT,
    "priest_profile_id" TEXT,
    "frequency" "RecurrenceFrequency" NOT NULL,
    "weekday" INTEGER NOT NULL,
    "week_of_month" INTEGER,
    "time_minutes" INTEGER NOT NULL,
    "starts_on" DATE NOT NULL,
    "ends_on" DATE,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "celebration_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "celebration_schedules_parish_id_active_idx" ON "celebration_schedules"("parish_id", "active");

-- CreateIndex
CREATE UNIQUE INDEX "celebrations_schedule_id_starts_at_key" ON "celebrations"("schedule_id", "starts_at");

-- AddForeignKey
ALTER TABLE "celebrations" ADD CONSTRAINT "celebrations_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "celebration_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "celebration_schedules" ADD CONSTRAINT "celebration_schedules_parish_id_fkey" FOREIGN KEY ("parish_id") REFERENCES "parishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "celebration_schedules" ADD CONSTRAINT "celebration_schedules_priest_profile_id_fkey" FOREIGN KEY ("priest_profile_id") REFERENCES "priest_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Row-Level Security.
--
-- Mesma política das demais tabelas de paróquia: a regra de repetição é
-- conteúdo da paróquia e só existe dentro do tenant em contexto.
ALTER TABLE celebration_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE celebration_schedules FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON celebration_schedules
  USING (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  )
  WITH CHECK (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  );
