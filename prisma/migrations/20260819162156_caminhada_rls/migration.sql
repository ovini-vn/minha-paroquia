-- RLS para mass_participations, sacraments e confession_logs (Minha
-- Caminhada). Mesmo padrão simples das outras tabelas: só o caso comum
-- (current_parish_id) mais o bypass de plataforma. A privacidade
-- "fiel só vê a própria reflexão" é garantida na camada de serviço
-- (src/server/modules/caminhada/service.ts), não aqui — RLS só cuida do
-- isolamento entre paróquias.

ALTER TABLE mass_participations ENABLE ROW LEVEL SECURITY;
ALTER TABLE mass_participations FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON mass_participations
  USING (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  )
  WITH CHECK (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE sacraments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sacraments FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON sacraments
  USING (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  )
  WITH CHECK (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE confession_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE confession_logs FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON confession_logs
  USING (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  )
  WITH CHECK (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  );
