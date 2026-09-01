-- AlterTable
ALTER TABLE "contribuicoes" ALTER COLUMN "finalidade_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "donation_initiatives" ADD COLUMN     "finalidade_id" TEXT;

-- AlterTable
ALTER TABLE "pix_de_contribuicao" ALTER COLUMN "finalidade_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "donation_initiatives" ADD CONSTRAINT "donation_initiatives_finalidade_id_fkey" FOREIGN KEY ("finalidade_id") REFERENCES "contribuicao_finalidades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

