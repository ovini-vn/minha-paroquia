-- CreateEnum
CREATE TYPE "DioceseRole" AS ENUM ('BISPO', 'ADMINISTRADOR_DIOCESANO');

-- AlterTable
ALTER TABLE "parishes" ADD COLUMN     "diocese_id" TEXT;

-- CreateTable
CREATE TABLE "dioceses" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "state" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dioceses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diocese_memberships" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "diocese_id" TEXT NOT NULL,
    "role" "DioceseRole" NOT NULL DEFAULT 'BISPO',
    "status" "MembershipStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "diocese_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dioceses_slug_key" ON "dioceses"("slug");

-- CreateIndex
CREATE INDEX "diocese_memberships_diocese_id_status_idx" ON "diocese_memberships"("diocese_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "diocese_memberships_user_id_diocese_id_key" ON "diocese_memberships"("user_id", "diocese_id");

-- AddForeignKey
ALTER TABLE "diocese_memberships" ADD CONSTRAINT "diocese_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diocese_memberships" ADD CONSTRAINT "diocese_memberships_diocese_id_fkey" FOREIGN KEY ("diocese_id") REFERENCES "dioceses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parishes" ADD CONSTRAINT "parishes_diocese_id_fkey" FOREIGN KEY ("diocese_id") REFERENCES "dioceses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Row-Level Security.
--
-- `dioceses` NÃO recebe RLS, pela mesma razão que `parishes` não recebe: é
-- topo de hierarquia, não pertence a um tenant — é o que define tenants.
--
-- `diocese_memberships` segue o padrão de `parish_memberships`: além do
-- bypass administrativo, um usuário sempre pode ler as PRÓPRIAS linhas
-- (por user_id). Isso é o que permite resolver "de que diocese este usuário
-- é bispo" logo depois de autenticar, quando ainda não há contexto de
-- tenant. Nunca permite ler o vínculo de outra pessoa.
ALTER TABLE diocese_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE diocese_memberships FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON diocese_memberships
  USING (
    user_id = NULLIF(current_setting('app.current_user_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  )
  WITH CHECK (
    current_setting('app.bypass_rls', true) = 'true'
  );
