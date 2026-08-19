import { withTenantContext } from "@/server/db/tenant-context";
import { ValidationError } from "@/server/shared/errors";
import type { CreateFamilyMemberInput } from "./schema";

/**
 * Quem cadastra um dependente já entra automaticamente como o primeiro
 * guardião (family_member_guardians) — é o mecanismo real de acesso desde
 * o início. responsibleUserId fica gravado só como "quem cadastrou
 * originalmente", para exibição no painel de catequese.
 */
export function createFamilyMember(
  input: CreateFamilyMemberInput & { parishId: string; responsibleUserId: string },
) {
  return withTenantContext(input.parishId, async (tx) => {
    const member = await tx.familyMember.create({
      data: {
        parishId: input.parishId,
        responsibleUserId: input.responsibleUserId,
        fullName: input.fullName,
        relationship: input.relationship,
        birthDate: input.birthDate ?? null,
      },
    });
    await tx.familyMemberGuardian.create({
      data: { parishId: input.parishId, familyMemberId: member.id, userId: input.responsibleUserId },
    });
    return member;
  });
}

/** Múltiplos vínculos simultâneos (P2): retorna dependentes onde o usuário é QUALQUER guardião, não só quem cadastrou. */
export function listMyFamilyMembers(parishId: string, userId: string) {
  return withTenantContext(parishId, (tx) =>
    tx.familyMember.findMany({
      where: { parishId, guardians: { some: { userId } } },
      orderBy: { createdAt: "asc" },
    }),
  );
}

/** Escopado a QUALQUER guardião do dependente — evita um fiel enxergar dependente alheio por id adivinhado. */
export function getOwnFamilyMember(parishId: string, id: string, userId: string) {
  return withTenantContext(parishId, (tx) =>
    tx.familyMember.findFirst({ where: { id, parishId, guardians: { some: { userId } } } }),
  );
}

export function listGuardians(parishId: string, familyMemberId: string) {
  return withTenantContext(parishId, (tx) =>
    tx.familyMemberGuardian.findMany({
      where: { parishId, familyMemberId },
      include: { user: { select: { id: true, fullName: true } } },
      orderBy: { createdAt: "asc" },
    }),
  );
}

/** Só um guardião já existente pode adicionar outro — evita vínculo com dependente alheio. */
export async function addGuardian(parishId: string, familyMemberId: string, newUserId: string, actingUserId: string) {
  return withTenantContext(parishId, async (tx) => {
    const isGuardian = await tx.familyMemberGuardian.findUnique({
      where: { familyMemberId_userId: { familyMemberId, userId: actingUserId } },
    });
    if (!isGuardian) throw new ValidationError("Você não é responsável por este dependente.");

    return tx.familyMemberGuardian.upsert({
      where: { familyMemberId_userId: { familyMemberId, userId: newUserId } },
      update: {},
      create: { parishId, familyMemberId, userId: newUserId },
    });
  });
}

/** Não permite remover o último guardião — o dependente ficaria sem ninguém responsável. */
export async function removeGuardian(
  parishId: string,
  familyMemberId: string,
  targetUserId: string,
  actingUserId: string,
) {
  return withTenantContext(parishId, async (tx) => {
    const isGuardian = await tx.familyMemberGuardian.findUnique({
      where: { familyMemberId_userId: { familyMemberId, userId: actingUserId } },
    });
    if (!isGuardian) throw new ValidationError("Você não é responsável por este dependente.");

    const count = await tx.familyMemberGuardian.count({ where: { familyMemberId } });
    if (count <= 1) throw new ValidationError("Não é possível remover o último responsável.");

    return tx.familyMemberGuardian.deleteMany({ where: { parishId, familyMemberId, userId: targetUserId } });
  });
}

/** Só pra quem administra catequese (CATEQUESE_MANAGE) — matricular exige achar o dependente certo. */
export function listAllFamilyMembers(parishId: string) {
  return withTenantContext(parishId, (tx) =>
    tx.familyMember.findMany({
      where: { parishId },
      orderBy: { fullName: "asc" },
      include: { responsible: { select: { fullName: true } } },
    }),
  );
}
