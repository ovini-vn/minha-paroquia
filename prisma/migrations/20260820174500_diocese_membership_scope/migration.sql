-- Refina a política de diocese_memberships.
--
-- A versão anterior só permitia ESCRITA com bypass total do RLS, o que
-- obrigaria a administração de diocese a rodar em withPlatformContext —
-- onde um erro de autorização vira exposição do banco inteiro.
--
-- Agora existe um contexto de diocese (app.current_diocese_id, ver
-- withDioceseContext em src/server/db/tenant-context.ts): a operação fica
-- amarrada à diocese em contexto, então mesmo um erro de programação não
-- alcança o vínculo de outra diocese. A leitura do próprio vínculo por
-- user_id continua, é o que permite montar a sessão antes de haver contexto.
DROP POLICY tenant_isolation ON diocese_memberships;

CREATE POLICY tenant_isolation ON diocese_memberships
  USING (
    user_id = NULLIF(current_setting('app.current_user_id', true), '')
    OR diocese_id = NULLIF(current_setting('app.current_diocese_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  )
  WITH CHECK (
    diocese_id = NULLIF(current_setting('app.current_diocese_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  );
