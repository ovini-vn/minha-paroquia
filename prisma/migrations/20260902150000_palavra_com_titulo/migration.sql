-- Título opcional da Palavra do Padre.
--
-- Coluna nova em tabela que já existe: nada de RLS aqui. A política de
-- `posts` já vale para a linha inteira, e uma coluna a mais entra sob a
-- mesma política — RLS protege LINHA, não campo.
--
-- Nulo em tudo que já foi publicado, e fica assim: as cinco mensagens que
-- estão no ar não ganham título inventado por migration. Quem quiser dar
-- nome a uma delas usa "Corrigir" no próprio cartão.
ALTER TABLE "posts" ADD COLUMN "titulo" TEXT;
