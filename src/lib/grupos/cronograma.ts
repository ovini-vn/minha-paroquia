/**
 * O cronograma de um grupo: ler o que a coordenação colou, pôr em ordem e
 * dizer as datas como gente diz.
 *
 * Tudo aqui é puro — sem banco, sem relógio —, para ser testado com o
 * cronograma de verdade de um grupo (tests/unit/cronograma.test.ts).
 *
 * As datas andam como texto "2026-09-06", e não como Date. São dias de
 * calendário, sem hora: um Date carrega fuso, e foi o fuso que já pôs missa
 * no dia errado neste projeto (ver src/lib/brasilia.ts).
 */

export type EncontroLido = {
  /** Linha do texto colado em que o encontro começa, contada a partir de 1. */
  linha: number;
  /** "2026-09-06", ou nulo para "data a definir". */
  data: string | null;
  /** Último dia, quando o encontro dura mais de um. */
  dataFim: string | null;
  /** "2026-12": por volta de quando, para o que ainda não tem data. */
  mesPrevisto: string | null;
  tema: string;
  complemento: string | null;
  destaque: boolean;
  icone: string | null;
};

export type ErroDeLeitura = { linha: number; texto: string; motivo: string };

/**
 * Os ícones que um encontro em destaque pode ter. Os desenhos ficam em
 * ./icones.ts; aqui só as chaves, para o servidor validar sem carregar
 * componente nenhum.
 */
export const CHAVES_DE_ICONE = [
  "estrela",
  "fogo",
  "coracao",
  "igreja",
  "eucaristia",
  "oracao",
  "juventude",
  "confraternizacao",
  "bolo",
] as const;

export type ChaveDeIcone = (typeof CHAVES_DE_ICONE)[number];

export function ehChaveDeIcone(chave: string): chave is ChaveDeIcone {
  return (CHAVES_DE_ICONE as readonly string[]).includes(chave);
}

/*
 * O travessão que separa a data do tema.
 *
 * Travessão e meia-risca valem com ou sem espaço — é o que o cronograma
 * impresso usa. O hífen comum só vale COM espaços dos dois lados, porque sem
 * eles ele é o do intervalo: "10-12/09" é uma data só.
 */
const SEPARADOR = /\s+[—–-]\s+|\s*[—–]\s*/;

const SEM_DATA = /^(?:data\s+)?a\s+definir$/;

/** "06", "06/03", "06/03/27" ou "06/03/2027". */
const PEDACO_DE_DATA = /^(\d{1,2})(?:\/(\d{1,2}))?(?:\/(\d{2}|\d{4}))?$/;

/** Quantos dias um encontro pode durar antes de parecer dois encontros colados. */
const DURACAO_MAXIMA_EM_DIAS = 7;

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

function doisDigitos(n: number): string {
  return String(n).padStart(2, "0");
}

function comoTexto(ano: number, mes: number, dia: number): string {
  return `${ano}-${doisDigitos(mes)}-${doisDigitos(dia)}`;
}

function existe(ano: number, mes: number, dia: number): boolean {
  if (mes < 1 || mes > 12 || dia < 1) return false;
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  return d.getUTCFullYear() === ano && d.getUTCMonth() === mes - 1 && d.getUTCDate() === dia;
}

function diasEntre(de: string, ate: string): number {
  return Math.round((Date.parse(`${ate}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`)) / 86_400_000);
}

function mesAnterior(mes: string): string {
  const [a, m] = mes.split("-").map(Number) as [number, number];
  return m === 1 ? `${a - 1}-12` : `${a}-${doisDigitos(m - 1)}`;
}

type Referencia = { ano: number; mes: number } | null;

/**
 * "06/09/26", "06 e 07/03/27", "31/07 e 01/08/27", "10, 11 e 12/09/27".
 *
 * Os pedaços sem mês ou sem ano herdam do pedaço seguinte — é assim que se
 * escreve à mão: o ano vai uma vez, no fim. Sem ano em lugar nenhum, vale o
 * do encontro anterior, virando o ano quando o mês volta para trás.
 */
function lerData(
  esquerda: string,
  anterior: Referencia,
): { data: string; dataFim: string | null } | { motivo: string } {
  const pedacos = esquerda
    .split(/\s*(?:,|\be\b|\ba\b|-|–)\s*/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (pedacos.length === 0) return { motivo: "Não achei a data no começo da linha." };

  const lidos: { dia: number; mes: number | null; ano: number | null }[] = [];
  for (const pedaco of pedacos) {
    const m = PEDACO_DE_DATA.exec(pedaco);
    if (!m) return { motivo: `"${pedaco}" não parece uma data. Escreva como 06/09/26.` };
    const ano = m[3] ? (m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])) : null;
    lidos.push({ dia: Number(m[1]), mes: m[2] ? Number(m[2]) : null, ano });
  }

  for (let i = lidos.length - 2; i >= 0; i--) {
    lidos[i]!.mes ??= lidos[i + 1]!.mes;
    lidos[i]!.ano ??= lidos[i + 1]!.ano;
  }

  const ultimo = lidos[lidos.length - 1]!;
  if (ultimo.mes === null) return { motivo: "Faltou o mês. Escreva como 06/09/26." };
  if (ultimo.ano === null) {
    if (!anterior) return { motivo: "Faltou o ano na primeira data. Escreva como 06/09/26." };
    const ano = ultimo.mes < anterior.mes ? anterior.ano + 1 : anterior.ano;
    for (const l of lidos) l.ano ??= ano;
  }

  for (const l of lidos) {
    if (!existe(l.ano!, l.mes!, l.dia)) {
      return { motivo: `${doisDigitos(l.dia)}/${doisDigitos(l.mes!)} não existe no calendário.` };
    }
  }

  const primeiro = lidos[0]!;
  const data = comoTexto(primeiro.ano!, primeiro.mes!, primeiro.dia);
  if (lidos.length === 1) return { data, dataFim: null };

  const dataFim = comoTexto(ultimo.ano!, ultimo.mes!, ultimo.dia);
  const duracao = diasEntre(data, dataFim);
  if (duracao <= 0) return { motivo: "O último dia vem antes do primeiro." };
  if (duracao > DURACAO_MAXIMA_EM_DIAS) {
    return { motivo: "Isso parece mais de um encontro. Ponha cada um na sua linha." };
  }
  return { data, dataFim };
}

/**
 * O ícone de um encontro em destaque, pelo que o tema diz.
 *
 * A ORDEM importa: "comemoração" contém "oração", e "Encontro Templo Vivo
 * (Seminário)" é seminário mas é do templo que ele fala. O mais específico
 * vem antes. A coordenação troca depois, se o palpite errar.
 */
const PALPITES_DE_ICONE: [RegExp, ChaveDeIcone][] = [
  [/retiro|eucarist|adoracao/, "eucaristia"],
  [/comemora|aniversari|\b1 ano\b/, "bolo"],
  [/confraterniza|festa/, "confraternizacao"],
  [/oracao|rezar/, "oracao"],
  [/templo|igreja|missa/, "igreja"],
  [/vocacion|juventude/, "juventude"],
  [/essencia|coracao/, "coracao"],
  [/seminario|se joga|espirito/, "fogo"],
];

export function palpiteDeIcone(tema: string, complemento: string | null): ChaveDeIcone {
  const texto = normalizar(`${tema} ${complemento ?? ""}`);
  return PALPITES_DE_ICONE.find(([padrao]) => padrao.test(texto))?.[1] ?? "estrela";
}

/** "Se Joga CDM (Seminário)" → tema "Se Joga CDM", complemento "Seminário". */
function separarComplemento(texto: string): { tema: string; complemento: string | null } {
  const m = /^(.*\S)\s*\(([^()]+)\)\s*[.!]?$/.exec(texto.trim());
  if (!m) return { tema: texto.trim(), complemento: null };
  return { tema: m[1]!.trim(), complemento: m[2]!.trim() };
}

/**
 * Lê o cronograma colado, uma linha por encontro:
 *
 *     06/09/26 — Quem sou eu de verdade?
 *     11/10/26 — Se Joga CDM (Seminário)
 *     Data a definir — Confraternização CDM
 *     06 e 07/03/27 — Encontro da Essência (Seminário)
 *
 * Uma linha que não começa com data continua o tema da anterior: é o que
 * acontece quando o texto vem de um cartaz ou PDF e o tema quebrou em duas.
 *
 * Tudo ou nada: com qualquer erro, quem chama não grava nada e mostra os
 * erros por linha. Metade de um cronograma gravado é pior que nenhum —
 * a coordenação teria de descobrir o que entrou.
 */
export function lerCronograma(texto: string): { encontros: EncontroLido[]; erros: ErroDeLeitura[] } {
  const encontros: EncontroLido[] = [];
  const erros: ErroDeLeitura[] = [];
  let anterior: Referencia = null;

  const linhas = texto.split(/\r?\n/);
  linhas.forEach((cru, i) => {
    const linha = cru.trim().replace(/^[•·*-]\s+/, "");
    if (!linha) return;
    const numero = i + 1;

    const partes = linha.split(SEPARADOR);
    const esquerda = partes.length > 1 ? partes[0]!.trim() : "";
    const direita = partes.length > 1 ? partes.slice(1).join(" — ").trim() : "";
    // Sem travessão, quem decide é o começo da linha inteira: "07/03/27"
    // sozinho é um encontro sem tema, e não a continuação do anterior.
    const inicio = partes.length > 1 ? esquerda : linha;
    const comecaComData = /^\d/.test(inicio) || SEM_DATA.test(normalizar(inicio));

    if (!comecaComData) {
      const ultimo = encontros[encontros.length - 1];
      if (ultimo) {
        const junto = separarComplemento(
          `${ultimo.tema}${ultimo.complemento ? ` (${ultimo.complemento})` : ""} ${linha}`,
        );
        ultimo.tema = junto.tema;
        ultimo.complemento = junto.complemento;
        ultimo.destaque = ultimo.destaque || junto.complemento !== null;
        ultimo.icone = ultimo.destaque ? palpiteDeIcone(ultimo.tema, ultimo.complemento) : null;
        return;
      }
      erros.push({
        linha: numero,
        texto: linha,
        motivo: "A linha precisa começar com a data, como em 06/09/26 — Tema.",
      });
      return;
    }

    if (!direita) {
      erros.push({ linha: numero, texto: linha, motivo: "Faltou o tema depois do travessão." });
      return;
    }

    const { tema, complemento } = separarComplemento(direita);
    let data: string | null = null;
    let dataFim: string | null = null;

    if (!SEM_DATA.test(normalizar(esquerda))) {
      const lida = lerData(esquerda, anterior);
      if ("motivo" in lida) {
        erros.push({ linha: numero, texto: linha, motivo: lida.motivo });
        return;
      }
      data = lida.data;
      dataFim = lida.dataFim;
      const [a, m] = (dataFim ?? data).split("-").map(Number) as [number, number];
      anterior = { ano: a, mes: m };
    }

    const destaque = complemento !== null || data === null || dataFim !== null;
    encontros.push({
      linha: numero,
      data,
      dataFim,
      mesPrevisto: null,
      tema,
      complemento,
      destaque,
      icone: destaque ? palpiteDeIcone(tema, complemento) : null,
    });
  });

  /*
   * "Data a definir" fica no mês do encontro que vem ANTES dele na lista:
   * foi ali que a coordenação o pôs. No topo, sem anterior, vai para o mês
   * que antecede o primeiro com data.
   */
  encontros.forEach((e, i) => {
    if (e.data) return;
    const antes = encontros
      .slice(0, i)
      .reverse()
      .find((x) => x.data);
    if (antes) {
      e.mesPrevisto = (antes.dataFim ?? antes.data)!.slice(0, 7);
      return;
    }
    const depois = encontros.slice(i + 1).find((x) => x.data);
    if (depois) e.mesPrevisto = mesAnterior(depois.data!.slice(0, 7));
  });

  return { encontros, erros };
}

// ---- ordem -----------------------------------------------------------------

type ComData = { data: string | null; mesPrevisto: string | null };

function ultimoDiaDoMes(mes: string): string {
  const [a, m] = mes.split("-").map(Number) as [number, number];
  return comoTexto(a, m, new Date(Date.UTC(a, m, 0)).getUTCDate());
}

/**
 * A posição de um encontro no cronograma.
 *
 * Com data, é a data. Sem data, é o FIM do mês previsto — a confraternização
 * "de dezembro" vem depois do último encontro de dezembro e antes do
 * primeiro de janeiro. Sem nem isso, vai para o fim da lista.
 */
export function posicaoNoCronograma(e: ComData): string {
  if (e.data) return `${e.data}|0`;
  if (e.mesPrevisto) return `${ultimoDiaDoMes(e.mesPrevisto)}|1`;
  return "9999-12-31|2";
}

export function emOrdem<T extends ComData>(encontros: readonly T[]): T[] {
  return [...encontros].sort((a, b) => posicaoNoCronograma(a).localeCompare(posicaoNoCronograma(b)));
}

/** Já terminou, olhando o último dia. "Data a definir" nunca passou. */
export function jaPassou(e: { data: string | null; dataFim: string | null }, hoje: string): boolean {
  const fim = e.dataFim ?? e.data;
  return fim !== null && fim < hoje;
}

/**
 * O próximo encontro com data — inclusive o de hoje, e o que está
 * acontecendo agora (o segundo dia de um seminário ainda é "o próximo").
 */
export function proximoEncontro<T extends ComData & { dataFim: string | null }>(
  encontros: readonly T[],
  hoje: string,
): T | null {
  return emOrdem(encontros).find((e) => e.data !== null && !jaPassou(e, hoje)) ?? null;
}

// ---- como dizer as datas ---------------------------------------------------

const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];
const MESES_CURTOS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const DIAS_DA_SEMANA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const DIAS_CURTOS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

function partesDoDia(dia: string): { ano: number; mes: number; dia: number; semana: number } {
  const [a, m, d] = dia.split("-").map(Number) as [number, number, number];
  return { ano: a, mes: m, dia: d, semana: new Date(Date.UTC(a, m - 1, d)).getUTCDay() };
}

/** O primeiro dia do mês se diz "1º". */
function diaFalado(d: number): string {
  return d === 1 ? "1º" : String(d);
}

/**
 * "domingo, 6 de setembro" · "6 e 7 de março" · "10 a 12 de setembro" ·
 * "31 de julho a 1º de agosto" · "Data a definir".
 *
 * O ano não entra: o cronograma é agrupado por mês e ano, e o Início só
 * mostra o que está perto.
 */
export function quando(e: { data: string | null; dataFim: string | null }): string {
  if (!e.data) return "Data a definir";
  const ini = partesDoDia(e.data);
  if (!e.dataFim) return `${DIAS_DA_SEMANA[ini.semana]}, ${diaFalado(ini.dia)} de ${MESES[ini.mes - 1]}`;

  const fim = partesDoDia(e.dataFim);
  if (ini.mes !== fim.mes) {
    return `${diaFalado(ini.dia)} de ${MESES[ini.mes - 1]} a ${diaFalado(fim.dia)} de ${MESES[fim.mes - 1]}`;
  }
  const ligacao = diasEntre(e.data, e.dataFim) === 1 ? "e" : "a";
  return `${diaFalado(ini.dia)} ${ligacao} ${diaFalado(fim.dia)} de ${MESES[fim.mes - 1]}`;
}

/** O dia seguinte: "2026-09-19" → "2026-09-20". */
export function diaSeguinte(dia: string): string {
  const p = partesDoDia(dia);
  const d = new Date(Date.UTC(p.ano, p.mes - 1, p.dia + 1));
  return comoTexto(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

/**
 * Como o cartão do próximo encontro diz o dia: "Hoje", "Amanhã" ou a data.
 *
 * Um seminário que começou ontem e termina amanhã também é "hoje" — a
 * pessoa que abre o app no domingo do encontro de fim de semana precisa
 * saber que é agora.
 */
export function quandoPerto(e: { data: string | null; dataFim: string | null }, hoje: string): string {
  if (e.data && e.data <= hoje && hoje <= (e.dataFim ?? e.data)) return "Hoje";
  if (e.data === diaSeguinte(hoje)) return "Amanhã";
  return quando(e);
}

/** O que vai no quadradinho da data, na lista: "06" / "set" / "dom". */
export function ladrilho(e: { data: string | null; dataFim: string | null }): {
  dia: string;
  mes: string;
  semana: string;
} | null {
  if (!e.data) return null;
  const ini = partesDoDia(e.data);
  if (!e.dataFim) {
    return { dia: doisDigitos(ini.dia), mes: MESES_CURTOS[ini.mes - 1]!, semana: DIAS_CURTOS[ini.semana]! };
  }
  const fim = partesDoDia(e.dataFim);
  return {
    dia: `${doisDigitos(ini.dia)}–${doisDigitos(fim.dia)}`,
    mes:
      ini.mes === fim.mes
        ? MESES_CURTOS[ini.mes - 1]!
        : `${MESES_CURTOS[ini.mes - 1]}–${MESES_CURTOS[fim.mes - 1]}`,
    semana: `${DIAS_CURTOS[ini.semana]}–${DIAS_CURTOS[fim.semana]}`,
  };
}

/** "setembro de 2026", para agrupar a lista. "Data a definir" vai no mês previsto. */
export function mesDoCronograma(e: ComData): string {
  const referencia = e.data ?? (e.mesPrevisto ? `${e.mesPrevisto}-01` : null);
  if (!referencia) return "Ainda sem data";
  const p = partesDoDia(referencia);
  return `${MESES[p.mes - 1]} de ${p.ano}`;
}

/** Um dia do banco (`@db.Date`, meia-noite UTC) como "2026-09-06". */
export function diaDoBanco(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** O contrário: "2026-09-06" como o Date que o Prisma grava num `@db.Date`. */
export function paraOBanco(dia: string): Date {
  return new Date(`${dia}T00:00:00.000Z`);
}
