-- Registro de quem fez o quê nas operações que dão ou tiram acesso.
--
-- A entrada é gravada na MESMA TRANSAÇÃO da mudança que a originou: do lado
-- de fora, mais cedo ou mais tarde existiria mudança sem registro, e um log
-- com buracos não responde nada.
--
-- `ator_id` não tem chave estrangeira para users de propósito: se a conta
-- for apagada, o registro do que ela fez precisa sobreviver.
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "parish_id" TEXT NOT NULL,
    "ator_id" TEXT NOT NULL,
    "acao" TEXT NOT NULL,
    "alvo_tipo" TEXT,
    "alvo_id" TEXT,
    "detalhe" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- A consulta é sempre "o que aconteceu nesta paróquia, do mais recente".
CREATE INDEX "audit_logs_parish_id_created_at_idx" ON "audit_logs"("parish_id", "created_at");

ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_parish_id_fkey"
  FOREIGN KEY ("parish_id") REFERENCES "parishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Row-Level Security, como toda tabela de paróquia. Um log de auditoria que
-- vazasse entre comunidades seria pior que não existir.
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON audit_logs
  USING (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  )
  WITH CHECK (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  );
