import { prisma } from "@/server/db/prisma";
import { ValidationError } from "@/server/shared/errors";
import { novenaPorSlug } from "@/lib/oracoes/novenas";

/**
 * O andamento das novenas de cada pessoa.
 *
 * Sem contexto de paróquia, de propósito: a tabela é da CONTA (ver o
 * comentário do modelo em schema.prisma), como as preferências de
 * notificação. A proteção aqui é o `userId` em TODA consulta — ele vem
 * sempre da sessão, nunca do formulário.
 */

export type AndamentoDaNovena = {
  novena: string;
  diasRezados: number;
  /** O próximo dia a rezar, de 1 a 9; null quando a novena terminou. */
  proximoDia: number | null;
  ultimoDiaEm: Date | null;
  concluidaEm: Date | null;
};

function comoAndamento(linha: {
  novena: string;
  diasRezados: number;
  ultimoDiaEm: Date | null;
  concluidaEm: Date | null;
}): AndamentoDaNovena {
  return {
    novena: linha.novena,
    diasRezados: linha.diasRezados,
    proximoDia: linha.diasRezados >= 9 ? null : linha.diasRezados + 1,
    ultimoDiaEm: linha.ultimoDiaEm,
    concluidaEm: linha.concluidaEm,
  };
}

function exigirNovena(slug: string) {
  const novena = novenaPorSlug(slug);
  if (!novena) throw new ValidationError("Novena não encontrada.");
  return novena;
}

export async function listarAndamentosDasNovenas(userId: string): Promise<AndamentoDaNovena[]> {
  const linhas = await prisma.novenaAndamento.findMany({ where: { userId } });
  return linhas.map(comoAndamento);
}

/** Quem nunca começou recebe o andamento de quem está no dia 1 — sem criar linha. */
export async function obterAndamentoDaNovena(userId: string, slug: string): Promise<AndamentoDaNovena> {
  exigirNovena(slug);
  const linha = await prisma.novenaAndamento.findUnique({
    where: { userId_novena: { userId, novena: slug } },
  });
  return linha
    ? comoAndamento(linha)
    : { novena: slug, diasRezados: 0, proximoDia: 1, ultimoDiaEm: null, concluidaEm: null };
}

/**
 * Marca um dia como rezado.
 *
 * Só aceita o PRÓXIMO dia. Rezar de novo um dia já rezado não faz nada e
 * não é erro — quem abre o dia 3 outra vez para reler não deve ver
 * mensagem de problema. Pular dia é recusado: a novena são nove dias em
 * sequência, e é a tela que oferece sempre o dia certo.
 *
 * Não exige um dia de calendário entre um e outro. O costume é um por dia,
 * e a tela diz isso; mas quem perdeu um dia e quer recuperar não precisa
 * de um aplicativo mandando esperar.
 */
export async function marcarDiaRezado(
  userId: string,
  slug: string,
  dia: number,
): Promise<AndamentoDaNovena> {
  exigirNovena(slug);
  if (!Number.isInteger(dia) || dia < 1 || dia > 9) {
    throw new ValidationError("Dia da novena inválido.");
  }

  const atual = await obterAndamentoDaNovena(userId, slug);
  if (dia <= atual.diasRezados) return atual;
  if (dia !== atual.diasRezados + 1) {
    throw new ValidationError(`Reze antes o dia ${atual.diasRezados + 1} da novena.`);
  }

  const agora = new Date();
  const linha = await prisma.novenaAndamento.upsert({
    where: { userId_novena: { userId, novena: slug } },
    create: {
      userId,
      novena: slug,
      diasRezados: dia,
      ultimoDiaEm: agora,
      concluidaEm: dia === 9 ? agora : null,
    },
    update: {
      diasRezados: dia,
      ultimoDiaEm: agora,
      concluidaEm: dia === 9 ? agora : null,
    },
  });
  return comoAndamento(linha);
}

/** Volta ao dia 1, reaproveitando a linha. */
export async function recomecarNovena(userId: string, slug: string): Promise<AndamentoDaNovena> {
  exigirNovena(slug);
  const agora = new Date();
  const linha = await prisma.novenaAndamento.upsert({
    where: { userId_novena: { userId, novena: slug } },
    create: { userId, novena: slug, diasRezados: 0, iniciadaEm: agora },
    update: { diasRezados: 0, ultimoDiaEm: null, concluidaEm: null, iniciadaEm: agora },
  });
  return comoAndamento(linha);
}
