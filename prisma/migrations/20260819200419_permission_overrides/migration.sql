-- CreateTable
CREATE TABLE "permission_overrides" (
    "id" TEXT NOT NULL,
    "parish_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "permission_code" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "granted_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permission_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "permission_overrides_parish_id_idx" ON "permission_overrides"("parish_id");

-- CreateIndex
CREATE UNIQUE INDEX "permission_overrides_user_id_permission_code_key" ON "permission_overrides"("user_id", "permission_code");

-- AddForeignKey
ALTER TABLE "permission_overrides" ADD CONSTRAINT "permission_overrides_parish_id_fkey" FOREIGN KEY ("parish_id") REFERENCES "parishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permission_overrides" ADD CONSTRAINT "permission_overrides_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permission_overrides" ADD CONSTRAINT "permission_overrides_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
