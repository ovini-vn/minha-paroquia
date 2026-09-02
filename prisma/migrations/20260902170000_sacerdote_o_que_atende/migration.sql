-- O que cada sacerdote atende pelo aplicativo.
--
-- Colunas novas em tabela existente: sem bloco de RLS. A política de
-- `priest_profiles` já protege a linha inteira.
--
-- DEFAULT true, e é a escolha certa para quem já está no ar: o
-- comportamento anterior era oferecer tudo, e subir isto com `false`
-- deixaria toda paróquia sem sacerdote disponível de um deploy para o
-- outro, sem ninguém ter pedido.
ALTER TABLE "priest_profiles"
  ADD COLUMN "oferece_atendimento" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "oferece_confissao"   BOOLEAN NOT NULL DEFAULT true;
