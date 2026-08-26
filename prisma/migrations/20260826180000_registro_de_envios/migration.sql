-- CreateTable
CREATE TABLE "notification_dispatches" (
    "id" TEXT NOT NULL,
    "parish_id" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_dispatches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notification_dispatches_chave_key" ON "notification_dispatches"("chave");

-- CreateIndex
CREATE INDEX "notification_dispatches_parish_id_created_at_idx" ON "notification_dispatches"("parish_id", "created_at");

-- AddForeignKey
ALTER TABLE "notification_dispatches" ADD CONSTRAINT "notification_dispatches_parish_id_fkey" FOREIGN KEY ("parish_id") REFERENCES "parishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Row-Level Security, como toda tabela de paróquia.
ALTER TABLE notification_dispatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_dispatches FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON notification_dispatches
  USING (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  )
  WITH CHECK (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  );
