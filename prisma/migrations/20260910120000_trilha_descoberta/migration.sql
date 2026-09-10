-- A categoria da trilha que ensina o aplicativo.
--
-- Categoria própria, e não "pastoral": é a única que a pessoa pode querer
-- desligar sem perder nada da vida da paróquia. Sem isso, calar as dicas
-- calaria junto os avisos de missa.
--
-- `ADD VALUE` não é usado por nenhuma linha nesta migration — só declarado.
-- Postgres proíbe usar um valor de enum na mesma transação em que ele nasce,
-- e é por isso que a linha abaixo está sozinha aqui.
ALTER TYPE "NotificationCategory" ADD VALUE IF NOT EXISTS 'descoberta';
