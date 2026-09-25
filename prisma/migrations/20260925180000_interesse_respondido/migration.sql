-- Quando a coordenação respondeu a quem se ofereceu para uma pastoral.
-- A tabela já tem RLS; coluna nova herda a política.
ALTER TABLE "pastoral_group_interests" ADD COLUMN "respondido_em" TIMESTAMP(3);

-- Os já respondidos antes desta coluna ficam sem data: melhor um buraco
-- honesto na medida do que uma data inventada.
