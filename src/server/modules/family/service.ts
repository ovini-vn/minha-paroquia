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

/**
 * Exclui o cadastro do dependente. Guardiões saem em cascata junto.
 *
 * RECUSA se houver matrícula na catequese, e isso não é excesso de zelo:
 * FamilyMember → CatechismEnrollment → CatechismRite é tudo `onDelete:
 * Cascade`, então excluir apagaria em silêncio as presenças E os ritos —
 * a data da Primeira Eucaristia e da Crisma da criança. Some sem aviso e
 * não volta. Quem precisa desfazer uma matrícula faz isso pela catequese,
 * onde a consequência está à vista.
 */
export async function removeFamilyMember(parishId: string, familyMemberId: string, actingUserId: string) {
  return withTenantContext(parishId, async (tx) => {
    const isGuardian = await tx.familyMemberGuardian.findUnique({
      where: { familyMemberId_userId: { familyMemberId, userId: actingUserId } },
    });
    if (!isGuardian) throw new ValidationError("Você não é responsável por este dependente.");

    const matriculas = await tx.catechismEnrollment.count({ where: { familyMemberId } });
    if (matriculas > 0) {
      throw new ValidationError(
        "Este dependente está matriculado na catequese. Fale com a secretaria para desfazer a matrícula antes de excluir o cadastro.",
      );
    }

    return tx.familyMember.deleteMany({ where: { id: familyMemberId, parishId } });
  });
}

/** Só pra quem administra catequese (CATEQUESE_MANAGE) — matricular exige achar o dependente certo. */
export function listAllFamilyMembers(parishId: string) {
  return withTenantContext(parishId, (tx) =>
    tx.familyMember.findMany({
      where: { parishId },
      orderBy: { fullName: "asc" },
      include: { responsible: { select: { fullName: true } } },
      // guardianName cobre quem foi cadastrado pela secretaria e não tem
      // responsible: sem ele a lista mostraria só o nome, e dois alunos
      // homônimos ficariam indistinguíveis.
    }),
  );
}

// ---------------------------------------------------------------------------
// Cadastro feito pela secretaria — pessoa que ainda não usa o app
// ---------------------------------------------------------------------------

/**
 * Cadastra alguém que NÃO tem conta no aplicativo.
 *
 * É o caso normal da catequese: a criança é matriculada pela secretaria, e o
 * pai pode nunca baixar o app. Sem isso, matricular exigia que a família
 * primeiro se cadastrasse — o que trava o trabalho da paróquia numa coisa que
 * ela não controla.
 *
 * NÃO cria guardião de propósito. É essa ausência que mantém o registro fora
 * de "Minha família" de qualquer pessoa: o acesso do fiel sempre vem de
 * guardião, nunca de responsibleUserId. Se um dia a família entrar no app,
 * linkParishPersonToUser costura os dois lados sem refazer nada.
 */
export function createParishPerson(
  parishId: string,
  input: {
    fullName: string;
    birthDate?: Date | null;
    guardianName?: string | null;
    guardianPhone?: string | null;
  },
) {
  return withTenantContext(parishId, (tx) =>
    tx.familyMember.create({
      data: {
        parishId,
        responsibleUserId: null,
        relationship: null,
        fullName: input.fullName,
        birthDate: input.birthDate ?? null,
        guardianName: input.guardianName || null,
        guardianPhone: input.guardianPhone || null,
      },
    }),
  );
}

/**
 * Liga um cadastro da secretaria a uma conta do app.
 *
 * A partir daqui a pessoa passa a enxergar o dependente em "Minha família",
 * com o histórico de catequese que já existia — nada é recriado.
 */
export async function linkParishPersonToUser(
  parishId: string,
  familyMemberId: string,
  userId: string,
) {
  return withTenantContext(parishId, async (tx) => {
    const pessoa = await tx.familyMember.findFirst({ where: { id: familyMemberId, parishId } });
    if (!pessoa) throw new ValidationError("Cadastro não encontrado.");

    const jaTemGuardiao = await tx.familyMemberGuardian.count({ where: { familyMemberId } });
    if (jaTemGuardiao > 0) {
      throw new ValidationError(
        "Este cadastro já tem responsável no app. O próprio responsável pode adicionar outro pela tela da família.",
      );
    }

    await tx.familyMember.update({
      where: { id: familyMemberId },
      // relationship fica como "dependente": a secretaria não sabe o
      // parentesco exato, e quem foi vinculado pode corrigir depois.
      data: { responsibleUserId: userId, relationship: pessoa.relationship ?? "dependente" },
    });

    return tx.familyMemberGuardian.create({ data: { parishId, familyMemberId, userId } });
  });
}

/** Cadastros da secretaria que ninguém do app assumiu ainda. */
export function listUnlinkedParishPeople(parishId: string) {
  return withTenantContext(parishId, (tx) =>
    tx.familyMember.findMany({
      where: { parishId, guardians: { none: {} } },
      orderBy: { fullName: "asc" },
      include: { _count: { select: { enrollments: true } } },
    }),
  );
}

/**
 * Exclusão pela secretaria, para cadastro que ninguém do app assumiu.
 *
 * Recusa quem tem matrícula pela mesma razão de removeFamilyMember: o
 * histórico da catequese e os ritos iriam junto em cascata. E recusa quem já
 * tem guardião — a partir daí o cadastro é da família, e quem decide excluir
 * é ela, não a secretaria.
 */
export async function removeParishPerson(parishId: string, familyMemberId: string) {
  return withTenantContext(parishId, async (tx) => {
    const guardioes = await tx.familyMemberGuardian.count({ where: { familyMemberId } });
    if (guardioes > 0) {
      throw new ValidationError(
        "Este cadastro já tem responsável no app. A exclusão passa a ser dele, pela tela da família.",
      );
    }

    const matriculas = await tx.catechismEnrollment.count({ where: { familyMemberId } });
    if (matriculas > 0) {
      throw new ValidationError(
        "Esta pessoa está matriculada na catequese. Desfaça a matrícula antes de excluir o cadastro.",
      );
    }

    return tx.familyMember.deleteMany({ where: { id: familyMemberId, parishId } });
  });
}
