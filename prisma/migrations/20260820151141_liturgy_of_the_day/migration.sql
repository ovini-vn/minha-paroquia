-- CreateTable
CREATE TABLE "liturgy_of_the_day" (
    "id" TEXT NOT NULL,
    "parish_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "gospel_reference" TEXT NOT NULL,
    "gospel_title" TEXT,
    "first_reading" TEXT,
    "psalm" TEXT,
    "second_reading" TEXT,
    "reflection" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "liturgy_of_the_day_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "liturgy_of_the_day_parish_id_date_idx" ON "liturgy_of_the_day"("parish_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "liturgy_of_the_day_parish_id_date_key" ON "liturgy_of_the_day"("parish_id", "date");

-- AddForeignKey
ALTER TABLE "liturgy_of_the_day" ADD CONSTRAINT "liturgy_of_the_day_parish_id_fkey" FOREIGN KEY ("parish_id") REFERENCES "parishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Row-Level Security: leituras do dia são dado da paróquia, isoladas como
-- todas as demais tabelas tenant-scoped.
ALTER TABLE liturgy_of_the_day ENABLE ROW LEVEL SECURITY;
ALTER TABLE liturgy_of_the_day FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON liturgy_of_the_day
  USING (parish_id = NULLIF(current_setting('app.current_parish_id', true), '') OR current_setting('app.bypass_rls', true) = 'true')
  WITH CHECK (parish_id = NULLIF(current_setting('app.current_parish_id', true), '') OR current_setting('app.bypass_rls', true) = 'true');
