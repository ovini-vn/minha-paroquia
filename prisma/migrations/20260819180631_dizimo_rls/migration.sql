ALTER TABLE tithe_participations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tithe_participations FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON tithe_participations
  USING (parish_id = NULLIF(current_setting('app.current_parish_id', true), '') OR current_setting('app.bypass_rls', true) = 'true')
  WITH CHECK (parish_id = NULLIF(current_setting('app.current_parish_id', true), '') OR current_setting('app.bypass_rls', true) = 'true');
