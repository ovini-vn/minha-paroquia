-- CreateEnum
CREATE TYPE "PapelNoGrupo" AS ENUM ('coordenador', 'membro');

-- CreateTable
CREATE TABLE "membros_do_grupo" (
    "id" TEXT NOT NULL,
    "parish_id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "papel" "PapelNoGrupo" NOT NULL DEFAULT 'membro',
    "added_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "membros_do_grupo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "encontros_do_grupo" (
    "id" TEXT NOT NULL,
    "parish_id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "data" DATE,
    "data_fim" DATE,
    "mes_previsto" TEXT,
    "tema" TEXT NOT NULL,
    "complemento" TEXT,
    "pregador" TEXT,
    "destaque" BOOLEAN NOT NULL DEFAULT false,
    "icone" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "encontros_do_grupo_pkey" PRIMARY KEY ("id"),
    -- O último dia só existe se houver o primeiro, e não vem antes dele.
    CONSTRAINT "encontros_do_grupo_fim_depois_do_inicio"
      CHECK ("data_fim" IS NULL OR ("data" IS NOT NULL AND "data_fim" >= "data")),
    -- "2026-12": ano e mês, nada mais. Serve para ordenar, e ordenar texto
    -- só funciona se todos tiverem a mesma forma.
    CONSTRAINT "encontros_do_grupo_mes_previsto_formato"
      CHECK ("mes_previsto" IS NULL OR "mes_previsto" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$')
);

-- CreateIndex
CREATE INDEX "membros_do_grupo_parish_id_group_id_idx" ON "membros_do_grupo"("parish_id", "group_id");

-- CreateIndex
CREATE INDEX "membros_do_grupo_user_id_idx" ON "membros_do_grupo"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "membros_do_grupo_group_id_user_id_key" ON "membros_do_grupo"("group_id", "user_id");

-- CreateIndex
CREATE INDEX "encontros_do_grupo_parish_id_group_id_data_idx" ON "encontros_do_grupo"("parish_id", "group_id", "data");

-- CreateIndex
CREATE INDEX "encontros_do_grupo_parish_id_data_idx" ON "encontros_do_grupo"("parish_id", "data");

-- AddForeignKey
ALTER TABLE "membros_do_grupo" ADD CONSTRAINT "membros_do_grupo_parish_id_fkey" FOREIGN KEY ("parish_id") REFERENCES "parishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membros_do_grupo" ADD CONSTRAINT "membros_do_grupo_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "pastoral_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membros_do_grupo" ADD CONSTRAINT "membros_do_grupo_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encontros_do_grupo" ADD CONSTRAINT "encontros_do_grupo_parish_id_fkey" FOREIGN KEY ("parish_id") REFERENCES "parishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encontros_do_grupo" ADD CONSTRAINT "encontros_do_grupo_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "pastoral_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Row-Level Security, como toda tabela que carrega parish_id.
--
-- Os membros têm a MESMA exceção de parish_memberships: a própria pessoa lê
-- as linhas dela sem contexto de paróquia. É o que deixa a sessão saber, na
-- mesma consulta em que resolve o vínculo, se a pessoa coordena algum grupo
-- — e portanto se a porta Gestão aparece para ela. Gravar continua preso à
-- paróquia.
ALTER TABLE membros_do_grupo ENABLE ROW LEVEL SECURITY;
ALTER TABLE membros_do_grupo FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON membros_do_grupo
  USING (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR user_id = NULLIF(current_setting('app.current_user_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  )
  WITH CHECK (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE encontros_do_grupo ENABLE ROW LEVEL SECURITY;
ALTER TABLE encontros_do_grupo FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON encontros_do_grupo
  USING (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  )
  WITH CHECK (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  );
