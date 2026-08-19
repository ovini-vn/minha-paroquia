-- CreateTable
CREATE TABLE "tithe_participations" (
    "id" TEXT NOT NULL,
    "parish_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "registered_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tithe_participations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tithe_participations_parish_id_idx" ON "tithe_participations"("parish_id");

-- CreateIndex
CREATE INDEX "tithe_participations_parish_id_period_idx" ON "tithe_participations"("parish_id", "period");

-- CreateIndex
CREATE UNIQUE INDEX "tithe_participations_user_id_period_key" ON "tithe_participations"("user_id", "period");

-- AddForeignKey
ALTER TABLE "tithe_participations" ADD CONSTRAINT "tithe_participations_parish_id_fkey" FOREIGN KEY ("parish_id") REFERENCES "parishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tithe_participations" ADD CONSTRAINT "tithe_participations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tithe_participations" ADD CONSTRAINT "tithe_participations_registered_by_fkey" FOREIGN KEY ("registered_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
