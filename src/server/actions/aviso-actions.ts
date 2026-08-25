"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { requireSession, requirePermission } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import { createAviso, updateAviso, setAvisoStatus, deleteAviso } from "@/server/modules/avisos/service";
import { createAvisoInputSchema, updateAvisoInputSchema } from "@/server/modules/avisos/schema";
import { AppError } from "@/server/shared/errors";

export type ActionState = { error?: string };

function revalidateAvisoPaths() {
  revalidatePath("/painel/avisos");
  revalidatePath("/painel");
  revalidatePath("/comunidade");
  revalidatePath("/inicio");
}

export async function createAvisoAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  if (!session.membership) return { error: "Você precisa pertencer a uma paróquia." };
  requirePermission(session, PERMISSIONS.AVISOS_MANAGE);

  try {
    const input = createAvisoInputSchema.parse({
      title: formData.get("title"),
      body: formData.get("body"),
    });

    await createAviso({ ...input, parishId: session.membership.parishId, createdBy: session.userId });
  } catch (error) {
    if (error instanceof ZodError) return { error: error.issues[0]?.message ?? "Dados inválidos." };
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }

  revalidateAvisoPaths();
  return {};
}

export async function updateAvisoAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  if (!session.membership) return { error: "Você precisa pertencer a uma paróquia." };
  requirePermission(session, PERMISSIONS.AVISOS_MANAGE);

  const id = formData.get("id") as string;

  try {
    const input = updateAvisoInputSchema.parse({
      title: formData.get("title"),
      body: formData.get("body"),
    });

    await updateAviso(session.membership.parishId, id, input);
  } catch (error) {
    if (error instanceof ZodError) return { error: error.issues[0]?.message ?? "Dados inválidos." };
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }

  revalidateAvisoPaths();
  redirect("/painel/avisos");
}

export async function setAvisoStatusAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  if (!session.membership) return;
  requirePermission(session, PERMISSIONS.AVISOS_MANAGE);

  const id = formData.get("id") as string;
  const status = formData.get("status") as "published" | "archived";
  await setAvisoStatus(session.membership.parishId, id, status);

  revalidateAvisoPaths();
}

/** Apagar de vez — para duplicata e teste, não para aviso que cumpriu seu papel. */
export async function excluirAvisoAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  if (!session.membership) return;
  requirePermission(session, PERMISSIONS.AVISOS_MANAGE);

  const id = formData.get("id") as string;
  if (!id) return;
  await deleteAviso(session.membership.parishId, id);

  revalidateAvisoPaths();
}
