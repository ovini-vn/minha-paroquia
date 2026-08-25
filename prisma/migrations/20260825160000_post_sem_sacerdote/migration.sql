-- Publicar a Palavra do Padre deixa de exigir um perfil de sacerdote: em
-- paróquia onde o padre não usa o aplicativo, quem publica é a secretaria
-- ou o administrador, e a assinatura vem do pároco cadastrado na paróquia.
ALTER TABLE "posts" ALTER COLUMN "priest_profile_id" DROP NOT NULL;
