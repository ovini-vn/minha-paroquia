-- CreateEnum
CREATE TYPE "TipoDeIntencao" AS ENUM ('sufragio', 'setimo_dia', 'trigesimo_dia', 'acao_de_gracas', 'saude', 'aniversario', 'outra');

-- CreateEnum
CREATE TYPE "EstadoDaIntencao" AS ENUM ('pedida', 'confirmada');

-- CreateTable
CREATE TABLE "intencoes_de_missa" (
    "id" TEXT NOT NULL,
    "parish_id" TEXT NOT NULL,
    "celebration_id" TEXT NOT NULL,
    "tipo" "TipoDeIntencao" NOT NULL,
    "texto" TEXT NOT NULL,
    "pedido_por_id" TEXT,
    "pedido_por_nome" TEXT,
    "estado" "EstadoDaIntencao" NOT NULL DEFAULT 'pedida',
    "registrada_por" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "intencoes_de_missa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preparacoes_de_sacramento" (
    "id" TEXT NOT NULL,
    "parish_id" TEXT NOT NULL,
    "tipo" "SacramentType" NOT NULL,
    "orientacao" TEXT NOT NULL,
    "documentos" TEXT[],
    "encontros" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "preparacoes_de_sacramento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "intencoes_de_missa_parish_id_celebration_id_idx" ON "intencoes_de_missa"("parish_id", "celebration_id");

-- CreateIndex
CREATE INDEX "intencoes_de_missa_parish_id_estado_idx" ON "intencoes_de_missa"("parish_id", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "preparacoes_de_sacramento_parish_id_tipo_key" ON "preparacoes_de_sacramento"("parish_id", "tipo");

-- AddForeignKey
ALTER TABLE "intencoes_de_missa" ADD CONSTRAINT "intencoes_de_missa_parish_id_fkey" FOREIGN KEY ("parish_id") REFERENCES "parishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intencoes_de_missa" ADD CONSTRAINT "intencoes_de_missa_celebration_id_fkey" FOREIGN KEY ("celebration_id") REFERENCES "celebrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intencoes_de_missa" ADD CONSTRAINT "intencoes_de_missa_pedido_por_id_fkey" FOREIGN KEY ("pedido_por_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preparacoes_de_sacramento" ADD CONSTRAINT "preparacoes_de_sacramento_parish_id_fkey" FOREIGN KEY ("parish_id") REFERENCES "parishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;



ALTER TABLE intencoes_de_missa ENABLE ROW LEVEL SECURITY;
ALTER TABLE intencoes_de_missa FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON intencoes_de_missa
  USING (parish_id = NULLIF(current_setting('app.current_parish_id', true), '') OR current_setting('app.bypass_rls', true) = 'true')
  WITH CHECK (parish_id = NULLIF(current_setting('app.current_parish_id', true), '') OR current_setting('app.bypass_rls', true) = 'true');

ALTER TABLE preparacoes_de_sacramento ENABLE ROW LEVEL SECURITY;
ALTER TABLE preparacoes_de_sacramento FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON preparacoes_de_sacramento
  USING (parish_id = NULLIF(current_setting('app.current_parish_id', true), '') OR current_setting('app.bypass_rls', true) = 'true')
  WITH CHECK (parish_id = NULLIF(current_setting('app.current_parish_id', true), '') OR current_setting('app.bypass_rls', true) = 'true');
