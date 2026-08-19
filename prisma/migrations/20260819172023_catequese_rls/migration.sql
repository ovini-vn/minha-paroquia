-- RLS para family_members e as 5 tabelas de catequese. Mesmo padrão simples
-- das outras tabelas desta etapa: só o caso comum (current_parish_id) mais
-- o bypass de plataforma.

ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON family_members
  USING (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  )
  WITH CHECK (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE catechism_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE catechism_groups FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON catechism_groups
  USING (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  )
  WITH CHECK (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE catechism_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE catechism_enrollments FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON catechism_enrollments
  USING (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  )
  WITH CHECK (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE catechism_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE catechism_sessions FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON catechism_sessions
  USING (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  )
  WITH CHECK (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE catechism_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE catechism_attendance FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON catechism_attendance
  USING (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  )
  WITH CHECK (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE catechism_rites ENABLE ROW LEVEL SECURITY;
ALTER TABLE catechism_rites FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON catechism_rites
  USING (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  )
  WITH CHECK (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  );
