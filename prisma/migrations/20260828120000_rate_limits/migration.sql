-- Limite de tentativas por chave.
--
-- Existe por uma razão específica deste projeto: a senha usa Argon2id com
-- memoryCost 19456, caro DE PROPÓSITO. Sem limite, cada tentativa consome
-- memória e CPU do servidor — o próprio mecanismo de segurança vira o vetor
-- de esgotamento. A checagem acontece ANTES do hash.
--
-- Tabela global: sem parish_id e sem RLS, porque a proteção vale antes de
-- existir sessão e portanto antes de existir paróquia.
CREATE TABLE "rate_limits" (
    "chave" TEXT NOT NULL,
    "contagem" INTEGER NOT NULL DEFAULT 0,
    "janela_expira" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("chave")
);

-- Para a poda diária varrer por validade sem varrer a tabela toda.
CREATE INDEX "rate_limits_janela_expira_idx" ON "rate_limits"("janela_expira");
