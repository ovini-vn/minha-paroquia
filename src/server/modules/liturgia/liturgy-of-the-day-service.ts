import { withTenantContext } from "@/server/db/tenant-context";
import { ValidationError } from "@/server/shared/errors";

/**
 * Leituras do dia publicadas pela paróquia.
 *
 * Guardamos REFERÊNCIAS (ex.: "Mt 20, 1-16") e a reflexão autoral do pároco.
 * Nunca o texto bíblico: as traduções católicas em português são
 * licenciadas. Ver daily-service.ts para o racional completo.
 */

export type LiturgyInput = {
  date: Date;
  gospelReference: string;
  gospelTitle?: string | null;
  firstReading?: string | null;
  psalm?: string | null;
  secondReading?: string | null;
  reflection?: string | null;
};

/** Normaliza para meia-noite UTC — a coluna é DATE, uma linha por dia. */
function toDateOnly(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function getLiturgyForDate(parishId: string, date: Date) {
  return withTenantContext(parishId, (tx) =>
    tx.liturgyOfTheDay.findUnique({
      where: { parishId_date: { parishId, date: toDateOnly(date) } },
    }),
  );
}

export function listUpcomingLiturgy(parishId: string, from: Date, limit = 14) {
  return withTenantContext(parishId, (tx) =>
    tx.liturgyOfTheDay.findMany({
      where: { parishId, date: { gte: toDateOnly(from) } },
      orderBy: { date: "asc" },
      take: limit,
    }),
  );
}

/** Publicar de novo no mesmo dia atualiza, em vez de duplicar. */
export async function publishLiturgy(
  parishId: string,
  createdBy: string,
  input: LiturgyInput,
) {
  const gospelReference = input.gospelReference.trim();
  if (!gospelReference) {
    throw new ValidationError("Informe a referência do Evangelho.");
  }

  const date = toDateOnly(input.date);
  const data = {
    gospelReference,
    gospelTitle: input.gospelTitle?.trim() || null,
    firstReading: input.firstReading?.trim() || null,
    psalm: input.psalm?.trim() || null,
    secondReading: input.secondReading?.trim() || null,
    reflection: input.reflection?.trim() || null,
  };

  return withTenantContext(parishId, (tx) =>
    tx.liturgyOfTheDay.upsert({
      where: { parishId_date: { parishId, date } },
      update: data,
      create: { parishId, date, createdBy, ...data },
    }),
  );
}

export function deleteLiturgy(parishId: string, date: Date) {
  return withTenantContext(parishId, (tx) =>
    tx.liturgyOfTheDay.deleteMany({ where: { parishId, date: toDateOnly(date) } }),
  );
}
