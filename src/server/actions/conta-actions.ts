"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireSession } from "@/server/auth/guards";
import { SESSION_COOKIE_NAME } from "@/server/auth/session";
import { excluirMinhaConta } from "@/server/modules/conta/exclusao";
import { AppError } from "@/server/shared/errors";

export type ExclusaoState = { error?: string };

/** Excluir a própria conta. As sessões já saem no serviço; aqui sai o cookie. */
export async function excluirMinhaContaAction(_prev: ExclusaoState, formData: FormData): Promise<ExclusaoState> {
  const session = await requireSession();
  try {
    await excluirMinhaConta(session.userId, String(formData.get("confirmacao") ?? ""));
  } catch (error) {
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }
  (await cookies()).delete(SESSION_COOKIE_NAME);
  redirect("/login?conta=excluida");
}
