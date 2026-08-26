/**
 * Datas que voltam todo ano: nascimento, batismo, crisma, casamento.
 *
 * A conta parece trivial e tem três armadilhas. A virada do ano — em 20 de
 * dezembro, "os próximos 30 dias" incluem janeiro. O 29 de fevereiro, que
 * não existe em três anos de cada quatro. E o fuso: a data guardada é
 * `@db.Date`, que chega como meia-noite UTC, então comparar com o "hoje" do
 * servidor em outro fuso erra o dia.
 */

export type TipoDeAniversario =
  | "nascimento"
  | "batismo"
  | "primeira_eucaristia"
  | "crisma"
  | "matrimonio"
  | "outro";

export const NOME_DO_ANIVERSARIO: Record<TipoDeAniversario, string> = {
  nascimento: "Aniversário",
  batismo: "Batismo",
  primeira_eucaristia: "Primeira Eucaristia",
  crisma: "Crisma",
  matrimonio: "Casamento",
  outro: "Sacramento",
};

export type DataDeAniversario = {
  pessoaId: string;
  nome: string;
  tipo: TipoDeAniversario;
  /** A data original, para calcular quantos anos completa. */
  data: Date;
};

export type Aniversario = DataDeAniversario & {
  /** Quantos dias faltam: 0 é hoje. */
  faltam: number;
  /** Dia e mês em que cai, no ano corrente da contagem. */
  quando: Date;
  /** Anos completados nesta data. Null quando o ano original é o próprio. */
  anos: number | null;
};

/** Dia do ano em UTC, para comparar datas sem envolver fuso. */
function diaEMes(data: Date): { mes: number; dia: number } {
  return { mes: data.getUTCMonth(), dia: data.getUTCDate() };
}

/**
 * A próxima ocorrência de um dia-e-mês a partir de uma data.
 *
 * 29 de fevereiro em ano comum cai no dia 1º de março: quem nasceu no dia
 * bissexto comemora, e o app não pode simplesmente esquecê-la em três de
 * cada quatro anos.
 */
function proximaOcorrencia(original: Date, apartirDe: Date): Date {
  const { mes, dia } = diaEMes(original);
  const inicio = Date.UTC(
    apartirDe.getUTCFullYear(),
    apartirDe.getUTCMonth(),
    apartirDe.getUTCDate(),
  );

  for (const ano of [apartirDe.getUTCFullYear(), apartirDe.getUTCFullYear() + 1]) {
    let candidata = new Date(Date.UTC(ano, mes, dia));
    // 29/02 em ano comum vira 01/03 — o Date rola sozinho, e é o que
    // queremos; só confirmamos que rolou para não anunciar "29 de fevereiro"
    // num ano que não tem.
    if (candidata.getUTCMonth() !== mes) {
      candidata = new Date(Date.UTC(ano, mes + 1, 1));
    }
    if (candidata.getTime() >= inicio) return candidata;
  }

  return new Date(Date.UTC(apartirDe.getUTCFullYear() + 1, mes, dia));
}

const UM_DIA = 24 * 60 * 60 * 1000;

/**
 * O que se comemora nos próximos `dias`, em ordem de proximidade.
 *
 * Aniversário de vida vem primeiro dentro do mesmo dia: é o que a paróquia
 * costuma lembrar em voz alta na missa.
 */
export function proximosAniversarios(
  datas: DataDeAniversario[],
  hoje: Date,
  dias = 30,
): Aniversario[] {
  const inicio = Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate());
  const limite = inicio + dias * UM_DIA;

  const resultado: Aniversario[] = [];

  for (const item of datas) {
    const quando = proximaOcorrencia(item.data, hoje);
    if (quando.getTime() > limite) continue;

    const anosCompletos = quando.getUTCFullYear() - item.data.getUTCFullYear();
    resultado.push({
      ...item,
      quando,
      faltam: Math.round((quando.getTime() - inicio) / UM_DIA),
      anos: anosCompletos > 0 ? anosCompletos : null,
    });
  }

  return resultado.sort((a, b) => {
    if (a.faltam !== b.faltam) return a.faltam - b.faltam;
    if (a.tipo !== b.tipo) {
      if (a.tipo === "nascimento") return -1;
      if (b.tipo === "nascimento") return 1;
    }
    return a.nome.localeCompare(b.nome, "pt-BR");
  });
}

/** "Hoje", "Amanhã" ou "em 5 dias" — o que a secretaria precisa saber. */
export function rotuloDeProximidade(faltam: number): string {
  if (faltam === 0) return "Hoje";
  if (faltam === 1) return "Amanhã";
  return `Em ${faltam} dias`;
}
