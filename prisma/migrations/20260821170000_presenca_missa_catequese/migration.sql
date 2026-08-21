-- CreateTable
CREATE TABLE "catechism_mass_attendance" (
    "id" TEXT NOT NULL,
    "parish_id" TEXT NOT NULL,
    "enrollment_id" TEXT NOT NULL,
    "celebration_id" TEXT,
    "attended_on" DATE NOT NULL,
    "noted_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catechism_mass_attendance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "catechism_mass_attendance_parish_id_enrollment_id_idx" ON "catechism_mass_attendance"("parish_id", "enrollment_id");

-- CreateIndex
CREATE UNIQUE INDEX "catechism_mass_attendance_enrollment_id_attended_on_key" ON "catechism_mass_attendance"("enrollment_id", "attended_on");

-- AddForeignKey
ALTER TABLE "catechism_mass_attendance" ADD CONSTRAINT "catechism_mass_attendance_parish_id_fkey" FOREIGN KEY ("parish_id") REFERENCES "parishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catechism_mass_attendance" ADD CONSTRAINT "catechism_mass_attendance_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "catechism_enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catechism_mass_attendance" ADD CONSTRAINT "catechism_mass_attendance_celebration_id_fkey" FOREIGN KEY ("celebration_id") REFERENCES "celebrations"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Row-Level Security: mesma política por parish_id das demais tabelas de
-- conteúdo da paróquia.
ALTER TABLE catechism_mass_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE catechism_mass_attendance FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON catechism_mass_attendance
  USING (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  )
  WITH CHECK (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  );
