-- RLS para posts (Palavra do Padre). Mesmo padrão simples das outras
-- tabelas desta fatia (celebrations/events/priest_profiles): só o caso
-- comum, current_parish_id, mais o bypass de plataforma.

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON posts
  USING (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  )
  WITH CHECK (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  );
