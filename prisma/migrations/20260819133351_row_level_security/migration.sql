-- Row-Level Security para isolamento multi-paróquia (defesa em profundidade).
-- Fonte: prisma/rls-policies.sql — ver esse arquivo para o racional completo.

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
