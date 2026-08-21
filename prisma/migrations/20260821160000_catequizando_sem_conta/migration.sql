-- DropForeignKey
ALTER TABLE "family_members" DROP CONSTRAINT "family_members_responsible_user_id_fkey";

-- AlterTable
ALTER TABLE "family_members" ADD COLUMN     "guardian_name" TEXT,
ADD COLUMN     "guardian_phone" TEXT,
ALTER COLUMN "responsible_user_id" DROP NOT NULL,
ALTER COLUMN "relationship" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "family_members_parish_id_full_name_idx" ON "family_members"("parish_id", "full_name");

-- AddForeignKey
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_responsible_user_id_fkey" FOREIGN KEY ("responsible_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Sem mudança de RLS: family_members já tem a política por parish_id, e o
-- cadastro feito pela secretaria nasce dentro do mesmo tenant.
--
-- Uma consequência importante de responsible_user_id virar opcional: quem
-- é cadastrado pela secretaria NÃO tem linha em family_member_guardians, e
-- é justamente isso que impede o registro de aparecer em "Minha família" de
-- alguém — listMyFamilyMembers filtra por guardians. O acesso do fiel
-- continua vindo de guardião, nunca de responsible_user_id.
