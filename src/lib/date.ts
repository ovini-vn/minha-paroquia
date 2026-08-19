const WEEKDAY_TIME_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  weekday: "short",
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

/** Ex.: "seg., 25 de ago., 19:00" */
export function formatDateTime(date: Date): string {
  return WEEKDAY_TIME_FORMATTER.format(date);
}

const DAY_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "2-digit",
  month: "long",
});

const TIME_FORMATTER = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });

/** Ex.: "Segunda-feira, 25 de agosto" */
export function formatDateLabel(date: Date): string {
  const label = DAY_FORMATTER.format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Ex.: "19:00" */
export function formatTimeLabel(date: Date): string {
  return TIME_FORMATTER.format(date);
}

// timeZone: "UTC" de propósito — campos "só data" (@db.Date no Prisma, ex.:
// participatedAt, sacraments.date, confession_logs.date) chegam como
// meia-noite UTC. Sem fixar o timezone aqui, um servidor rodando num fuso
// atrás de UTC (como o Brasil) exibe o dia anterior ao registrado.
const DATE_ONLY_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** Ex.: "19 de agosto de 2026" — só para campos "@db.Date" (sem hora). */
export function formatDateOnly(date: Date): string {
  return DATE_ONLY_FORMATTER.format(date);
}

/** Período corrente no formato "AAAA-MM", usado pelo módulo de dízimo. */
export function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

const PERIOD_FORMATTER = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });

/** "2026-08" -> "agosto de 2026". */
export function formatPeriodLabel(period: string): string {
  const [year, month] = period.split("-").map(Number);
  return PERIOD_FORMATTER.format(new Date(Date.UTC(year!, month! - 1, 1)));
}
