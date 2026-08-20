"use server";

import { revalidatePath } from "next/cache";
import { requireSession, requirePermission } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import {
  createGroup,
  setGroupStatus,
  expressGroupInterest,
  withdrawGroupInterest,
} from "@/server/modules/pastorais/service";
import { AppError } from "@/server/shared/errors";

export type ActionState = { error?: string };

// Pastorais são estrutura da paróquia — quem gerencia oportunidades de
// serviço também gerencia pastorais.
const MANAGE = PERMISSIONS.OPPORTUNITIES_MANAGE;

export async function createPastoralGroupAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();
  if (!session.membership) return { error: "Você precisa pertencer a uma paróquia." };
  requirePermission(session, MANAGE);

  try {
    await createGroup(session.membership.parishId, session.userId, {
      name: (formData.get("name") as string) ?? "",
      description: formData.get("description") as string | null,
      leaderName: formData.get("leaderName") as string | null,
      meetsWhen: formData.get("meetsWhen") as string | null,
      meetsWhere: formData.get("meetsWhere") as string | null,
    });
  } catch (error) {
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }

  revalidatePath("/painel/pastorais");
  revalidatePath("/comunidade/pastorais");
  return {};
}

export async function setPastoralGroupStatusAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  if (!session.membership) return;
  requirePermission(session, MANAGE);

  const id = formData.get("id") as string;
  const status = formData.get("status") === "inativa" ? "inativa" : "ativa";
  await setGroupStatus(session.membership.parishId, id, status);

  revalidatePath("/painel/pastorais");
  revalidatePath("/comunidade/pastorais");
}

export async function expressPastoralInterestAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  if (!session.membership) return;

  const groupId = formData.get("groupId") as string;
  await expressGroupInterest(session.membership.parishId, groupId, session.userId);
  revalidatePath("/comunidade/pastorais");
}

export async function withdrawPastoralInterestAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  if (!session.membership) return;

  const groupId = formData.get("groupId") as string;
  await withdrawGroupInterest(session.membership.parishId, groupId, session.userId);
  revalidatePath("/comunidade/pastorais");
}
