-- CreateTable
CREATE TABLE "family_members" (
    "id" TEXT NOT NULL,
    "parish_id" TEXT NOT NULL,
    "responsible_user_id" TEXT NOT NULL,
    "linked_user_id" TEXT,
    "full_name" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "birth_date" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "family_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catechism_groups" (
    "id" TEXT NOT NULL,
    "parish_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "catechist_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catechism_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catechism_enrollments" (
    "id" TEXT NOT NULL,
    "parish_id" TEXT NOT NULL,
    "catechism_group_id" TEXT NOT NULL,
    "family_member_id" TEXT NOT NULL,
    "enrolled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catechism_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catechism_sessions" (
    "id" TEXT NOT NULL,
    "parish_id" TEXT NOT NULL,
    "catechism_group_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "topic" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catechism_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catechism_attendance" (
    "id" TEXT NOT NULL,
    "parish_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "enrollment_id" TEXT NOT NULL,
    "present" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catechism_attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catechism_rites" (
    "id" TEXT NOT NULL,
    "parish_id" TEXT NOT NULL,
    "enrollment_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scheduled_at" DATE,
    "completed_at" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catechism_rites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "family_members_parish_id_responsible_user_id_idx" ON "family_members"("parish_id", "responsible_user_id");

-- CreateIndex
CREATE INDEX "catechism_groups_parish_id_idx" ON "catechism_groups"("parish_id");

-- CreateIndex
CREATE INDEX "catechism_enrollments_parish_id_idx" ON "catechism_enrollments"("parish_id");

-- CreateIndex
CREATE UNIQUE INDEX "catechism_enrollments_catechism_group_id_family_member_id_key" ON "catechism_enrollments"("catechism_group_id", "family_member_id");

-- CreateIndex
CREATE INDEX "catechism_sessions_parish_id_catechism_group_id_idx" ON "catechism_sessions"("parish_id", "catechism_group_id");

-- CreateIndex
CREATE INDEX "catechism_attendance_parish_id_idx" ON "catechism_attendance"("parish_id");

-- CreateIndex
CREATE UNIQUE INDEX "catechism_attendance_session_id_enrollment_id_key" ON "catechism_attendance"("session_id", "enrollment_id");

-- CreateIndex
CREATE INDEX "catechism_rites_parish_id_idx" ON "catechism_rites"("parish_id");

-- AddForeignKey
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_parish_id_fkey" FOREIGN KEY ("parish_id") REFERENCES "parishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_responsible_user_id_fkey" FOREIGN KEY ("responsible_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_linked_user_id_fkey" FOREIGN KEY ("linked_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catechism_groups" ADD CONSTRAINT "catechism_groups_parish_id_fkey" FOREIGN KEY ("parish_id") REFERENCES "parishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catechism_groups" ADD CONSTRAINT "catechism_groups_catechist_user_id_fkey" FOREIGN KEY ("catechist_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catechism_enrollments" ADD CONSTRAINT "catechism_enrollments_parish_id_fkey" FOREIGN KEY ("parish_id") REFERENCES "parishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catechism_enrollments" ADD CONSTRAINT "catechism_enrollments_catechism_group_id_fkey" FOREIGN KEY ("catechism_group_id") REFERENCES "catechism_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catechism_enrollments" ADD CONSTRAINT "catechism_enrollments_family_member_id_fkey" FOREIGN KEY ("family_member_id") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catechism_sessions" ADD CONSTRAINT "catechism_sessions_parish_id_fkey" FOREIGN KEY ("parish_id") REFERENCES "parishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catechism_sessions" ADD CONSTRAINT "catechism_sessions_catechism_group_id_fkey" FOREIGN KEY ("catechism_group_id") REFERENCES "catechism_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catechism_attendance" ADD CONSTRAINT "catechism_attendance_parish_id_fkey" FOREIGN KEY ("parish_id") REFERENCES "parishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catechism_attendance" ADD CONSTRAINT "catechism_attendance_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "catechism_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catechism_attendance" ADD CONSTRAINT "catechism_attendance_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "catechism_enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catechism_rites" ADD CONSTRAINT "catechism_rites_parish_id_fkey" FOREIGN KEY ("parish_id") REFERENCES "parishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catechism_rites" ADD CONSTRAINT "catechism_rites_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "catechism_enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
