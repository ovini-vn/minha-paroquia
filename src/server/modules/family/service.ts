import { withTenantContext } from "@/server/db/tenant-context";
import type { CreateFamilyMemberInput } from "./schema";

export function createFamilyMember(
  input: CreateFamilyMemberInput & { parishId: string; responsibleUserId: string },
) {
  return withTenantContext(input.parishId, (tx) =>
    tx.familyMember.create({
      data: {
        parishId: input.parishId,
        responsibleUserId: input.responsibleUserId,
        fullName: input.fullName,
        relationship: input.relationship,
        birthDate: input.birthDate ?? null,
      },
    }),
  );
}

export function listMyFamilyMembers(parishId: string, responsibleUserId: string) {
  return withTenantContext(parishId, (tx) =>
    tx.familyMember.findMany({
      where: { parishId, responsibleUserId },
      orderBy: { createdAt: "asc" },
    }),
  );
}

/** Escopado ao próprio responsável — evita um fiel enxergar dependente de outro por id adivinhado. */
export function getOwnFamilyMember(parishId: string, id: string, responsibleUserId: string) {
  return withTenantContext(parishId, (tx) =>
    tx.familyMember.findFirst({ where: { id, parishId, responsibleUserId } }),
  );
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
