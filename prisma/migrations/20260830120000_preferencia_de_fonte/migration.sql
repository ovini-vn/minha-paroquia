-- A família da letra como preferência de quem usa, ao lado do tamanho e do
-- tema. `inter` é o padrão e vale para todo mundo que já existe: a coluna
-- nasce NOT NULL com DEFAULT, então nenhuma linha precisa ser tocada e
-- ninguém vê a própria letra mudar sozinha.
CREATE TYPE "FontFamily" AS ENUM ('inter', 'atkinson', 'lexend');

ALTER TABLE "users" ADD COLUMN "font_family" "FontFamily" NOT NULL DEFAULT 'inter';
