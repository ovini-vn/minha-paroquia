-- RLS para priest_availability e appointments (Atendimento pastoral). Mesmo
-- padrão simples das outras tabelas: só o caso comum (current_parish_id)
-- mais o bypass de plataforma.

ALTER TABLE priest_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE priest_availability FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON priest_availability
  USING (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  )
  WITH CHECK (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON appointments
  USING (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  )
  WITH CHECK (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  );
