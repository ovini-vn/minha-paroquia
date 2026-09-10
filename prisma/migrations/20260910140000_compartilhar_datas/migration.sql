-- Consentimento para a comunidade ver as datas do fiel.
--
-- FALSO por padrão de propósito. A política de privacidade publicada
-- promete que "um fiel comum não tem acesso à lista de membros nem aos
-- dados de outros fiéis" — ligar para todos quebraria uma promessa já
-- feita a quem se cadastrou. Quem quiser aparecer escolhe.
ALTER TABLE "users" ADD COLUMN "compartilha_datas" BOOLEAN NOT NULL DEFAULT false;
