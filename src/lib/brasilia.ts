/**
 * Horário de Brasília, em um lugar só.
 *
 * O app inteiro raciocina em "hora de parede": a missa é às 19h, não é "no
 * instante UTC tal". Converter isso errado é o defeito que passa despercebido
 * — vira aviso no dia errado, missa aparecendo no dia seguinte na agenda.
 *
 * O Brasil não tem horário de verão desde 2019, então o deslocamento é fixo
 * em UTC-3. Se algum dia voltar, é AQUI que muda — e por isso este arquivo
 * existe, em vez de o número 3 estar espalhado pelo código.
 */
export const BRASILIA_OFFSET_HOURS = 3;

/**
 * Para os formatadores de Intl, que sabem lidar com a base IANA sozinhos.
 *
 * Todo Intl.DateTimeFormat que exibe HORA precisa disto. Sem fixar, ele usa
 * o fuso de quem está rodando: no computador de quem desenvolve (São Paulo)
 * a hora sai certa, e no servidor (UTC) sai três horas adiantada. É um bug
 * que passa em todo teste local e só aparece em produção.
 */
export const BRASILIA_TIMEZONE = "America/Sao_Paulo";
const HORA_MS = 3_600_000;

/** Partes do calendário de Brasília correspondentes a um instante UTC. */
export function brasiliaParts(instant: Date): {
  year: number;
  month: number; // 0-11
  day: number;
  weekday: number; // 0 = domingo
  minutes: number; // minutos desde a meia-noite
} {
  const deslocado = new Date(instant.getTime() - BRASILIA_OFFSET_HOURS * HORA_MS);
  return {
    year: deslocado.getUTCFullYear(),
    month: deslocado.getUTCMonth(),
    day: deslocado.getUTCDate(),
    weekday: deslocado.getUTCDay(),
    minutes: deslocado.getUTCHours() * 60 + deslocado.getUTCMinutes(),
  };
}

/**
 * Instante UTC de uma hora de parede em Brasília.
 *
 * Ex.: 21/08/2026 às 19:00 (1140 minutos) vira 21/08/2026T22:00Z.
 */
export function brasiliaWallClockToUtc(
  year: number,
  month: number,
  day: number,
  minutes: number,
): Date {
  return new Date(Date.UTC(year, month, day, 0, minutes + BRASILIA_OFFSET_HOURS * 60));
}

/** "19:00" a partir de minutos desde a meia-noite. */
export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** "19:00" -> 1140. Devolve null se não for uma hora válida. */
export function parseMinutes(texto: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(texto.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}
