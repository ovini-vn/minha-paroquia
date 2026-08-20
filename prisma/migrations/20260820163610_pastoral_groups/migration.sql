-- CreateEnum
CREATE TYPE "PastoralGroupStatus" AS ENUM ('ativa', 'inativa');

-- CreateTable
CREATE TABLE "pastoral_groups" (
    "id" TEXT NOT NULL,
    "parish_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "leader_name" TEXT,
    "meets_when" TEXT,
    "meets_where" TEXT,
    "status" "PastoralGroupStatus" NOT NULL DEFAULT 'ativa',
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pastoral_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pastoral_group_interests" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "parish_id" TEXT NOT NULL,
    "status" "InterestStatus" NOT NULL DEFAULT 'manifestado',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pastoral_group_interests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pastoral_groups_parish_id_status_idx" ON "pastoral_groups"("parish_id", "status");

-- CreateIndex
CREATE INDEX "pastoral_group_interests_parish_id_idx" ON "pastoral_group_interests"("parish_id");

-- CreateIndex
CREATE UNIQUE INDEX "pastoral_group_interests_group_id_user_id_key" ON "pastoral_group_interests"("group_id", "user_id");

-- AddForeignKey
ALTER TABLE "pastoral_groups" ADD CONSTRAINT "pastoral_groups_parish_id_fkey" FOREIGN KEY ("parish_id") REFERENCES "parishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pastoral_group_interests" ADD CONSTRAINT "pastoral_group_interests_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "pastoral_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pastoral_group_interests" ADD CONSTRAINT "pastoral_group_interests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pastoral_group_interests" ADD CONSTRAINT "pastoral_group_interests_parish_id_fkey" FOREIGN KEY ("parish_id") REFERENCES "parishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Row-Level Security: pastorais e manifestações de interesse são dado da
-- paróquia, isoladas como todas as demais tabelas tenant-scoped.
ALTER TABLE pastoral_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE pastoral_groups FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON pastoral_groups
  USING (parish_id = NULLIF(current_setting('app.current_parish_id', true), '') OR current_setting('app.bypass_rls', true) = 'true')
  WITH CHECK (parish_id = NULLIF(current_setting('app.current_parish_id', true), '') OR current_setting('app.bypass_rls', true) = 'true');

ALTER TABLE pastoral_group_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE pastoral_group_interests FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON pastoral_group_interests
  USING (parish_id = NULLIF(current_setting('app.current_parish_id', true), '') OR current_setting('app.bypass_rls', true) = 'true')
  WITH CHECK (parish_id = NULLIF(current_setting('app.current_parish_id', true), '') OR current_setting('app.bypass_rls', true) = 'true');
