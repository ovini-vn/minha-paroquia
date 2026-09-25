import "server-only";
import { withTenantContext } from "@/server/db/tenant-context";
import { NOVENAS } from "@/lib/oracoes/novenas";
import { atalhosPara, casa, type Atalho } from "@/lib/busca";

export type ResultadoDaBusca = {
  atalhos: Atalho[];
  pastorais: { id: string; nome: string; descricao: string | null }[];
  avisos: { id: string; titulo: string; quando: Date }[];
  eventos: { id: string; titulo: string; quando: Date; local: string | null }[];
  novenas: { slug: string; nome: string; descricao: string }[];
};

/**
 * Busca no que a paróquia publicou: pastorais, avisos, eventos que vêm aí
 * e as orações do app.
 *
 * O filtro é feito aqui, e não no banco, por causa do acento: "confissao"
 * precisa achar "Confissão", e o Postgres só faz isso com a extensão
 * unaccent. O volume de uma paróquia (dezenas de pastorais, centenas de
 * avisos) cabe com folga numa leitura só.
 */
export async function buscar(parishId: string, termo: string, agora = new Date()): Promise<ResultadoDaBusca> {
  const limpo = termo.trim();
  if (limpo.length < 2) return { atalhos: [], pastorais: [], avisos: [], eventos: [], novenas: [] };

  const [grupos, avisos, eventos] = await withTenantContext(parishId, (tx) =>
    Promise.all([
      tx.pastoralGroup.findMany({
        where: { parishId, status: "ativa" },
        select: { id: true, name: true, description: true, meetsWhere: true },
      }),
      tx.aviso.findMany({
        where: { parishId, status: "published" },
        orderBy: { createdAt: "desc" },
        take: 300,
        select: { id: true, title: true, body: true, createdAt: true },
      }),
      tx.event.findMany({
        where: { parishId, status: "published", startsAt: { gte: agora } },
        orderBy: { startsAt: "asc" },
        take: 200,
        select: { id: true, title: true, description: true, location: true, startsAt: true },
      }),
    ]),
  );

  return {
    atalhos: atalhosPara(limpo),
    pastorais: grupos
      .filter((g) => casa(limpo, g.name, g.description, g.meetsWhere))
      .slice(0, 10)
      .map((g) => ({ id: g.id, nome: g.name, descricao: g.description })),
    avisos: avisos
      .filter((a) => casa(limpo, a.title, a.body))
      .slice(0, 10)
      .map((a) => ({ id: a.id, titulo: a.title, quando: a.createdAt })),
    eventos: eventos
      .filter((e) => casa(limpo, e.title, e.description, e.location))
      .slice(0, 10)
      .map((e) => ({ id: e.id, titulo: e.title, quando: e.startsAt, local: e.location })),
    novenas: NOVENAS.filter((n) => casa(limpo, n.nome, n.aQuem, n.descricao)).map((n) => ({
      slug: n.slug,
      nome: n.nome,
      descricao: n.descricao,
    })),
  };
}
