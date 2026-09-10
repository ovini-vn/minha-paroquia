-- "Luz de Vitral": um tema e uma tipografia novos, os dois OPCIONAIS.
--
-- Nada muda para quem já usa o app: os padrões continuam `default` e
-- `inter`, e ninguém acorda com a tela trocada.
--
-- Dois eixos separados de propósito. O tema é atmosfera; a fonte é
-- legibilidade, e quem escolheu Atkinson pediu para enxergar melhor —
-- um tema que trocasse a letra por baixo desfaria essa escolha.
--
-- `ADD VALUE` não é usado por nenhuma linha aqui, só declarado: Postgres
-- proíbe usar um valor de enum na mesma transação em que ele nasce.
ALTER TYPE "ThemePreference" ADD VALUE IF NOT EXISTS 'vitral';
ALTER TYPE "FontFamily" ADD VALUE IF NOT EXISTS 'instrument';
