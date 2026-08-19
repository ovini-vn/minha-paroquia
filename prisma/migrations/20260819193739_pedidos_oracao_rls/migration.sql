ALTER TABLE prayer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_requests FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON prayer_requests
  USING (parish_id = NULLIF(current_setting('app.current_parish_id', true), '') OR current_setting('app.bypass_rls', true) = 'true')
  WITH CHECK (parish_id = NULLIF(current_setting('app.current_parish_id', true), '') OR current_setting('app.bypass_rls', true) = 'true');
