-- RLS para liturgical_availability e liturgical_schedules. Mesmo padrão
-- simples das outras tabelas: só o caso comum (current_parish_id) mais o
-- bypass de plataforma.

ALTER TABLE liturgical_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE liturgical_availability FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON liturgical_availability
  USING (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  )
  WITH CHECK (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE liturgical_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE liturgical_schedules FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON liturgical_schedules
  USING (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  )
  WITH CHECK (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  );
