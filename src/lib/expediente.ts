import { brasiliaParts, formatMinutes, parseMinutes } from "./brasilia";

/**
 * "A secretaria está aberta agora?"
 *
 * A pergunta parece trivial e tem duas armadilhas. A primeira é o fuso: o
 * servidor roda em UTC, e às 21h de Brasília já é o dia seguinte lá — sem
 * converter, o app diria que a secretaria de segunda está aberta no domingo
 * à noite. A segunda é o almoço: paróquia costuma fechar no meio do dia, e
 * por isso as faixas são uma linha cada, não "abre" e "fecha" por dia.
 */

export const DIAS_DA_SEMANA = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
] as const;

export type Faixa = { weekday: number; opensAt: number; closesAt: number };

/** Dois turnos por dia: é o que uma secretaria com pausa de almoço precisa. */
export const TURNOS = [
  { id: "m", rotulo: "Manhã" },
  { id: "t", rotulo: "Tarde" },
] as const;

export type Expediente =
  | { aberta: true; fechaAs: string }
  | { aberta: false; proxima: { dia: string; hora: string } | null };

/**
 * Estado atual e, quando fechada, quando volta a abrir.
 *
 * Dizer só "fechada" deixa a pessoa sem saber se adianta esperar meia hora
 * ou se precisa voltar na segunda — e é justamente isso que ela quer saber
 * ao abrir a tela de contato.
 */
export function calcularExpediente(faixas: Faixa[], agora: Date): Expediente {
  if (faixas.length === 0) return { aberta: false, proxima: null };

  const { weekday: hojeDia, minutes: agoraMin } = brasiliaParts(agora);

  const deHoje = faixas.filter((f) => f.weekday === hojeDia);
  const emCurso = deHoje.find((f) => agoraMin >= f.opensAt && agoraMin < f.closesAt);
  if (emCurso) return { aberta: true, fechaAs: formatMinutes(emCurso.closesAt) };

  // Ainda vai abrir hoje? (ex.: agora são 13h e reabre às 14h)
  const aindaHoje = deHoje
    .filter((f) => f.opensAt > agoraMin)
    .sort((a, b) => a.opensAt - b.opensAt)[0];
  if (aindaHoje) {
    return { aberta: false, proxima: { dia: "hoje", hora: formatMinutes(aindaHoje.opensAt) } };
  }

  // Procura nos próximos seis dias. Sete daria a volta completa e
  // encontraria hoje de novo, com um horário que já passou.
  for (let salto = 1; salto <= 6; salto += 1) {
    const dia = (hojeDia + salto) % 7;
    const primeira = faixas
      .filter((f) => f.weekday === dia)
      .sort((a, b) => a.opensAt - b.opensAt)[0];
    if (primeira) {
      return {
        aberta: false,
        proxima: {
          dia: salto === 1 ? "amanhã" : DIAS_DA_SEMANA[dia]!.toLowerCase(),
          hora: formatMinutes(primeira.opensAt),
        },
      };
    }
  }

  return { aberta: false, proxima: null };
}

/** Nomes curtos, para caber em "Segunda a sexta" sem virar uma frase. */
const DIAS_CURTOS = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
] as const;

/** A semana começa na segunda: é como um cartaz de horário na porta é lido. */
const ORDEM_DE_EXIBICAO = [1, 2, 3, 4, 5, 6, 0];

function rotuloDoIntervalo(dias: number[]): string {
  if (dias.length === 1) return DIAS_DA_SEMANA[dias[0]!]!;

  const primeiro = DIAS_CURTOS[dias[0]!]!;
  const ultimo = DIAS_CURTOS[dias[dias.length - 1]!]!.toLowerCase();
  // Dois dias não formam intervalo: "sábado a domingo" soa errado, "e" não.
  return dias.length === 2 ? `${primeiro} e ${ultimo}` : `${primeiro} a ${ultimo}`;
}

/**
 * Monta as linhas do quadro de horários, juntando dias seguidos iguais.
 *
 * Cinco linhas dizendo 08:00–17:00 são cinco vezes a mesma informação; uma
 * linha "Segunda a sexta" é o que estaria escrito no cartaz da secretaria.
 * Só junta dias VIZINHOS na ordem de exibição — juntar segunda com quarta
 * pulando a terça fechada faria a linha mentir.
 */
export function agruparPorDia(faixas: Faixa[]): { dia: string; horarios: string }[] {
  const porDia = new Map<number, Faixa[]>();
  for (const f of faixas) {
    porDia.set(f.weekday, [...(porDia.get(f.weekday) ?? []), f]);
  }

  const textoDoDia = (d: number) =>
    porDia
      .get(d)!
      .slice()
      .sort((a, b) => a.opensAt - b.opensAt)
      .map((f) => `${formatMinutes(f.opensAt)}–${formatMinutes(f.closesAt)}`)
      .join(", ");

  const linhas: { dia: string; horarios: string }[] = [];
  let bloco: number[] = [];
  let horariosDoBloco = "";

  const fechaBloco = () => {
    if (bloco.length > 0) linhas.push({ dia: rotuloDoIntervalo(bloco), horarios: horariosDoBloco });
    bloco = [];
  };

  for (const d of ORDEM_DE_EXIBICAO) {
    if (!porDia.has(d)) {
      // Dia fechado interrompe a sequência.
      fechaBloco();
      continue;
    }
    const horarios = textoDoDia(d);
    if (bloco.length > 0 && horarios === horariosDoBloco) {
      bloco.push(d);
    } else {
      fechaBloco();
      bloco = [d];
      horariosDoBloco = horarios;
    }
  }
  fechaBloco();

  return linhas;
}

/**
 * Traduz o que a secretaria digitou em faixas, ou explica o que está errado.
 *
 * Fica aqui, fora da server action, porque é a parte que dá errado sozinha:
 * turno pela metade e turnos que se cruzam são erros de digitação comuns e
 * merecem teste sem precisar de banco nem de sessão.
 */
export function interpretarExpediente(
  entradas: { weekday: number; rotuloDoTurno: string; abre: string; fecha: string }[],
): { faixas: Faixa[] } | { erro: string } {
  const faixas: Faixa[] = [];

  for (const entrada of entradas) {
    const abre = entrada.abre.trim();
    const fecha = entrada.fecha.trim();
    if (!abre && !fecha) continue;

    const onde = `${DIAS_DA_SEMANA[entrada.weekday]} (${entrada.rotuloDoTurno.toLowerCase()})`;
    // Meio preenchido é quase sempre esquecimento, não intenção. Guardar assim
    // daria um horário mentiroso na tela do fiel.
    if (!abre || !fecha) return { erro: `Preencha a abertura e o fechamento de ${onde}.` };

    const opensAt = parseMinutes(abre);
    const closesAt = parseMinutes(fecha);
    if (opensAt === null || closesAt === null) return { erro: `Horário inválido em ${onde}.` };
    if (closesAt <= opensAt) {
      return { erro: `Em ${onde}, o fechamento precisa ser depois da abertura.` };
    }

    faixas.push({ weekday: entrada.weekday, opensAt, closesAt });
  }

  // Turnos que se cruzam no mesmo dia deixariam "fecha às" ambíguo.
  const porDia = new Map<number, Faixa[]>();
  for (const f of faixas) porDia.set(f.weekday, [...(porDia.get(f.weekday) ?? []), f]);
  for (const [weekday, lista] of porDia) {
    const ordenadas = [...lista].sort((a, b) => a.opensAt - b.opensAt);
    for (let i = 1; i < ordenadas.length; i += 1) {
      if (ordenadas[i]!.opensAt < ordenadas[i - 1]!.closesAt) {
        return { erro: `Os turnos de ${DIAS_DA_SEMANA[weekday]} se sobrepõem.` };
      }
    }
  }

  return { faixas };
}
