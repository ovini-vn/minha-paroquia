import "server-only";
import type { SacramentType } from "@prisma/client";
import { withTenantContext } from "@/server/db/tenant-context";

/**
 * Os relatórios que a secretaria leva à reunião do conselho e à diocese.
 *
 * Cada um é uma TABELA — cabeçalho e linhas de texto já formatado — para
 * que a mesma fonte sirva à tela, à folha impressa e à planilha (CSV). Um
 * relatório que dissesse uma coisa na tela e outra na planilha seria pior
 * do que nenhum.
 */

export type Tabela = {
  titulo: string;
  descricao: string;
  colunas: string[];
  linhas: string[][];
  /** Uma linha final de soma, quando faz sentido somar. */
  total?: string[];
};

export const RELATORIOS = {
  pastorais: "Participação por pastoral",
  sacramentos: "Sacramentos do ano",
  catequese: "Frequência da catequese",
  contribuicoes: "Contribuições por finalidade",
} as const;
export type Relatorio = keyof typeof RELATORIOS;

const DIA = 86_400_000;
const pct = (parte: number, todo: number) => (todo === 0 ? "—" : `${Math.round((parte / todo) * 100)}%`);

/** Números de uma pastoral nos últimos 90 dias — compartilhado com o painel do conselho. */
export type NumerosDaPastoral = {
  id: string;
  nome: string;
  membros: number;
  coordenadores: number;
  novos: number;
  encontros: number;
  presentes: number;
  marcacoes: number;
  ultimoEncontro: Date | null;
  interessesEsperando: number;
  temCoordenacao: boolean;
};

export function numerosDasPastorais(parishId: string, agora: Date): Promise<NumerosDaPastoral[]> {
  const inicio = new Date(agora.getTime() - 90 * DIA);
  return withTenantContext(parishId, async (tx) => {
    const grupos = await tx.pastoralGroup.findMany({
      where: { parishId, status: "ativa" },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        leaderName: true,
        membros: { select: { papel: true, createdAt: true } },
        encontros: {
          where: { data: { gte: inicio, lte: agora } },
          select: { data: true, presencas: { select: { presente: true } } },
        },
        interests: { where: { status: "manifestado" }, select: { id: true } },
      },
    });
    const ultimos = await tx.encontroDoGrupo.groupBy({
      by: ["groupId"],
      where: { parishId, data: { lte: agora } },
      _max: { data: true },
    });
    const ultimoPorGrupo = new Map(ultimos.map((u) => [u.groupId, u._max.data]));

    return grupos.map((g) => {
      const marcacoes = g.encontros.flatMap((e) => e.presencas);
      const coordenadores = g.membros.filter((m) => m.papel === "coordenador").length;
      return {
        id: g.id,
        nome: g.name,
        membros: g.membros.length,
        coordenadores,
        novos: g.membros.filter((m) => m.createdAt >= inicio).length,
        encontros: g.encontros.length,
        presentes: marcacoes.filter((p) => p.presente).length,
        marcacoes: marcacoes.length,
        ultimoEncontro: ultimoPorGrupo.get(g.id) ?? null,
        interessesEsperando: g.interests.length,
        temCoordenacao: coordenadores > 0 || Boolean(g.leaderName?.trim()),
      };
    });
  });
}

async function pastorais(parishId: string, agora: Date): Promise<Tabela> {
  const numeros = await numerosDasPastorais(parishId, agora);
  return {
    titulo: RELATORIOS.pastorais,
    descricao: "Pastorais e grupos ativos, com os encontros e a presença dos últimos 90 dias.",
    colunas: ["Pastoral", "Participantes", "Chegaram (90 dias)", "Encontros (90 dias)", "Presença", "Interessados esperando"],
    linhas: numeros.map((n) => [
      n.nome,
      String(n.membros),
      String(n.novos),
      String(n.encontros),
      pct(n.presentes, n.marcacoes),
      String(n.interessesEsperando),
    ]),
    total: [
      "Total",
      String(numeros.reduce((s, n) => s + n.membros, 0)),
      String(numeros.reduce((s, n) => s + n.novos, 0)),
      String(numeros.reduce((s, n) => s + n.encontros, 0)),
      pct(
        numeros.reduce((s, n) => s + n.presentes, 0),
        numeros.reduce((s, n) => s + n.marcacoes, 0),
      ),
      String(numeros.reduce((s, n) => s + n.interessesEsperando, 0)),
    ],
  };
}

const NOME_DO_SACRAMENTO: Record<SacramentType, string> = {
  batismo: "Batismo",
  primeira_eucaristia: "Primeira Eucaristia",
  crisma: "Crisma",
  matrimonio: "Matrimônio",
  outro: "Outro",
};

async function sacramentos(parishId: string, ano: number): Promise<Tabela> {
  const linhas = await withTenantContext(parishId, (tx) =>
    tx.sacrament.groupBy({
      by: ["type", "status"],
      where: { parishId, date: { gte: new Date(Date.UTC(ano, 0, 1)), lt: new Date(Date.UTC(ano + 1, 0, 1)) } },
      _count: { _all: true },
    }),
  );
  const tipos = Object.keys(NOME_DO_SACRAMENTO) as SacramentType[];
  const conta = (tipo: SacramentType, status?: "validated") =>
    linhas.filter((l) => l.type === tipo && (!status || l.status === status)).reduce((s, l) => s + l._count._all, 0);
  const presentes = tipos.filter((t) => conta(t) > 0);
  return {
    titulo: `${RELATORIOS.sacramentos} — ${ano}`,
    descricao: "Sacramentos registrados no app com data neste ano. Conferidos são os que a secretaria validou no livro.",
    colunas: ["Sacramento", "Registrados", "Conferidos pela secretaria"],
    linhas: presentes.map((t) => [NOME_DO_SACRAMENTO[t], String(conta(t)), String(conta(t, "validated"))]),
    total: [
      "Total",
      String(presentes.reduce((s, t) => s + conta(t), 0)),
      String(presentes.reduce((s, t) => s + conta(t, "validated"), 0)),
    ],
  };
}

async function catequese(parishId: string, ano: number): Promise<Tabela> {
  const turmas = await withTenantContext(parishId, (tx) =>
    tx.catechismGroup.findMany({
      where: { parishId, year: ano },
      orderBy: { name: "asc" },
      select: {
        name: true,
        catechistName: true,
        catechist: { select: { fullName: true } },
        _count: { select: { enrollments: true, sessions: true } },
        sessions: { select: { attendances: { select: { present: true } } } },
      },
    }),
  );
  return {
    titulo: `${RELATORIOS.catequese} — ${ano}`,
    descricao: "Turmas do ano, com os encontros dados e a presença marcada pelos catequistas.",
    colunas: ["Turma", "Catequista", "Catequizandos", "Encontros", "Presença"],
    linhas: turmas.map((t) => {
      const marcas = t.sessions.flatMap((s) => s.attendances);
      return [
        t.name,
        t.catechist?.fullName ?? t.catechistName ?? "—",
        String(t._count.enrollments),
        String(t._count.sessions),
        pct(marcas.filter((m) => m.present).length, marcas.length),
      ];
    }),
  };
}

const REAIS = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

async function contribuicoes(parishId: string, ano: number): Promise<Tabela> {
  const [somas, finalidades] = await withTenantContext(parishId, (tx) =>
    Promise.all([
      tx.contribuicao.groupBy({
        by: ["finalidadeId"],
        where: {
          parishId,
          cancelada: false,
          recebidaEm: { gte: new Date(Date.UTC(ano, 0, 1)), lt: new Date(Date.UTC(ano + 1, 0, 1)) },
        },
        _sum: { centavos: true },
        _count: { _all: true },
      }),
      tx.contribuicaoFinalidade.findMany({ where: { parishId }, select: { id: true, nome: true, ordem: true } }),
    ]),
  );
  const nome = new Map(finalidades.map((f) => [f.id, f]));
  const ordenadas = [...somas].sort(
    (a, b) => (nome.get(a.finalidadeId ?? "")?.ordem ?? 999) - (nome.get(b.finalidadeId ?? "")?.ordem ?? 999),
  );
  const total = somas.reduce((s, l) => s + (l._sum.centavos ?? 0), 0);
  return {
    titulo: `${RELATORIOS.contribuicoes} — ${ano}`,
    descricao: "O que a comunidade ofertou no ano, por finalidade. Contribuições canceladas ficam de fora.",
    colunas: ["Finalidade", "Contribuições", "Valor"],
    linhas: ordenadas.map((l) => [
      nome.get(l.finalidadeId ?? "")?.nome ?? "Sem finalidade",
      String(l._count._all),
      REAIS.format((l._sum.centavos ?? 0) / 100),
    ]),
    total: ["Total", String(somas.reduce((s, l) => s + l._count._all, 0)), REAIS.format(total / 100)],
  };
}

export function montarRelatorio(parishId: string, qual: Relatorio, ano: number, agora = new Date()): Promise<Tabela> {
  switch (qual) {
    case "pastorais":
      return pastorais(parishId, agora);
    case "sacramentos":
      return sacramentos(parishId, ano);
    case "catequese":
      return catequese(parishId, ano);
    case "contribuicoes":
      return contribuicoes(parishId, ano);
  }
}

/**
 * CSV que o Excel brasileiro abre certo: ponto e vírgula (a vírgula é o
 * separador decimal daqui), BOM de UTF-8 (sem ele os acentos viram lixo)
 * e aspas em volta de todo campo.
 */
export function paraCsv(t: Tabela): string {
  const campo = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const linhas = [t.colunas, ...t.linhas, ...(t.total ? [t.total] : [])];
  return "﻿" + linhas.map((l) => l.map(campo).join(";")).join("\r\n") + "\r\n";
}

/**
 * O que o conselho pastoral precisa ver numa reunião: quantos somos,
 * quantos servem, e onde a comunidade está precisando de atenção.
 */
export async function resumoDoConselho(parishId: string, agora: Date) {
  const trintaDias = new Date(agora.getTime() - 30 * DIA);
  const sessentaDias = new Date(agora.getTime() - 60 * DIA);
  const [pastorais, contagens] = await Promise.all([
    numerosDasPastorais(parishId, agora),
    withTenantContext(parishId, async (tx) => {
      const [fieis, chegaram, servindo] = await Promise.all([
        tx.parishMembership.count({ where: { parishId, status: "active" } }),
        tx.parishMembership.count({ where: { parishId, status: "active", joinedAt: { gte: trintaDias } } }),
        tx.membroDoGrupo.findMany({
          where: { parishId, group: { status: "ativa" } },
          distinct: ["userId"],
          select: { userId: true },
        }),
      ]);
      return { fieis, chegaram, servindo: servindo.length };
    }),
  ]);
  return {
    ...contagens,
    pastorais,
    semCoordenacao: pastorais.filter((p) => !p.temCoordenacao),
    paradas: pastorais.filter((p) => !p.ultimoEncontro || p.ultimoEncontro < sessentaDias),
    comInteressados: pastorais.filter((p) => p.interessesEsperando > 0),
  };
}
