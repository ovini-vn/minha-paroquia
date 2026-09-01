-- AlterTable
ALTER TABLE "donation_purposes" ADD COLUMN     "finalidade_id" TEXT;

-- AddForeignKey
ALTER TABLE "donation_purposes" ADD CONSTRAINT "donation_purposes_finalidade_id_fkey" FOREIGN KEY ("finalidade_id") REFERENCES "contribuicao_finalidades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

