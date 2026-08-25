import { withTenantContext } from "@/server/db/tenant-context";

export { ensurePriestProfile, isPriestRole } from "./ensure-priest-profile";

export function listPriests(parishId: string) {
  return withTenantContext(parishId, (tx) =>
    tx.priestProfile.findMany({
      where: { parishId },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
      include: { user: { select: { fullName: true, photoUrl: true } } },
    }),
  );
}

export function getPriestProfile(parishId: string, id: string) {
  return withTenantContext(parishId, (tx) =>
    tx.priestProfile.findFirst({
      where: { id, parishId },
      include: { user: { select: { fullName: true, photoUrl: true } } },
    }),
  );
}

/** Usado para saber "sou eu mesmo um sacerdote nesta paróquia" (ex.: publicar Palavra do Padre). */
export function getOwnPriestProfile(parishId: string, userId: string) {
  return withTenantContext(parishId, (tx) =>
    tx.priestProfile.findUnique({ where: { userId_parishId: { userId, parishId } } }),
  );
}

/**
 * O pároco da paróquia — quem responde por ela.
 *
 * Sai do papel na filiação, e não de um campo escolhido à mão: quando a
 * secretaria troca o pároco em Membros e papéis, esta tela acompanha
 * sozinha, sem ficar apontando para quem já foi transferido.
 */
export async function getParoco(parishId: string) {
  return withTenantContext(parishId, async (tx) => {
    const filiacao = await tx.parishMembership.findFirst({
      where: { parishId, status: "active", role: { code: "PAROCO" } },
      select: { userId: true },
    });
    if (!filiacao) return null;

    return tx.priestProfile.findUnique({
      where: { userId_parishId: { userId: filiacao.userId, parishId } },
      include: { user: { select: { fullName: true, photoUrl: true } } },
    });
  });
}

/** Apresentação do sacerdote: título, história e retrato. */
export function updatePriestProfile(
  parishId: string,
  priestProfileId: string,
  dados: { title: string; bio: string | null; photoUrl: string | null },
) {
  return withTenantContext(parishId, (tx) =>
    // O parishId no where fecha a porta para editar o perfil de outra
    // paróquia mandando um id de fora no formulário.
    tx.priestProfile.updateMany({ where: { id: priestProfileId, parishId }, data: dados }),
  );
}
