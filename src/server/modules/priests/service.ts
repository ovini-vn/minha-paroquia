import { withTenantContext } from "@/server/db/tenant-context";
import { getAvailableSlots } from "@/server/modules/appointments/service";
import { NotFoundError, ValidationError } from "@/server/shared/errors";

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
 * Cadastra um sacerdote que NÃO usa o aplicativo.
 *
 * O caminho de quem usa continua sendo o papel na filiação — convite ou
 * troca em Membros e papéis —, e é ele que cria o perfil com conta. Este
 * aqui é para o padre que não vai entrar: o pároco desta paróquia é um
 * deles, e a comunidade precisava vê-lo em "Falar com um sacerdote".
 *
 * O nome é obrigatório porque é a única identificação que sobra. O banco
 * também exige, por CHECK: conta OU nome, nunca nenhum dos dois.
 */
export function cadastrarSacerdoteSemConta(
  parishId: string,
  input: { nome: string; title: string },
) {
  return withTenantContext(parishId, async (tx) => {
    const nome = input.nome.trim();
    if (!nome) throw new ValidationError("Escreva o nome do sacerdote.");

    const quantos = await tx.priestProfile.count({ where: { parishId } });
    return tx.priestProfile.create({
      data: {
        parishId,
        userId: null,
        nome,
        title: input.title.trim() || "Sacerdote",
        displayOrder: quantos + 1,
      },
    });
  });
}

/**
 * Apaga um perfil de sacerdote SEM CONTA.
 *
 * Só os sem conta: quem tem conta ganhou o perfil pelo papel na filiação,
 * e apagar aqui deixaria a pessoa com papel de sacerdote e sem perfil —
 * um estado que nenhuma tela sabe mostrar. Para esses, o caminho é trocar
 * o papel em Membros e papéis.
 */
export function apagarSacerdoteSemConta(parishId: string, id: string) {
  return withTenantContext(parishId, async (tx) => {
    const perfil = await tx.priestProfile.findFirst({ where: { id, parishId } });
    if (!perfil) throw new NotFoundError("Sacerdote");
    if (perfil.userId) {
      throw new ValidationError(
        "Este sacerdote tem conta no aplicativo. Mude o papel dele em Membros e papéis.",
      );
    }
    return tx.priestProfile.delete({ where: { id: perfil.id } });
  });
}

/**
 * A secretaria define o que um sacerdote SEM CONTA atende.
 *
 * Quem tem conta faz isso sozinho em "Minha disponibilidade", e continua
 * sendo o único a poder — configuração de alguém não se mexe por fora.
 * Mas um padre sem conta não tem tela própria: sem esta porta, ele ficaria
 * para sempre como "Sem horários", que é exatamente a ambiguidade que os
 * dois campos existem para desfazer.
 */
export function definirOQueAtendeSemConta(
  parishId: string,
  priestProfileId: string,
  valores: { ofereceAtendimento: boolean; ofereceConfissao: boolean },
) {
  return withTenantContext(parishId, async (tx) => {
    const perfil = await tx.priestProfile.findFirst({ where: { id: priestProfileId, parishId } });
    if (!perfil) throw new NotFoundError("Sacerdote");
    if (perfil.userId) {
      throw new ValidationError(
        "Este sacerdote usa o aplicativo e define isso em Minha disponibilidade.",
      );
    }
    return tx.priestProfile.update({ where: { id: perfil.id }, data: valores });
  });
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
