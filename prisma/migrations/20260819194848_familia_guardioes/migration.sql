-- CreateTable
CREATE TABLE "family_member_guardians" (
    "id" TEXT NOT NULL,
    "parish_id" TEXT NOT NULL,
    "family_member_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "family_member_guardians_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "family_member_guardians_parish_id_idx" ON "family_member_guardians"("parish_id");

-- CreateIndex
CREATE INDEX "family_member_guardians_user_id_idx" ON "family_member_guardians"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "family_member_guardians_family_member_id_user_id_key" ON "family_member_guardians"("family_member_id", "user_id");

-- AddForeignKey
ALTER TABLE "family_member_guardians" ADD CONSTRAINT "family_member_guardians_parish_id_fkey" FOREIGN KEY ("parish_id") REFERENCES "parishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_member_guardians" ADD CONSTRAINT "family_member_guardians_family_member_id_fkey" FOREIGN KEY ("family_member_id") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_member_guardians" ADD CONSTRAINT "family_member_guardians_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
