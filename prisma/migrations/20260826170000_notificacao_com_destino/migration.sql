-- AlterTable
ALTER TABLE "notifications" ADD COLUMN "link_path" TEXT;

-- Índice para dar por lidas as de um caminho: é a consulta que roda toda
-- vez que alguém abre uma tela que tinha notificação pendente.
CREATE INDEX "notifications_user_id_link_path_idx" ON "notifications"("user_id", "link_path");
