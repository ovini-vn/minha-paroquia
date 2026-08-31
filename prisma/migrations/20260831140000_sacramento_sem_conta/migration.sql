-- AlterTable
ALTER TABLE "sacraments" ADD COLUMN     "family_member_id" TEXT,
ALTER COLUMN "user_id" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "sacraments_parish_id_family_member_id_idx" ON "sacraments"("parish_id", "family_member_id");

-- AddForeignKey
ALTER TABLE "sacraments" ADD CONSTRAINT "sacraments_family_member_id_fkey" FOREIGN KEY ("family_member_id") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Um sacramento pende de UMA das duas pontas, nunca das duas nem de
-- nenhuma. A garantia fica no banco, e não na confiança no código: um
-- registro sem dono, ou com dois, é um registro que ninguém encontra depois.
--
-- `<>` entre booleanos é o ou-exclusivo: exatamente uma das colunas
-- preenchida.
ALTER TABLE sacraments ADD CONSTRAINT sacramento_tem_um_dono
  CHECK ((user_id IS NOT NULL) <> (family_member_id IS NOT NULL));
