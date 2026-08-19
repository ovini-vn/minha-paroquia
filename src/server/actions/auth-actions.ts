"use server";

import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { createSession, destroySession } from "@/server/auth/session";
import { registerUser, authenticateUser } from "@/server/modules/users/service";
import { loginInputSchema, registerInputSchema } from "@/server/modules/users/schema";
import { acceptInvitation, validateInvitation } from "@/server/modules/invitations/service";
import { AppError } from "@/server/shared/errors";
import {
  createPasswordResetToken,
  resetPasswordWithToken,
} from "@/server/modules/users/password-reset-service";

export type ActionState = { error?: string };

function firstZodMessage(error: ZodError): string {
  return error.issues[0]?.message ?? "Dados inválidos.";
}

/**
 * Se um código de convite acompanha o cadastro/login, tenta aceitar a
 * comunidade logo em seguida. Falha aqui não desfaz a conta/login — o
 * usuário só cai numa Home sem comunidade ativa, que orienta a pedir um
 * novo convite.
 */
async function tryAcceptInvitationIfPresent(userId: string, code: string | null) {
  if (!code) return;
  try {
    await acceptInvitation({ code, userId });
  } catch {
    // silencioso de propósito: a Home cobre o estado "sem comunidade ativa".
  }
}

export async function registerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const inviteCode = (formData.get("convite") as string | null)?.trim() || null;

  if (inviteCode) {
    const validation = await validateInvitation(inviteCode);
    if (!validation.valid) {
      return { error: "Este convite não é mais válido. Peça um novo à sua paróquia." };
    }
  }

  try {
    const input = registerInputSchema.parse({
      fullName: formData.get("fullName"),
      email: formData.get("email"),
      password: formData.get("password"),
    });

    const user = await registerUser(input);
    await createSession(user.id);
    await tryAcceptInvitationIfPresent(user.id, inviteCode);
  } catch (error) {
    if (error instanceof ZodError) return { error: firstZodMessage(error) };
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }

  redirect("/inicio");
}

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const inviteCode = (formData.get("convite") as string | null)?.trim() || null;

  try {
    const input = loginInputSchema.parse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    const user = await authenticateUser(input);
    await createSession(user.id);
    await tryAcceptInvitationIfPresent(user.id, inviteCode);
  } catch (error) {
    if (error instanceof ZodError) return { error: firstZodMessage(error) };
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }

  redirect("/inicio");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}

export async function requestPasswordResetAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = (formData.get("email") as string | null)?.trim();
  if (!email) return { error: "Informe seu e-mail." };

  const link = await createPasswordResetToken(email);
  // Sem provedor de e-mail configurado ainda (docs/FUNDACAO.md, decisão 5):
  // o link fica só no log do servidor em dev.
  if (link) {
    console.log(`[dev] Link de recuperação de acesso: ${link}`);
  }

  redirect("/recuperar-acesso/enviado");
}

export async function resetPasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const token = formData.get("token") as string;
    const password = formData.get("password") as string;
    await resetPasswordWithToken(token, password);
  } catch (error) {
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }

  redirect("/login");
}
