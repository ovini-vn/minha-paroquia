-- CreateEnum
CREATE TYPE "FormaDeRecebimento" AS ENUM ('pix_identificado', 'pix_avulso', 'dinheiro', 'envelope', 'transferencia', 'outro');

-- CreateEnum
CREATE TYPE "EstadoDoPix" AS ENUM ('aguardando', 'recebida', 'expirada', 'descartada');

-- CreateEnum
CREATE TYPE "EstadoDoLancamento" AS ENUM ('sem_correspondencia', 'conciliado', 'conciliado_a_mao', 'ignorado');

-- CreateEnum
CREATE TYPE "TipoDeConciliacao" AS ENUM ('automatica', 'manual');

-- CreateTable
CREATE TABLE "contribuicao_finalidades" (
    "id" TEXT NOT NULL,
    "parish_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "icone" TEXT NOT NULL DEFAULT 'igreja',
    "eh_dizimo" BOOLEAN NOT NULL DEFAULT false,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contribuicao_finalidades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pix_de_contribuicao" (
    "id" TEXT NOT NULL,
    "parish_id" TEXT NOT NULL,
    "user_id" TEXT,
    "finalidade_id" TEXT NOT NULL,
    "centavos" INTEGER,
    "identificador" TEXT NOT NULL,
    "brcode" TEXT NOT NULL,
    "estado" "EstadoDoPix" NOT NULL DEFAULT 'aguardando',
    "expira_em" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pix_de_contribuicao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contribuicoes" (
    "id" TEXT NOT NULL,
    "parish_id" TEXT NOT NULL,
    "user_id" TEXT,
    "finalidade_id" TEXT NOT NULL,
    "centavos" INTEGER NOT NULL,
    "recebida_em" DATE NOT NULL,
    "forma" "FormaDeRecebimento" NOT NULL,
    "pix_id" TEXT,
    "registrada_por" TEXT,
    "observacao" TEXT,
    "cancelada" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contribuicoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lancamentos_de_extrato" (
    "id" TEXT NOT NULL,
    "parish_id" TEXT NOT NULL,
    "ocorreu_em" DATE NOT NULL,
    "centavos" INTEGER NOT NULL,
    "descricao" TEXT NOT NULL,
    "identificador" TEXT,
    "end_to_end_id" TEXT,
    "pagador" TEXT,
    "bruto" TEXT NOT NULL,
    "impressao" TEXT NOT NULL,
    "estado" "EstadoDoLancamento" NOT NULL DEFAULT 'sem_correspondencia',
    "importado_por" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lancamentos_de_extrato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conciliacoes_pix" (
    "id" TEXT NOT NULL,
    "parish_id" TEXT NOT NULL,
    "lancamento_id" TEXT NOT NULL,
    "pix_id" TEXT,
    "contribuicao_id" TEXT NOT NULL,
    "tipo" "TipoDeConciliacao" NOT NULL,
    "feita_por" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conciliacoes_pix_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contribuicao_finalidades_parish_id_ativa_ordem_idx" ON "contribuicao_finalidades"("parish_id", "ativa", "ordem");

-- CreateIndex
CREATE UNIQUE INDEX "pix_de_contribuicao_identificador_key" ON "pix_de_contribuicao"("identificador");

-- CreateIndex
CREATE INDEX "pix_de_contribuicao_parish_id_estado_created_at_idx" ON "pix_de_contribuicao"("parish_id", "estado", "created_at");

-- CreateIndex
CREATE INDEX "pix_de_contribuicao_parish_id_user_id_idx" ON "pix_de_contribuicao"("parish_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "contribuicoes_pix_id_key" ON "contribuicoes"("pix_id");

-- CreateIndex
CREATE INDEX "contribuicoes_parish_id_recebida_em_idx" ON "contribuicoes"("parish_id", "recebida_em");

-- CreateIndex
CREATE INDEX "contribuicoes_parish_id_user_id_recebida_em_idx" ON "contribuicoes"("parish_id", "user_id", "recebida_em");

-- CreateIndex
CREATE INDEX "contribuicoes_parish_id_finalidade_id_recebida_em_idx" ON "contribuicoes"("parish_id", "finalidade_id", "recebida_em");

-- CreateIndex
CREATE INDEX "lancamentos_de_extrato_parish_id_estado_ocorreu_em_idx" ON "lancamentos_de_extrato"("parish_id", "estado", "ocorreu_em");

-- CreateIndex
CREATE UNIQUE INDEX "lancamentos_de_extrato_parish_id_impressao_key" ON "lancamentos_de_extrato"("parish_id", "impressao");

-- CreateIndex
CREATE UNIQUE INDEX "conciliacoes_pix_lancamento_id_key" ON "conciliacoes_pix"("lancamento_id");

-- CreateIndex
CREATE INDEX "conciliacoes_pix_parish_id_created_at_idx" ON "conciliacoes_pix"("parish_id", "created_at");

-- AddForeignKey
ALTER TABLE "contribuicao_finalidades" ADD CONSTRAINT "contribuicao_finalidades_parish_id_fkey" FOREIGN KEY ("parish_id") REFERENCES "parishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pix_de_contribuicao" ADD CONSTRAINT "pix_de_contribuicao_parish_id_fkey" FOREIGN KEY ("parish_id") REFERENCES "parishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pix_de_contribuicao" ADD CONSTRAINT "pix_de_contribuicao_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pix_de_contribuicao" ADD CONSTRAINT "pix_de_contribuicao_finalidade_id_fkey" FOREIGN KEY ("finalidade_id") REFERENCES "contribuicao_finalidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contribuicoes" ADD CONSTRAINT "contribuicoes_parish_id_fkey" FOREIGN KEY ("parish_id") REFERENCES "parishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contribuicoes" ADD CONSTRAINT "contribuicoes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contribuicoes" ADD CONSTRAINT "contribuicoes_finalidade_id_fkey" FOREIGN KEY ("finalidade_id") REFERENCES "contribuicao_finalidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contribuicoes" ADD CONSTRAINT "contribuicoes_pix_id_fkey" FOREIGN KEY ("pix_id") REFERENCES "pix_de_contribuicao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamentos_de_extrato" ADD CONSTRAINT "lancamentos_de_extrato_parish_id_fkey" FOREIGN KEY ("parish_id") REFERENCES "parishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conciliacoes_pix" ADD CONSTRAINT "conciliacoes_pix_parish_id_fkey" FOREIGN KEY ("parish_id") REFERENCES "parishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conciliacoes_pix" ADD CONSTRAINT "conciliacoes_pix_lancamento_id_fkey" FOREIGN KEY ("lancamento_id") REFERENCES "lancamentos_de_extrato"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conciliacoes_pix" ADD CONSTRAINT "conciliacoes_pix_pix_id_fkey" FOREIGN KEY ("pix_id") REFERENCES "pix_de_contribuicao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conciliacoes_pix" ADD CONSTRAINT "conciliacoes_pix_contribuicao_id_fkey" FOREIGN KEY ("contribuicao_id") REFERENCES "contribuicoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;



-- Row-Level Security, como toda tabela que carrega parish_id.
--
-- Aqui pesa mais do que no resto: são valores em dinheiro e quem os deu. Uma
-- consulta que atravessasse paróquias mostraria a contribuição de uma
-- comunidade à secretaria de outra.

ALTER TABLE contribuicao_finalidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE contribuicao_finalidades FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON contribuicao_finalidades
  USING (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  )
  WITH CHECK (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  );


ALTER TABLE pix_de_contribuicao ENABLE ROW LEVEL SECURITY;
ALTER TABLE pix_de_contribuicao FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON pix_de_contribuicao
  USING (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  )
  WITH CHECK (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  );


ALTER TABLE contribuicoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE contribuicoes FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON contribuicoes
  USING (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  )
  WITH CHECK (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  );


ALTER TABLE lancamentos_de_extrato ENABLE ROW LEVEL SECURITY;
ALTER TABLE lancamentos_de_extrato FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON lancamentos_de_extrato
  USING (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  )
  WITH CHECK (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  );


ALTER TABLE conciliacoes_pix ENABLE ROW LEVEL SECURITY;
ALTER TABLE conciliacoes_pix FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON conciliacoes_pix
  USING (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  )
  WITH CHECK (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  );
