-- CreateEnum
CREATE TYPE "ProvinceRole" AS ENUM ('ARCEBISPO_METROPOLITA', 'ADMINISTRADOR_PROVINCIAL');

-- CreateEnum
CREATE TYPE "NationalRole" AS ENUM ('PRESIDENTE_CNBB', 'OBSERVADOR_NACIONAL');

-- AlterTable
ALTER TABLE "dioceses" ADD COLUMN     "is_archdiocese" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "province_id" TEXT;

-- CreateTable
CREATE TABLE "ecclesiastical_provinces" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ecclesiastical_provinces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "province_memberships" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "province_id" TEXT NOT NULL,
    "role" "ProvinceRole" NOT NULL DEFAULT 'ARCEBISPO_METROPOLITA',
    "status" "MembershipStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "province_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "national_memberships" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "NationalRole" NOT NULL DEFAULT 'OBSERVADOR_NACIONAL',
    "status" "MembershipStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "national_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ecclesiastical_provinces_slug_key" ON "ecclesiastical_provinces"("slug");

-- CreateIndex
CREATE INDEX "province_memberships_province_id_status_idx" ON "province_memberships"("province_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "province_memberships_user_id_province_id_key" ON "province_memberships"("user_id", "province_id");

-- CreateIndex
CREATE UNIQUE INDEX "national_memberships_user_id_key" ON "national_memberships"("user_id");

-- CreateIndex
CREATE INDEX "dioceses_province_id_idx" ON "dioceses"("province_id");

-- AddForeignKey
ALTER TABLE "province_memberships" ADD CONSTRAINT "province_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "province_memberships" ADD CONSTRAINT "province_memberships_province_id_fkey" FOREIGN KEY ("province_id") REFERENCES "ecclesiastical_provinces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "national_memberships" ADD CONSTRAINT "national_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dioceses" ADD CONSTRAINT "dioceses_province_id_fkey" FOREIGN KEY ("province_id") REFERENCES "ecclesiastical_provinces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Row-Level Security.
--
-- `ecclesiastical_provinces` NÃO recebe RLS, pela mesma razão que `dioceses`
-- e `parishes` não recebem: é topo de hierarquia, não pertence a um tenant.
--
-- `province_memberships` segue exatamente o padrão de `diocese_memberships`:
-- o usuário lê as PRÓPRIAS linhas (por user_id, é o que permite montar a
-- sessão antes de haver contexto), e a administração de UMA província fica
-- amarrada a app.current_province_id — nunca bypass total.
ALTER TABLE province_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE province_memberships FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON province_memberships
  USING (
    user_id = NULLIF(current_setting('app.current_user_id', true), '')
    OR province_id = NULLIF(current_setting('app.current_province_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  )
  WITH CHECK (
    province_id = NULLIF(current_setting('app.current_province_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  );

-- `national_memberships` é o único caso onde a escrita usa bypass, e por uma
-- razão concreta: escopo nacional não tem nada mais estreito a que se
-- amarrar — conceder acesso nacional É uma operação de plataforma. A guarda
-- fica em requirePlatformAdmin, no chamador. A leitura da própria linha
-- continua liberada por user_id, para montar a sessão.
ALTER TABLE national_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE national_memberships FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON national_memberships
  USING (
    user_id = NULLIF(current_setting('app.current_user_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  )
  WITH CHECK (
    current_setting('app.bypass_rls', true) = 'true'
  );
