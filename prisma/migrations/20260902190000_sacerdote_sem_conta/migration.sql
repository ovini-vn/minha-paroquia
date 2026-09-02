-- Sacerdote que não usa o aplicativo.
--
-- Muitos padres não usam, e a comunidade continua precisando vê-los em
-- "Falar com um sacerdote". Até aqui a única saída era criar uma conta que
-- ninguém abriria, só para o app ter onde pendurar o nome.
--
-- Mesmo caminho que a catequese já usa para catequista sem conta
-- (catechism_groups.catechist_name).
ALTER TABLE "priest_profiles" ALTER COLUMN "user_id" DROP NOT NULL;
ALTER TABLE "priest_profiles" ADD COLUMN "nome" TEXT;

-- Um perfil precisa ser identificável por ALGUMA das duas coisas. Sem esta
-- trava, um perfil sem conta e sem nome apareceria na lista como uma linha
-- em branco, e ninguém saberia de quem é nem como apagar.
ALTER TABLE "priest_profiles"
  ADD CONSTRAINT "priest_profiles_conta_ou_nome"
  CHECK ("user_id" IS NOT NULL OR "nome" IS NOT NULL);
