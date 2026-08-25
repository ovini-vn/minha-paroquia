-- CreateEnum
CREATE TYPE "DonationCategory" AS ENUM ('obras', 'evangelizacao', 'catequese', 'acao_social', 'pastoral', 'formacao', 'outros');

-- CreateEnum
CREATE TYPE "DizimoCtaTipo" AS ENUM ('whatsapp', 'link', 'interno');

-- AlterTable
ALTER TABLE "parishes" ADD COLUMN     "email" TEXT,
ADD COLUMN     "cnpj" TEXT;

-- CreateTable
CREATE TABLE "donation_settings" (
    "id" TEXT NOT NULL,
    "parish_id" TEXT NOT NULL,
    "pix_key" TEXT,
    "pix_key_type" TEXT,
    "pix_payload" TEXT,
    "dizimo_ativo" BOOLEAN NOT NULL DEFAULT true,
    "dizimo_titulo" TEXT,
    "dizimo_texto" TEXT,
    "dizimo_cta_label" TEXT,
    "dizimo_cta_tipo" "DizimoCtaTipo",
    "dizimo_cta_valor" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "donation_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "donation_purposes" (
    "id" TEXT NOT NULL,
    "parish_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'igreja',
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "donation_purposes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "donation_initiatives" (
    "id" TEXT NOT NULL,
    "parish_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "image_url" TEXT,
    "icon" TEXT NOT NULL DEFAULT 'obras',
    "category" "DonationCategory" NOT NULL DEFAULT 'outros',
    "starts_on" DATE,
    "ends_on" DATE,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "donation_initiatives_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "donation_settings_parish_id_key" ON "donation_settings"("parish_id");

-- CreateIndex
CREATE INDEX "donation_purposes_parish_id_active_display_order_idx" ON "donation_purposes"("parish_id", "active", "display_order");

-- CreateIndex
CREATE INDEX "donation_initiatives_parish_id_active_display_order_idx" ON "donation_initiatives"("parish_id", "active", "display_order");

-- AddForeignKey
ALTER TABLE "donation_settings" ADD CONSTRAINT "donation_settings_parish_id_fkey" FOREIGN KEY ("parish_id") REFERENCES "parishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donation_purposes" ADD CONSTRAINT "donation_purposes_parish_id_fkey" FOREIGN KEY ("parish_id") REFERENCES "parishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donation_initiatives" ADD CONSTRAINT "donation_initiatives_parish_id_fkey" FOREIGN KEY ("parish_id") REFERENCES "parishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Row-Level Security: dado financeiro da paróquia não pode vazar entre
-- paróquias nem por um `where` esquecido no código.
ALTER TABLE donation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE donation_settings FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON donation_settings
  USING (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  )
  WITH CHECK (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE donation_purposes ENABLE ROW LEVEL SECURITY;
ALTER TABLE donation_purposes FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON donation_purposes
  USING (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  )
  WITH CHECK (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE donation_initiatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE donation_initiatives FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON donation_initiatives
  USING (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  )
  WITH CHECK (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  );
