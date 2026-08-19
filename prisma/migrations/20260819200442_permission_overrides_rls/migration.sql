ALTER TABLE permission_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission_overrides FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON permission_overrides
  USING (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR user_id = NULLIF(current_setting('app.current_user_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  )
  WITH CHECK (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  );
