-- CreateEnum
CREATE TYPE "PostMediaType" AS ENUM ('texto', 'audio', 'video');

-- CreateTable
CREATE TABLE "posts" (
    "id" TEXT NOT NULL,
    "parish_id" TEXT NOT NULL,
    "priest_profile_id" TEXT NOT NULL,
    "mediaType" "PostMediaType" NOT NULL DEFAULT 'texto',
    "content_text" TEXT,
    "media_url" TEXT,
    "published_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "posts_parish_id_published_at_idx" ON "posts"("parish_id", "published_at");

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_parish_id_fkey" FOREIGN KEY ("parish_id") REFERENCES "parishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_priest_profile_id_fkey" FOREIGN KEY ("priest_profile_id") REFERENCES "priest_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
