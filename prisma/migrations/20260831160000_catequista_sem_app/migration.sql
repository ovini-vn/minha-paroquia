-- AlterTable
ALTER TABLE "catechism_groups" ADD COLUMN     "catechist_name" TEXT;


-- Uma catequista por turma: ou a conta, ou o nome digitado, nunca as duas.
-- Duas fontes para o mesmo nome divergem, e a tela passaria a ter de
-- escolher qual mostrar.
ALTER TABLE catechism_groups ADD CONSTRAINT catequista_de_uma_fonte
  CHECK (NOT (catechist_user_id IS NOT NULL AND catechist_name IS NOT NULL));
