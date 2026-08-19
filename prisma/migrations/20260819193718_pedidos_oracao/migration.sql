-- CreateEnum
CREATE TYPE "PrayerRequestVisibility" AS ENUM ('padre', 'comunidade');

-- CreateTable
CREATE TABLE "prayer_requests" (
    "id" TEXT NOT NULL,
    "parish_id" TEXT NOT NULL,
    "requester_user_id" TEXT NOT NULL,
    "content_text" TEXT NOT NULL,
    "visibility" "PrayerRequestVisibility" NOT NULL DEFAULT 'padre',
    "is_anonymous" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prayer_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "prayer_requests_parish_id_visibility_idx" ON "prayer_requests"("parish_id", "visibility");

-- AddForeignKey
ALTER TABLE "prayer_requests" ADD CONSTRAINT "prayer_requests_parish_id_fkey" FOREIGN KEY ("parish_id") REFERENCES "parishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prayer_requests" ADD CONSTRAINT "prayer_requests_requester_user_id_fkey" FOREIGN KEY ("requester_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
