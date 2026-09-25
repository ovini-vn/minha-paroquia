-- AlterTable
ALTER TABLE "pastoral_groups" ADD COLUMN     "convite_token" TEXT;

-- CreateTable
CREATE TABLE "recados_do_grupo" (
    "id" TEXT NOT NULL,
    "parish_id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "autor_id" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recados_do_grupo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "presencas_no_encontro" (
    "id" TEXT NOT NULL,
    "parish_id" TEXT NOT NULL,
    "encontro_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "presente" BOOLEAN NOT NULL,
    "marcada_por" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "presencas_no_encontro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tarefas_do_encontro" (
    "id" TEXT NOT NULL,
    "parish_id" TEXT NOT NULL,
    "encontro_id" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "responsavel_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tarefas_do_encontro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "respostas_ao_encontro" (
    "id" TEXT NOT NULL,
    "parish_id" TEXT NOT NULL,
    "encontro_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "vai" BOOLEAN NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "respostas_ao_encontro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "respostas_ao_evento" (
    "id" TEXT NOT NULL,
    "parish_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "vai" BOOLEAN NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "respostas_ao_evento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recados_do_grupo_parish_id_group_id_created_at_idx" ON "recados_do_grupo"("parish_id", "group_id", "created_at");

-- CreateIndex
CREATE INDEX "presencas_no_encontro_parish_id_user_id_idx" ON "presencas_no_encontro"("parish_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "presencas_no_encontro_encontro_id_user_id_key" ON "presencas_no_encontro"("encontro_id", "user_id");

-- CreateIndex
CREATE INDEX "tarefas_do_encontro_parish_id_encontro_id_idx" ON "tarefas_do_encontro"("parish_id", "encontro_id");

-- CreateIndex
CREATE INDEX "tarefas_do_encontro_parish_id_responsavel_id_idx" ON "tarefas_do_encontro"("parish_id", "responsavel_id");

-- CreateIndex
CREATE INDEX "respostas_ao_encontro_parish_id_user_id_idx" ON "respostas_ao_encontro"("parish_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "respostas_ao_encontro_encontro_id_user_id_key" ON "respostas_ao_encontro"("encontro_id", "user_id");

-- CreateIndex
CREATE INDEX "respostas_ao_evento_parish_id_user_id_idx" ON "respostas_ao_evento"("parish_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "respostas_ao_evento_event_id_user_id_key" ON "respostas_ao_evento"("event_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "pastoral_groups_convite_token_key" ON "pastoral_groups"("convite_token");

-- AddForeignKey
ALTER TABLE "recados_do_grupo" ADD CONSTRAINT "recados_do_grupo_parish_id_fkey" FOREIGN KEY ("parish_id") REFERENCES "parishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recados_do_grupo" ADD CONSTRAINT "recados_do_grupo_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "pastoral_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recados_do_grupo" ADD CONSTRAINT "recados_do_grupo_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presencas_no_encontro" ADD CONSTRAINT "presencas_no_encontro_parish_id_fkey" FOREIGN KEY ("parish_id") REFERENCES "parishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presencas_no_encontro" ADD CONSTRAINT "presencas_no_encontro_encontro_id_fkey" FOREIGN KEY ("encontro_id") REFERENCES "encontros_do_grupo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presencas_no_encontro" ADD CONSTRAINT "presencas_no_encontro_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarefas_do_encontro" ADD CONSTRAINT "tarefas_do_encontro_parish_id_fkey" FOREIGN KEY ("parish_id") REFERENCES "parishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarefas_do_encontro" ADD CONSTRAINT "tarefas_do_encontro_encontro_id_fkey" FOREIGN KEY ("encontro_id") REFERENCES "encontros_do_grupo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarefas_do_encontro" ADD CONSTRAINT "tarefas_do_encontro_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respostas_ao_encontro" ADD CONSTRAINT "respostas_ao_encontro_parish_id_fkey" FOREIGN KEY ("parish_id") REFERENCES "parishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respostas_ao_encontro" ADD CONSTRAINT "respostas_ao_encontro_encontro_id_fkey" FOREIGN KEY ("encontro_id") REFERENCES "encontros_do_grupo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respostas_ao_encontro" ADD CONSTRAINT "respostas_ao_encontro_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respostas_ao_evento" ADD CONSTRAINT "respostas_ao_evento_parish_id_fkey" FOREIGN KEY ("parish_id") REFERENCES "parishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respostas_ao_evento" ADD CONSTRAINT "respostas_ao_evento_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respostas_ao_evento" ADD CONSTRAINT "respostas_ao_evento_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;



-- Row-Level Security, como toda tabela que carrega parish_id.
ALTER TABLE recados_do_grupo ENABLE ROW LEVEL SECURITY;
ALTER TABLE recados_do_grupo FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON recados_do_grupo
  USING (parish_id = NULLIF(current_setting('app.current_parish_id', true), '') OR current_setting('app.bypass_rls', true) = 'true')
  WITH CHECK (parish_id = NULLIF(current_setting('app.current_parish_id', true), '') OR current_setting('app.bypass_rls', true) = 'true');

ALTER TABLE presencas_no_encontro ENABLE ROW LEVEL SECURITY;
ALTER TABLE presencas_no_encontro FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON presencas_no_encontro
  USING (parish_id = NULLIF(current_setting('app.current_parish_id', true), '') OR current_setting('app.bypass_rls', true) = 'true')
  WITH CHECK (parish_id = NULLIF(current_setting('app.current_parish_id', true), '') OR current_setting('app.bypass_rls', true) = 'true');

ALTER TABLE tarefas_do_encontro ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarefas_do_encontro FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON tarefas_do_encontro
  USING (parish_id = NULLIF(current_setting('app.current_parish_id', true), '') OR current_setting('app.bypass_rls', true) = 'true')
  WITH CHECK (parish_id = NULLIF(current_setting('app.current_parish_id', true), '') OR current_setting('app.bypass_rls', true) = 'true');

ALTER TABLE respostas_ao_encontro ENABLE ROW LEVEL SECURITY;
ALTER TABLE respostas_ao_encontro FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON respostas_ao_encontro
  USING (parish_id = NULLIF(current_setting('app.current_parish_id', true), '') OR current_setting('app.bypass_rls', true) = 'true')
  WITH CHECK (parish_id = NULLIF(current_setting('app.current_parish_id', true), '') OR current_setting('app.bypass_rls', true) = 'true');

ALTER TABLE respostas_ao_evento ENABLE ROW LEVEL SECURITY;
ALTER TABLE respostas_ao_evento FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON respostas_ao_evento
  USING (parish_id = NULLIF(current_setting('app.current_parish_id', true), '') OR current_setting('app.bypass_rls', true) = 'true')
  WITH CHECK (parish_id = NULLIF(current_setting('app.current_parish_id', true), '') OR current_setting('app.bypass_rls', true) = 'true');
