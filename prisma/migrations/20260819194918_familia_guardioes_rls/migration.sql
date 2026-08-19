-- Backfill: todo family_member existente já tem um responsible_user_id,
-- mas ainda não tem a linha correspondente em family_member_guardians
-- (a tabela que a aplicação de fato consulta a partir de agora).
INSERT INTO family_member_guardians (id, parish_id, family_member_id, user_id, created_at)
SELECT gen_random_uuid(), parish_id, id, responsible_user_id, created_at
FROM family_members
ON CONFLICT DO NOTHING;

ALTER TABLE family_member_guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_member_guardians FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON family_member_guardians
  USING (parish_id = NULLIF(current_setting('app.current_parish_id', true), '') OR current_setting('app.bypass_rls', true) = 'true')
  WITH CHECK (parish_id = NULLIF(current_setting('app.current_parish_id', true), '') OR current_setting('app.bypass_rls', true) = 'true');
