-- AlterTable
ALTER TABLE "catechism_rites" ADD COLUMN     "grupo_rito_id" TEXT;

-- CreateTable
CREATE TABLE "catechism_group_rites" (
    "id" TEXT NOT NULL,
    "parish_id" TEXT NOT NULL,
    "catechism_group_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "scheduled_at" DATE,
    "completed_at" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catechism_group_rites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "catechism_group_rites_parish_id_catechism_group_id_idx" ON "catechism_group_rites"("parish_id", "catechism_group_id");

-- CreateIndex
CREATE UNIQUE INDEX "catechism_rites_enrollment_id_grupo_rito_id_key" ON "catechism_rites"("enrollment_id", "grupo_rito_id");

-- AddForeignKey
ALTER TABLE "catechism_group_rites" ADD CONSTRAINT "catechism_group_rites_parish_id_fkey" FOREIGN KEY ("parish_id") REFERENCES "parishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catechism_group_rites" ADD CONSTRAINT "catechism_group_rites_catechism_group_id_fkey" FOREIGN KEY ("catechism_group_id") REFERENCES "catechism_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catechism_rites" ADD CONSTRAINT "catechism_rites_grupo_rito_id_fkey" FOREIGN KEY ("grupo_rito_id") REFERENCES "catechism_group_rites"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Row-Level Security, como toda tabela com parish_id.
ALTER TABLE catechism_group_rites ENABLE ROW LEVEL SECURITY;
ALTER TABLE catechism_group_rites FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON catechism_group_rites
  USING (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  )
  WITH CHECK (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  );
