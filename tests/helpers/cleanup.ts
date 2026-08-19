import { prisma } from "@/server/db/prisma";
import { withPlatformContext } from "@/server/db/tenant-context";

/**
 * Limpeza de dados de teste precisa bypassar RLS de propósito: como
 * app_user (a role que os testes usam, igual à app) está sujeita à mesma
 * política de isolamento por parish_id, um deleteMany sem contexto de
 * tenant simplesmente não apaga nada (falha fechada) — o que é o
 * comportamento correto em produção, mas não serve para limpar múltiplas
 * paróquias de teste de uma vez.
 */
export async function cleanupTenantData(params: { userIds?: string[]; parishIds?: string[] }): Promise<void> {
  const { userIds = [], parishIds = [] } = params;

  await withPlatformContext(async (tx) => {
    if (parishIds.length > 0) {
      await tx.parishMembership.deleteMany({ where: { parishId: { in: parishIds } } });
      await tx.invitation.deleteMany({ where: { parishId: { in: parishIds } } });
      await tx.celebration.deleteMany({ where: { parishId: { in: parishIds } } });
      await tx.event.deleteMany({ where: { parishId: { in: parishIds } } });
      await tx.post.deleteMany({ where: { parishId: { in: parishIds } } });
      await tx.appointment.deleteMany({ where: { parishId: { in: parishIds } } });
      await tx.priestAvailability.deleteMany({ where: { parishId: { in: parishIds } } });
      await tx.serviceInterest.deleteMany({ where: { parishId: { in: parishIds } } });
      await tx.serviceOpportunity.deleteMany({ where: { parishId: { in: parishIds } } });
      await tx.volunteerProfile.deleteMany({ where: { parishId: { in: parishIds } } });
      await tx.massParticipation.deleteMany({ where: { parishId: { in: parishIds } } });
      await tx.sacrament.deleteMany({ where: { parishId: { in: parishIds } } });
      await tx.confessionLog.deleteMany({ where: { parishId: { in: parishIds } } });
      await tx.catechismAttendance.deleteMany({ where: { parishId: { in: parishIds } } });
      await tx.catechismRite.deleteMany({ where: { parishId: { in: parishIds } } });
      await tx.catechismEnrollment.deleteMany({ where: { parishId: { in: parishIds } } });
      await tx.catechismSession.deleteMany({ where: { parishId: { in: parishIds } } });
      await tx.catechismGroup.deleteMany({ where: { parishId: { in: parishIds } } });
      await tx.familyMember.deleteMany({ where: { parishId: { in: parishIds } } });
      await tx.liturgicalSchedule.deleteMany({ where: { parishId: { in: parishIds } } });
      await tx.liturgicalAvailability.deleteMany({ where: { parishId: { in: parishIds } } });
      await tx.priestProfile.deleteMany({ where: { parishId: { in: parishIds } } });
    }
  });

  if (userIds.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }
  if (parishIds.length > 0) {
    await prisma.parish.deleteMany({ where: { id: { in: parishIds } } });
  }
}
