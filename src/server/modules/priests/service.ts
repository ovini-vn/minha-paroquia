import { withTenantContext } from "@/server/db/tenant-context";
import { getAvailableSlots } from "@/server/modules/appointments/service";

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

/**
 * Os sacerdotes, cada um com quantos horários tem abertos.
 *
 * A contagem existe para a lista poder dizer a verdade ANTES do toque.
 * Sem ela, quem procura confissão escolhia um nome, chegava na tela de
 * agendar e só ali descobria que aquele padre não abriu horário nenhum —
 * e voltava para tentar outro, no escuro de novo.
 */
export async function listPriestsWithOpenings(parishId: string) {
  const priests = await listPriests(parishId);

  // Uma consulta por sacerdote. São poucos por paróquia — dois, três — e o
  // cálculo de vagas depende dos atendimentos já marcados de cada um.
  return Promise.all(
    priests.map(async (priest) => ({
      ...priest,
      vagas: (await getAvailableSlots(parishId, priest.id)).length,
    })),
  );
}

/**
 * O que este sacerdote atende pelo aplicativo.
 *
 * Fica no perfil, e não deduzido das janelas cadastradas, porque as duas
 * coisas respondem perguntas diferentes: janela diz QUANDO, isto diz SE.
 * Um padre que confessa todo sábado mas ainda não abriu a agenda precisa
 * aparecer como quem confessa — deduzir das janelas diria o contrário.
 */
export function definirOQueAtende(
  parishId: string,
  priestProfileId: string,
  valores: { ofereceAtendimento: boolean; ofereceConfissao: boolean },
) {
  return withTenantContext(parishId, (tx) =>
    tx.priestProfile.update({
      where: { id: priestProfileId },
      data: valores,
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
