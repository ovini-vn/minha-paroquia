-- A Bíblia, na tradução do Pe. Manuel de Matos Soares (1880-1950), em
-- domínio público no Brasil desde 2021 (Lei 9.610/98, art. 41: 70 anos
-- contados de 1º de janeiro do ano seguinte ao da morte do autor).
--
-- Tabela GLOBAL de propósito: sem parish_id, sem RLS. A Escritura é a mesma
-- em toda paróquia, não é dado de ninguém e não há o que isolar entre
-- comunidades. Mesma natureza de roles e permissions.
--
-- A chave primária é o endereço do versículo. Além de ser como o texto é
-- citado no mundo real, ela torna a importação idempotente: rodar duas
-- vezes não duplica nada.
CREATE TABLE "bible_verses" (
    "book" TEXT NOT NULL,
    "chapter" INTEGER NOT NULL,
    "number" INTEGER NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "bible_verses_pkey" PRIMARY KEY ("book","chapter","number")
);

-- Ler um capítulo inteiro é a consulta de longe mais comum.
CREATE INDEX "bible_verses_book_chapter_idx" ON "bible_verses"("book", "chapter");
