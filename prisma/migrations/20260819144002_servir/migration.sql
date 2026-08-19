-- CreateEnum
CREATE TYPE "OpportunityStatus" AS ENUM ('aberta', 'encerrada');

-- CreateEnum
CREATE TYPE "InterestStatus" AS ENUM ('manifestado', 'em_contato', 'acolhido', 'declinado');

-- CreateTable
CREATE TABLE "volunteer_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "parish_id" TEXT NOT NULL,
    "has_time" BOOLEAN NOT NULL DEFAULT false,
    "time_areas" TEXT[],
    "has_talent" BOOLEAN NOT NULL DEFAULT false,
    "talents" TEXT[],
    "wants_to_serve" BOOLEAN NOT NULL DEFAULT false,
    "service_areas" TEXT[],
    "availability_note" TEXT,
    "free_text" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "volunteer_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_opportunities" (
    "id" TEXT NOT NULL,
    "parish_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "starts_at" TIMESTAMP(3),
    "status" "OpportunityStatus" NOT NULL DEFAULT 'aberta',
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_interests" (
    "id" TEXT NOT NULL,
    "opportunity_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "parish_id" TEXT NOT NULL,
    "status" "InterestStatus" NOT NULL DEFAULT 'manifestado',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_interests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "volunteer_profiles_parish_id_idx" ON "volunteer_profiles"("parish_id");

-- CreateIndex
CREATE UNIQUE INDEX "volunteer_profiles_user_id_parish_id_key" ON "volunteer_profiles"("user_id", "parish_id");

-- CreateIndex
CREATE INDEX "service_opportunities_parish_id_status_idx" ON "service_opportunities"("parish_id", "status");

-- CreateIndex
CREATE INDEX "service_interests_parish_id_idx" ON "service_interests"("parish_id");

-- CreateIndex
CREATE UNIQUE INDEX "service_interests_opportunity_id_user_id_key" ON "service_interests"("opportunity_id", "user_id");

-- AddForeignKey
ALTER TABLE "volunteer_profiles" ADD CONSTRAINT "volunteer_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "volunteer_profiles" ADD CONSTRAINT "volunteer_profiles_parish_id_fkey" FOREIGN KEY ("parish_id") REFERENCES "parishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_opportunities" ADD CONSTRAINT "service_opportunities_parish_id_fkey" FOREIGN KEY ("parish_id") REFERENCES "parishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_interests" ADD CONSTRAINT "service_interests_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "service_opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_interests" ADD CONSTRAINT "service_interests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_interests" ADD CONSTRAINT "service_interests_parish_id_fkey" FOREIGN KEY ("parish_id") REFERENCES "parishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
