import { brasiliaParts, diaEmBrasilia } from "@/lib/brasilia";

/**
 * Quando o lançamento do conteúdo de um encontro está atrasado.
 *
 * A catequista pediu o aviso, e a razão é prática: o conteúdo é lançado
 * depois do encontro, no fim do dia ou na semana seguinte, e o que não é
 * lançado na hora costuma não ser lançado nunca. Sem um aviso, a coordenação
 * só descobre o buraco no fim do ano, quando ninguém mais lembra o que foi
 * dado.
 *
 * Duas situações, e a diferença entre elas importa:
 *
 * PENDENTE é o encontro que já aconteceu e ainda não teve conteúdo lançado.
 * Não é falha de ninguém: o encontro acabou hoje à noite e a catequista
 * lança amanhã.
 *
 * ATRASADO é o pendente que passou de uma semana. A catequese é semanal —
 * quando o encontro seguinte chega e o anterior continua em branco, a
 * chance de alguém lembrar já caiu muito. Sete dias é o ponto em que o
 * lembrete deixa de ser cobrança e vira socorro.
 *
 * O corte é em DIAS DE CALENDÁRIO de Brasília, não em horas. Um encontro de
 * sábado à noite e outro de domingo de manhã não podem ter idades diferentes
 * por causa do relógio.
 */
export const DIAS_ATE_ATRASAR = 7;

export type EncontroParaConferir = {
  id: string;
  /** O dia do encontro. */
  date: Date;
  /** O tema do itinerário, quando houve. */
  itinerarioTemaId?: string | null;
  /** O que foi dado, em texto livre. */
  topic?: string | null;
};

export type SituacaoDoLancamento = "em_dia" | "pendente" | "atrasado";

/** Um encontro tem conteúdo se apontou um tema OU se alguém escreveu algo. */
export function temConteudo(encontro: EncontroParaConferir): boolean {
  return Boolean(encontro.itinerarioTemaId) || Boolean(encontro.topic?.trim());
}

/** Dias inteiros de calendário entre dois instantes, no fuso de Brasília. */
export function diasDeDiferenca(de: Date, ate: Date): number {
  const a = brasiliaParts(de);
  const b = brasiliaParts(ate);
  const emDias = (p: { year: number; month: number; day: number }) =>
    Math.floor(Date.UTC(p.year, p.month, p.day) / 86_400_000);
  return emDias(b) - emDias(a);
}

/**
 * A situação de UM encontro.
 *
 * Encontro futuro nunca é pendente: ainda não aconteceu, e cobrar conteúdo
 * de aula que não foi dada seria ruído que ensina a ignorar o aviso.
 */
export function situacaoDoEncontro(
  encontro: EncontroParaConferir,
  agora: Date,
): SituacaoDoLancamento {
  if (temConteudo(encontro)) return "em_dia";

  const dias = diasDeDiferenca(encontro.date, agora);
  if (dias < 0) return "em_dia";
  return dias >= DIAS_ATE_ATRASAR ? "atrasado" : "pendente";
}

export type ResumoDoLancamento = {
  pendentes: number;
  atrasados: number;
  /** O encontro sem conteúdo há mais tempo — é dele que o aviso fala. */
  maisAntigo: { id: string; date: Date; dias: number } | null;
};

/**
 * O retrato de uma turma inteira, para o aviso na tela.
 *
 * Devolve o encontro mais antigo sem lançamento porque um aviso que diz "3
 * encontros pendentes" manda a pessoa procurar quais. Dizendo "o de 12 de
 * agosto está há 18 dias sem conteúdo", ela sabe onde tocar.
 */
export function resumirLancamento(
  encontros: EncontroParaConferir[],
  agora: Date,
): ResumoDoLancamento {
  let pendentes = 0;
  let atrasados = 0;
  let maisAntigo: ResumoDoLancamento["maisAntigo"] = null;

  for (const encontro of encontros) {
    const situacao = situacaoDoEncontro(encontro, agora);
    if (situacao === "em_dia") continue;

    if (situacao === "atrasado") atrasados += 1;
    else pendentes += 1;

    const dias = diasDeDiferenca(encontro.date, agora);
    if (!maisAntigo || dias > maisAntigo.dias) {
      maisAntigo = { id: encontro.id, date: encontro.date, dias };
    }
  }

  return { pendentes, atrasados, maisAntigo };
}

/** "12 de agosto", para o aviso citar o encontro pelo dia. */
export function diaDoEncontro(data: Date): string {
  return diaEmBrasilia(data);
}
