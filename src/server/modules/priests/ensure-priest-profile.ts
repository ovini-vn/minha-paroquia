import type { Prisma } from "@prisma/client";

// Sem imports "@/..." de propósito: este arquivo também é usado pelo seed
// (rodado via tsx, que não resolve os path aliases do tsconfig).

const PRIEST_TITLES: Record<string, string> = {
  PAROCO: "Pároco",
  SACERDOTE: "Sacerdote",
};

export function isPriestRole(roleCode: string): boolean {
  return roleCode in PRIEST_TITLES;
}

/**
 * Chamado de dentro de uma transação já existente (aceite de convite, seed)
 * — nunca sozinho, por isso recebe `tx` em vez de abrir seu próprio
 * contexto de tenant. Idempotente: não duplica o perfil se já existir.
 */
export async function ensurePriestProfile(
  tx: Prisma.TransactionClient,
  params: { userId: string; parishId: string; roleCode: string },
): Promise<void> {
  const title = PRIEST_TITLES[params.roleCode];
  if (!title) return;

  const existing = await tx.priestProfile.findUnique({
    where: { userId_parishId: { userId: params.userId, parishId: params.parishId } },
  });
  if (existing) return;

  const count = await tx.priestProfile.count({ where: { parishId: params.parishId } });

  await tx.priestProfile.create({
    data: {
      userId: params.userId,
      parishId: params.parishId,
      title,
      displayOrder: params.roleCode === "PAROCO" ? 0 : count + 1,
    },
  });
}
