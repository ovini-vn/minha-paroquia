-- AlterTable
ALTER TABLE "parishes" ADD COLUMN     "facebook_url" TEXT,
ADD COLUMN     "instagram_url" TEXT,
ADD COLUMN     "whatsapp" TEXT;

-- CreateTable
CREATE TABLE "parish_office_hours" (
    "id" TEXT NOT NULL,
    "parish_id" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "opens_at" INTEGER NOT NULL,
    "closes_at" INTEGER NOT NULL,

    CONSTRAINT "parish_office_hours_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "parish_office_hours_parish_id_weekday_idx" ON "parish_office_hours"("parish_id", "weekday");

-- AddForeignKey
ALTER TABLE "parish_office_hours" ADD CONSTRAINT "parish_office_hours_parish_id_fkey" FOREIGN KEY ("parish_id") REFERENCES "parishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Row-Level Security: horário da secretaria é conteúdo da paróquia.
ALTER TABLE parish_office_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE parish_office_hours FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON parish_office_hours
  USING (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  )
  WITH CHECK (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  );
