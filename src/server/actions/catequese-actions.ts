"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { requireSession, requirePermission } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import {
  createGroup,
  enrollFamilyMember,
  createSession,
  recordAttendance,
  createRite,
  completeRite,
  setMassAttendance,
  getGroup,
  getEnrollmentProgress,
  requireEnrollmentAccess,
  requireSessionAccess,
  requireRiteAccess,
} from "@/server/modules/catequese/service";
import { createGroupInputSchema, createSessionInputSchema, createRiteInputSchema } from "@/server/modules/catequese/schema";
import {
  createParishPerson,
  linkParishPersonToUser,
  removeParishPerson,
} from "@/server/modules/family/service";
import { AppError } from "@/server/shared/errors";
import type { SessionContext } from "@/server/auth/session";

export type ActionState = { error?: string };

/**
 * Quem coordena alcança qualquer turma; quem só leciona, apenas as suas.
 *
 * Decide pela PERMISSÃO, não pelo papel. Antes isto era
 * `isFullAdmin(roleCode)`, que é só Pároco e Secretaria — apesar de o
 * comentário já dizer "CATEQUESE_MANAGE enxerga tudo". A diferença passou a
 * importar com o papel Coordenador de Catequese, que tem a permissão e não
 * é "full admin": ele seria tratado como catequista comum na própria área
 * que coordena.
 */
function coordenaCatequese(session: SessionContext): boolean {
  return session.isPlatformAdmin || session.permissions.includes(PERMISSIONS.CATEQUESE_MANAGE);
}

/** undefined = alcança qualquer turma; userId = restrito às próprias. */
function catechistScope(session: SessionContext): string | undefined {
  return coordenaCatequese(session) ? undefined : session.userId;
}

export async function createGroupAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  if (!session.membership) return { error: "Você precisa pertencer a uma paróquia." };
  requirePermission(session, PERMISSIONS.CATEQUESE_MANAGE);

  try {
    const catechistUserId = formData.get("catechistUserId");
    const input = createGroupInputSchema.parse({
      name: formData.get("name"),
      year: formData.get("year"),
      catechistUserId: catechistUserId ? catechistUserId : undefined,
    });

    await createGroup({ ...input, parishId: session.membership.parishId });
  } catch (error) {
    if (error instanceof ZodError) return { error: error.issues[0]?.message ?? "Dados inválidos." };
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }

  revalidatePath("/catequese");
  return {};
}

export async function enrollFamilyMemberAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  if (!session.membership) return { error: "Você precisa pertencer a uma paróquia." };
  requirePermission(session, PERMISSIONS.CATEQUESE_MANAGE);

  const groupId = formData.get("groupId") as string;
  const familyMemberId = formData.get("familyMemberId") as string;
  if (!familyMemberId) return { error: "Escolha um dependente." };

  try {
    await enrollFamilyMember(session.membership.parishId, groupId, familyMemberId);
  } catch (error) {
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }

  revalidatePath(`/catequese/turma/${groupId}`);
  return {};
}

export async function createSessionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  if (!session.membership) return { error: "Você precisa pertencer a uma paróquia." };
  if (!session.permissions.includes(PERMISSIONS.CATEQUESE_MANAGE) && !session.permissions.includes(PERMISSIONS.CATEQUESE_TEACH)) {
    return { error: "Você não tem permissão para isso." };
  }

  const groupId = formData.get("groupId") as string;

  try {
    const input = createSessionInputSchema.parse({
      date: formData.get("date"),
      topic: formData.get("topic") || undefined,
    });

    await createSession(session.membership.parishId, groupId, input, catechistScope(session));
  } catch (error) {
    if (error instanceof ZodError) return { error: error.issues[0]?.message ?? "Dados inválidos." };
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }

  revalidatePath(`/catequese/turma/${groupId}`);
  return {};
}

export async function recordAttendanceAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  if (!session.membership) return;
  if (!session.permissions.includes(PERMISSIONS.CATEQUESE_MANAGE) && !session.permissions.includes(PERMISSIONS.CATEQUESE_TEACH)) {
    return;
  }

  const sessionId = formData.get("sessionId") as string;
  const enrollmentIds = formData.getAll("enrollmentId") as string[];
  const entries = enrollmentIds.map((enrollmentId) => ({
    enrollmentId,
    present: formData.get(`present_${enrollmentId}`) === "on",
  }));

  try {
    // A permissão diz "é catequista", não "é catequista DESTA turma".
    // groupId vem daqui, não do formulário: o do formulário é palpite do
    // cliente.
    const groupId = await requireSessionAccess(
      session.membership.parishId,
      sessionId,
      session.userId,
      coordenaCatequese(session),
    );
    await recordAttendance(session.membership.parishId, sessionId, entries);
    revalidatePath(`/catequese/turma/${groupId}`);
  } catch {
    // Ação sem retorno: falha silenciosa é o comportamento existente aqui.
    return;
  }
}

export async function createRiteAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  if (!session.membership) return { error: "Você precisa pertencer a uma paróquia." };
  if (!session.permissions.includes(PERMISSIONS.CATEQUESE_MANAGE) && !session.permissions.includes(PERMISSIONS.CATEQUESE_TEACH)) {
    return { error: "Você não tem permissão para isso." };
  }

  const enrollmentId = formData.get("enrollmentId") as string;

  try {
    // Rito é registro de sacramento. Sem esta checagem, um catequista
    // registraria "Crisma realizada" para criança de outra turma.
    await requireEnrollmentAccess(
      session.membership.parishId,
      enrollmentId,
      session.userId,
      coordenaCatequese(session),
    );

    const input = createRiteInputSchema.parse({
      name: formData.get("name"),
      scheduledAt: formData.get("scheduledAt") || undefined,
    });

    await createRite(session.membership.parishId, enrollmentId, input);
  } catch (error) {
    if (error instanceof ZodError) return { error: error.issues[0]?.message ?? "Dados inválidos." };
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }

  revalidatePath("/catequese");
  return {};
}

export async function completeRiteAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  if (!session.membership) return;
  if (!session.permissions.includes(PERMISSIONS.CATEQUESE_MANAGE) && !session.permissions.includes(PERMISSIONS.CATEQUESE_TEACH)) {
    return;
  }

  const riteId = formData.get("riteId") as string;
  try {
    await requireRiteAccess(
      session.membership.parishId,
      riteId,
      session.userId,
      coordenaCatequese(session),
    );
  } catch {
    return;
  }
  await completeRite(session.membership.parishId, riteId);
  revalidatePath("/catequese");
}

export type PersonActionState = { error?: string; ok?: string };

/**
 * Cadastra um catequizando que não tem conta no app.
 *
 * Fica em catequese-actions e não em family-actions porque a permissão é a
 * da catequese: é a secretaria trabalhando, não um fiel cuidando da própria
 * família.
 */
export async function createParishPersonAction(
  _prev: PersonActionState,
  formData: FormData,
): Promise<PersonActionState> {
  const session = await requireSession();
  if (!session.membership) return { error: "Você precisa pertencer a uma paróquia." };
  requirePermission(session, PERMISSIONS.CATEQUESE_MANAGE);

  const fullName = ((formData.get("fullName") as string) ?? "").trim();
  if (fullName.length < 2) return { error: "Informe o nome completo." };

  const birthDateRaw = (formData.get("birthDate") as string) ?? "";

  try {
    await createParishPerson(session.membership.parishId, {
      fullName,
      birthDate: birthDateRaw ? new Date(birthDateRaw) : null,
      guardianName: ((formData.get("guardianName") as string) ?? "").trim() || null,
      guardianPhone: ((formData.get("guardianPhone") as string) ?? "").trim() || null,
    });
  } catch (error) {
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }

  revalidatePath("/catequese");
  return { ok: `${fullName} cadastrado. Já pode ser matriculado numa turma.` };
}

export async function linkParishPersonAction(
  _prev: PersonActionState,
  formData: FormData,
): Promise<PersonActionState> {
  const session = await requireSession();
  if (!session.membership) return { error: "Você precisa pertencer a uma paróquia." };
  requirePermission(session, PERMISSIONS.CATEQUESE_MANAGE);

  const familyMemberId = formData.get("familyMemberId") as string;
  const userId = formData.get("userId") as string;
  if (!familyMemberId || !userId) return { error: "Escolha a pessoa e a conta." };

  try {
    await linkParishPersonToUser(session.membership.parishId, familyMemberId, userId);
  } catch (error) {
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }

  revalidatePath("/catequese");
  return { ok: "Vinculado. O responsável já enxerga o cadastro em Minha família." };
}

export async function removeParishPersonAction(
  _prev: PersonActionState,
  formData: FormData,
): Promise<PersonActionState> {
  const session = await requireSession();
  if (!session.membership) return { error: "Você precisa pertencer a uma paróquia." };
  requirePermission(session, PERMISSIONS.CATEQUESE_MANAGE);

  const familyMemberId = formData.get("familyMemberId") as string;
  if (!familyMemberId) return { error: "Cadastro não informado." };

  try {
    await removeParishPerson(session.membership.parishId, familyMemberId);
  } catch (error) {
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }

  revalidatePath("/catequese");
  return { ok: "Cadastro excluído." };
}

export type MassAttendanceState = { error?: string; ok?: string };

/**
 * Lança a presença de um catequizando na missa.
 *
 * Autoriza pela TURMA, não só pela permissão: quem apenas leciona precisa
 * ser catequista daquela turma. Sem isso, um catequista lançaria presença
 * para aluno de turma alheia.
 */
export async function setMassAttendanceAction(
  _prev: MassAttendanceState,
  formData: FormData,
): Promise<MassAttendanceState> {
  const session = await requireSession();
  if (!session.membership) return { error: "Você precisa pertencer a uma paróquia." };

  const parishId = session.membership.parishId;
  const coordena =
    session.isPlatformAdmin || session.permissions.includes(PERMISSIONS.CATEQUESE_MANAGE);
  const leciona =
    session.isPlatformAdmin || session.permissions.includes(PERMISSIONS.CATEQUESE_TEACH);
  if (!coordena && !leciona) return { error: "Você não pode lançar presença." };

  const enrollmentId = formData.get("enrollmentId") as string;
  const attendedOnRaw = formData.get("attendedOn") as string;
  const celebrationId = (formData.get("celebrationId") as string) || null;
  if (!enrollmentId || !attendedOnRaw) return { error: "Informe o dia da missa." };

  const attendedOn = new Date(`${attendedOnRaw}T00:00:00.000Z`);
  if (Number.isNaN(attendedOn.getTime())) return { error: "Data inválida." };

  try {
    const progresso = await getEnrollmentProgress(parishId, enrollmentId);
    if (!progresso) return { error: "Matrícula não encontrada." };

    if (!coordena) {
      const daMinhaTurma = await getGroup(
        parishId,
        progresso.enrollment.catechismGroupId,
        session.userId,
      );
      if (!daMinhaTurma) return { error: "Esta turma não é sua." };
    }

    await setMassAttendance(parishId, enrollmentId, attendedOn, true, session.userId, celebrationId);
  } catch (error) {
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }

  revalidatePath(`/catequese/aluno/${enrollmentId}`);
  return { ok: "Presença lançada." };
}
