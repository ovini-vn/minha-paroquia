-- Separada da anterior de propósito: o Postgres recusa usar um valor de
-- enum na mesma transação que o adiciona ("unsafe use of new value").
--
-- O índice de "um vínculo por pessoa" passa a cobrir o pendente também,
-- senão alguém teria uma paróquia pendente e outra ativa ao mesmo tempo.
DROP INDEX IF EXISTS one_active_membership_per_user;

CREATE UNIQUE INDEX one_active_membership_per_user
  ON parish_memberships (user_id)
  WHERE status IN ('active', 'pendente');
