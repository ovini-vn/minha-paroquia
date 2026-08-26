import "server-only";
import { prisma } from "@/server/db/prisma";
import { findBook, type BibleBook } from "@/lib/bible-books";

/**
 * A Escritura: tabela global, sem contexto de paróquia.
 *
 * É o único módulo do app que lê direto pelo `prisma` em vez de
 * `withTenantContext`. Não é descuido: `bible_verses` não tem parish_id e
 * não tem RLS, porque a Bíblia é a mesma em toda comunidade e não é dado de
 * ninguém. Isolar o que é igual para todos só criaria cerimônia.
 */

export const TRADUCAO = {
  nome: "Tradução do Pe. Matos Soares",
  detalhe: "Domínio público",
};

export type Versiculo = { number: number; text: string };

/** Um capítulo inteiro, em ordem. Vazio quando o capítulo não existe. */
export async function lerCapitulo(slug: string, capitulo: number): Promise<Versiculo[]> {
  const livro = findBook(slug);
  if (!livro || capitulo < 1 || capitulo > livro.chapters) return [];

  return prisma.bibleVerse.findMany({
    where: { book: slug, chapter: capitulo },
    orderBy: { number: "asc" },
    select: { number: true, text: true },
  });
}

export type Achado = {
  livro: BibleBook;
  chapter: number;
  number: number;
  text: string;
};

const LIMITE_DA_BUSCA = 40;

/**
 * Procura uma expressão no texto.
 *
 * `contains` sem índice varre as 35 mil linhas — e é barato justamente
 * porque são 35 mil, não 35 milhões. Trocar isso por busca de texto
 * completo do Postgres seria mais rápido e bem menos previsível: acento,
 * radical e palavra vazia passam a interferir, e quem procura "no princípio
 * criou" quer aquilo, não algo parecido.
 *
 * O limite existe para a tela não virar uma lista de mil linhas: quem
 * procura "Deus" precisa refinar, não rolar.
 */
export async function buscar(termo: string): Promise<{ achados: Achado[]; truncado: boolean }> {
  const limpo = termo.trim();
  // Menos de três letras acha tudo e não ajuda ninguém.
  if (limpo.length < 3) return { achados: [], truncado: false };

  const linhas = await prisma.bibleVerse.findMany({
    where: { text: { contains: limpo, mode: "insensitive" } },
    take: LIMITE_DA_BUSCA + 1,
    select: { book: true, chapter: true, number: true, text: true },
  });

  const truncado = linhas.length > LIMITE_DA_BUSCA;

  const achados = linhas.slice(0, LIMITE_DA_BUSCA).flatMap((linha) => {
    const livro = findBook(linha.book);
    // Um versículo cujo livro sumiu do catálogo não tem como ser exibido
    // nem endereçado; melhor omitir do que mostrar "undefined 3:16".
    return livro ? [{ livro, chapter: linha.chapter, number: linha.number, text: linha.text }] : [];
  });

  return { achados, truncado };
}

/** Quantos versículos existem — usado para saber se a carga já foi feita. */
export function contarVersiculos(): Promise<number> {
  return prisma.bibleVerse.count();
}
