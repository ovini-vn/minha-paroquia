-- CreateTable
CREATE TABLE "itinerario_tema_catecismo" (
    "id" TEXT NOT NULL,
    "parish_id" TEXT NOT NULL,
    "tema_id" TEXT NOT NULL,
    "paragrafo" INTEGER NOT NULL,
    "trecho" TEXT NOT NULL,
    "completo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "itinerario_tema_catecismo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "itinerario_tema_catecismo_parish_id_tema_id_idx" ON "itinerario_tema_catecismo"("parish_id", "tema_id");

-- CreateIndex
CREATE UNIQUE INDEX "itinerario_tema_catecismo_tema_id_paragrafo_key" ON "itinerario_tema_catecismo"("tema_id", "paragrafo");

-- AddForeignKey
ALTER TABLE "itinerario_tema_catecismo" ADD CONSTRAINT "itinerario_tema_catecismo_parish_id_fkey" FOREIGN KEY ("parish_id") REFERENCES "parishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itinerario_tema_catecismo" ADD CONSTRAINT "itinerario_tema_catecismo_tema_id_fkey" FOREIGN KEY ("tema_id") REFERENCES "itinerario_temas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Row-Level Security, como toda tabela que carrega parish_id: os parágrafos
-- escolhidos fazem parte do itinerário que cada paróquia construiu.
ALTER TABLE itinerario_tema_catecismo ENABLE ROW LEVEL SECURITY;
ALTER TABLE itinerario_tema_catecismo FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON itinerario_tema_catecismo
  USING (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  )
  WITH CHECK (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  );
