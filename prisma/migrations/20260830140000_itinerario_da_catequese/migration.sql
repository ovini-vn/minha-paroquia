-- AlterTable
ALTER TABLE "catechism_groups" ADD COLUMN     "itinerario_id" TEXT;

-- AlterTable
ALTER TABLE "catechism_sessions" ADD COLUMN     "itinerario_tema_id" TEXT;

-- CreateTable
CREATE TABLE "itinerarios" (
    "id" TEXT NOT NULL,
    "parish_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "itinerarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itinerario_temas" (
    "id" TEXT NOT NULL,
    "parish_id" TEXT NOT NULL,
    "itinerario_id" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "itinerario_temas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "itinerarios_parish_id_idx" ON "itinerarios"("parish_id");

-- CreateIndex
CREATE INDEX "itinerario_temas_parish_id_itinerario_id_idx" ON "itinerario_temas"("parish_id", "itinerario_id");

-- AddForeignKey
ALTER TABLE "itinerarios" ADD CONSTRAINT "itinerarios_parish_id_fkey" FOREIGN KEY ("parish_id") REFERENCES "parishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itinerario_temas" ADD CONSTRAINT "itinerario_temas_parish_id_fkey" FOREIGN KEY ("parish_id") REFERENCES "parishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itinerario_temas" ADD CONSTRAINT "itinerario_temas_itinerario_id_fkey" FOREIGN KEY ("itinerario_id") REFERENCES "itinerarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catechism_groups" ADD CONSTRAINT "catechism_groups_itinerario_id_fkey" FOREIGN KEY ("itinerario_id") REFERENCES "itinerarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catechism_sessions" ADD CONSTRAINT "catechism_sessions_itinerario_tema_id_fkey" FOREIGN KEY ("itinerario_tema_id") REFERENCES "itinerario_temas"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Row-Level Security, como toda tabela que carrega parish_id. Sem isto o
-- itinerário de uma paróquia apareceria para outra, e a lista de temas é
-- justamente o trabalho de formação que cada comunidade construiu.
ALTER TABLE itinerarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE itinerarios FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON itinerarios
  USING (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  )
  WITH CHECK (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE itinerario_temas ENABLE ROW LEVEL SECURITY;
ALTER TABLE itinerario_temas FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON itinerario_temas
  USING (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  )
  WITH CHECK (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  );
