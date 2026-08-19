-- RLS para volunteer_profiles, service_opportunities e service_interests
-- (Servir). Mesmo padrão simples das outras tabelas desta etapa: só o caso
-- comum (current_parish_id) mais o bypass de plataforma.

ALTER TABLE volunteer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteer_profiles FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON volunteer_profiles
  USING (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  )
  WITH CHECK (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE service_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_opportunities FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON service_opportunities
  USING (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  )
  WITH CHECK (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE service_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_interests FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON service_interests
  USING (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  )
  WITH CHECK (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  );
