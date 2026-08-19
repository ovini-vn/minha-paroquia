-- RLS para as tabelas novas desta fatia (sacerdotes e agenda). Sem os
-- contextos especiais de invitations (não há leitura pública/pré-sessão
-- destas tabelas) — só o caso comum, current_parish_id, mais o bypass de
-- plataforma. Ver prisma/rls-policies.sql para o racional completo do
-- padrão.

ALTER TABLE priest_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE priest_profiles FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON priest_profiles
  USING (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  )
  WITH CHECK (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE celebrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE celebrations FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON celebrations
  USING (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  )
  WITH CHECK (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE events FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON events
  USING (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  )
  WITH CHECK (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  );
