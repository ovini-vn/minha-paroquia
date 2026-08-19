import { customAlphabet } from "nanoid";
import { withPlatformContext, withTenantContext } from "@/server/db/tenant-context";
import { NotFoundError, ValidationError } from "@/server/shared/errors";
import type { Invitation, InvitationType } from "@prisma/client";
import { findInvitationByCode, listInvitationsByParish } from "./repository";
import type { CreateInvitationInput } from "./schema";
import { ensurePriestProfile } from "@/server/modules/priests/service";

// Sem 0/O/1/I/L — evita confusão ao digitar um código lido de um cartaz/QR.
const generateCode = customAlphabet("23456789ABCDEFGHJKMNPQRSTUVWXYZ", 8);

export async function createInvitation(input: CreateInvitationInput & { parishId: string; createdBy: string }) {
  const code = generateCode();
  const expiresAt = input.expiresInDays
    ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000)
    : null;

  return withTenantContext(input.parishId, (tx) =>
    tx.invitation.create({
      data: {
        parishId: input.parishId,
        code,
        type: input.type as InvitationType,
        createdBy: input.createdBy,
        expiresAt,
        maxUses: input.maxUses ?? null,
        intendedRoleCode: input.role === "FIEL" ? null : input.role,
      },
    }),
  );
}

export function getParishInvitations(parishId: string) {
  return listInvitationsByParish(parishId);
}

/** Só revoga convites ainda pendentes — um já usado/expirado/revogado não muda de estado daqui. */
export function revokeInvitation(parishId: string, id: string) {
  return withTenantContext(parishId, (tx) =>
    tx.invitation.updateMany({ where: { id, parishId, status: "pending" }, data: { status: "revoked" } }),
  );
}

export type InvitationValidation =
  | { valid: true; invitation: Invitation & { parish: { id: string; name: string; slug: string } } }
  | { valid: false; reason: "not_found" | "used" | "revoked" | "expired" | "exhausted" };

export async function validateInvitation(code: string): Promise<InvitationValidation> {
  const invitation = await findInvitationByCode(code);
  if (!invitation) return { valid: false, reason: "not_found" };
  if (invitation.status === "used") return { valid: false, reason: "used" };
  if (invitation.status === "revoked") return { valid: false, reason: "revoked" };
  if (invitation.expiresAt && invitation.expiresAt < new Date()) {
    return { valid: false, reason: "expired" };
  }
  if (invitation.maxUses !== null && invitation.usedCount >= invitation.maxUses) {
    return { valid: false, reason: "exhausted" };
  }
  return { valid: true, invitation };
}

/**
 * Aceitar um convite move o usuário para uma nova comunidade — por
 * definição, uma operação que toca duas paróquias (a antiga, se houver, e a
 * nova). Roda dentro de withPlatformContext (bypassa RLS) numa única
 * transação para garantir atomicidade: ou tudo aplica, ou nada aplica. Esta
 * é uma das duas únicas chamadas de withPlatformContext no sistema — a
 * outra é reservada para telas de administração da plataforma, que ainda
 * não existem nesta fase.
 */
export async function acceptInvitation(input: { code: string; userId: string }) {
  return withPlatformContext(async (tx) => {
    const invitation = await tx.invitation.findUnique({ where: { code: input.code } });
    if (!invitation) throw new NotFoundError("Convite");

    if (invitation.status !== "pending") {
      throw new ValidationError("Este convite não está mais disponível.");
    }
    if (invitation.expiresAt && invitation.expiresAt < new Date()) {
      throw new ValidationError("Este convite expirou.");
    }
    if (invitation.maxUses !== null && invitation.usedCount >= invitation.maxUses) {
      throw new ValidationError("Este convite já atingiu o limite de usos.");
    }

    const priorActive = await tx.parishMembership.findFirst({
      where: { userId: input.userId, status: "active" },
    });
    if (priorActive) {
      if (priorActive.parishId === invitation.parishId) {
        throw new ValidationError("Você já pertence a esta comunidade.");
      }
      await tx.parishMembership.update({
        where: { id: priorActive.id },
        data: { status: "inactive", leftAt: new Date() },
      });
    }

    const roleCode = invitation.intendedRoleCode ?? "FIEL";
    const role = await tx.role.findUniqueOrThrow({ where: { code: roleCode } });

    const membership = await tx.parishMembership.create({
      data: {
        userId: input.userId,
        parishId: invitation.parishId,
        roleId: role.id,
        status: "active",
        invitationId: invitation.id,
      },
    });

    await ensurePriestProfile(tx, { userId: input.userId, parishId: invitation.parishId, roleCode });

    await tx.invitation.update({
      where: { id: invitation.id },
      data: {
        status: "used",
        usedBy: input.userId,
        usedAt: new Date(),
        usedCount: { increment: 1 },
      },
    });

    return membership;
  });
}
