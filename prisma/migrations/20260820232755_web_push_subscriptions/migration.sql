-- CreateTable
CREATE TABLE "web_push_subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "web_push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "web_push_subscriptions_endpoint_key" ON "web_push_subscriptions"("endpoint");

-- CreateIndex
CREATE INDEX "web_push_subscriptions_user_id_idx" ON "web_push_subscriptions"("user_id");

-- AddForeignKey
ALTER TABLE "web_push_subscriptions" ADD CONSTRAINT "web_push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Row-Level Security.
--
-- O endpoint de push é uma CREDENCIAL: quem o tem consegue disparar
-- notificação naquele aparelho. A pessoa lê e apaga as próprias inscrições
-- (por user_id); o envio em lote roda no job diário, que precisa alcançar
-- os aparelhos de várias pessoas e por isso usa bypass — guardado pelo
-- segredo do cron, ver src/app/api/cron/lembretes/route.ts.
ALTER TABLE web_push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE web_push_subscriptions FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON web_push_subscriptions
  USING (
    user_id = NULLIF(current_setting('app.current_user_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  )
  WITH CHECK (
    user_id = NULLIF(current_setting('app.current_user_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  );
