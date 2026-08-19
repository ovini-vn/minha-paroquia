-- Row-Level Security para isolamento multi-paróquia (defesa em profundidade).
--
-- Este arquivo é a referência do que entrou na migration
-- "row_level_security" (prisma/migrations/*_row_level_security/migration.sql).
-- Se o schema for resetado do zero, o passo é o mesmo descrito no README:
-- gerar a migration com --create-only e colar este conteúdo nela.
--
-- Por quê sem ::uuid: os ids são gerados como uuid() no Prisma mas a coluna
-- é TEXT no Postgres (Prisma não usa o tipo nativo uuid por padrão) — cast
-- para ::uuid dava erro "operator does not exist: text = uuid".
--
-- Por quê FORCE ROW LEVEL SECURITY: sem isso, o dono da tabela (o próprio
-- usuário de conexão do Prisma) ignora as políticas por padrão no Postgres.
--
-- Três variáveis de sessão, setadas por transação em
-- src/server/db/tenant-context.ts, cobrem os três padrões de acesso reais:
--   app.current_parish_id     -> withTenantContext()        (caso comum)
--   app.current_user_id       -> withOwnMembershipLookup()  (resolver sessão)
--   app.lookup_invitation_code -> withInvitationCodeLookup() (convite público)
--   app.bypass_rls             -> withPlatformContext()      (admin da plataforma,
--                                  não usado por nenhuma tela nesta fase)
-- Nenhuma setada => current_setting(..., true) retorna NULL => comparação
-- falha fechada (nenhuma linha visível). Default deny.

ALTER TABLE parish_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE parish_memberships FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON parish_memberships
  USING (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR user_id = NULLIF(current_setting('app.current_user_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  )
  WITH CHECK (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON invitations
  USING (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR code = NULLIF(current_setting('app.lookup_invitation_code', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  )
  WITH CHECK (
    parish_id = NULLIF(current_setting('app.current_parish_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  );

-- Um vínculo ativo por usuário (decisão #1 de docs/FUNDACAO.md). Índice
-- parcial porque Prisma não expressa unique constraints condicionais.
CREATE UNIQUE INDEX one_active_membership_per_user
  ON parish_memberships (user_id)
  WHERE status = 'active';

-- Fatia 2 (Comunidade: sacerdotes e agenda). Sem contexto de leitura
-- pública/pré-sessão aqui — só o caso comum + bypass de plataforma.
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

-- Fatia 3 (Palavra do Padre).
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

-- Fatia 4 (Atendimento pastoral).
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

-- Fatia 5 (Servir).
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

-- Fatia 6 (Minha Caminhada). "Fiel só vê a própria reflexão" é regra de
-- aplicação (não de RLS) — ver src/server/modules/caminhada/service.ts.
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
