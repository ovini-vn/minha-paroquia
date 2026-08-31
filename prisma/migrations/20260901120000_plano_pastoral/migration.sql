-- CreateTable
CREATE TABLE "planos_pastorais" (
    "id" TEXT NOT NULL,
    "parish_id" TEXT NOT NULL,
    "ano" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "introducao" TEXT,
    "publicado" BOOLEAN NOT NULL DEFAULT false,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "planos_pastorais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plano_secoes" (
    "id" TEXT NOT NULL,
    "parish_id" TEXT NOT NULL,
    "plano_id" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "rotulo" TEXT,
    "titulo" TEXT NOT NULL,
    "corpo" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plano_secoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "planos_pastorais_parish_id_publicado_idx" ON "planos_pastorais"("parish_id", "publicado");

-- CreateIndex
CREATE UNIQUE INDEX "planos_pastorais_parish_id_ano_key" ON "planos_pastorais"("parish_id", "ano");

-- CreateIndex
CREATE INDEX "plano_secoes_parish_id_plano_id_idx" ON "plano_secoes"("parish_id", "plano_id");

-- AddForeignKey
ALTER TABLE "planos_pastorais" ADD CONSTRAINT "planos_pastorais_parish_id_fkey" FOREIGN KEY ("parish_id") REFERENCES "parishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plano_secoes" ADD CONSTRAINT "plano_secoes_parish_id_fkey" FOREIGN KEY ("parish_id") REFERENCES "parishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plano_secoes" ADD CONSTRAINT "plano_secoes_plano_id_fkey" FOREIGN KEY ("plano_id") REFERENCES "planos_pastorais"("id") ON DELETE CASCADE ON UPDATE CASCADE;



-- Row-Level Security, como toda tabela que carrega parish_id. O plano diz o
-- que a paróquia decidiu na sua Assembleia; sem isto, a decisão de uma
-- comunidade apareceria na tela de outra.
ALTER TABLE planos_pastorais ENABLE ROW LEVEL SECURITY;
ALTER TABLE planos_pastorais FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON planos_pastorais
  USING (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  )
  WITH CHECK (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE plano_secoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE plano_secoes FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON plano_secoes
  USING (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  )
  WITH CHECK (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  );
