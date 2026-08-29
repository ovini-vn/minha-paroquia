"use server";

import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { revalidatePath } from "next/cache";
import { createSession, destroySession } from "@/server/auth/session";
import { requireSession } from "@/server/auth/guards";
import { registerUser, authenticateUser, updateOwnProfile } from "@/server/modules/users/service";
import { loginInputSchema, registerInputSchema, updateProfileInputSchema } from "@/server/modules/users/schema";
import { validateInvitation } from "@/server/modules/invitations/service";
import { tryAcceptInvitationIfPresent } from "@/server/modules/invitations/accept-if-present";
import { AppError } from "@/server/shared/errors";
import {
  createPasswordResetToken,
  resetPasswordWithToken,
} from "@/server/modules/users/password-reset-service";
import { sendPasswordResetEmail } from "@/server/email/password-reset-email";
import { appBaseUrl } from "@/lib/url";
import {
  consumirTentativa,
  limparTentativas,
  enderecoDeQuemChama,
  textoDeEspera,
} from "@/server/auth/rate-limit";

const QUINZE_MINUTOS = 15 * 60 * 1000;
const UMA_HORA = 60 * 60 * 1000;

/**
 * Duas chaves, porque contêm ataques diferentes.
 *
 * Por e-mail contém quem martela UMA conta. Por endereço contém quem
 * espalha tentativas por muitas contas — que passaria pelo limite de
 * e-mail sem encostar nele.
 *
 * O limite por endereço é bem mais folgado de propósito: a secretaria e o
 * pessoal da paróquia costumam sair pelo mesmo IP, e apertar aqui barraria
 * gente legítima em bloco.
 */
const LIMITE_LOGIN_POR_EMAIL = 8;
const LIMITE_LOGIN_POR_ENDERECO = 30;
const LIMITE_RECUPERACAO = 5;

export type ActionState = { error?: string };

function firstZodMessage(error: ZodError): string {
  return error.issues[0]?.message ?? "Dados inválidos.";
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

    /*
     * O limite é conferido ANTES de `authenticateUser`, e é aí que está o
     * ponto: essa função chama o Argon2, que gasta 19 MB de memória por
     * verificação, de propósito. Conferir depois protegeria a conta e
     * deixaria o servidor exposto — que é o risco maior.
     *
     * A mensagem é a mesma exista a conta ou não. Dizer "muitas tentativas
     * para este e-mail" só quando ele existe transformaria o próprio limite
     * num revelador de contas.
     */
    const email = input.email.toLowerCase();
    const endereco = await enderecoDeQuemChama();

    const porEmail = await consumirTentativa(
      `login:email:${email}`,
      LIMITE_LOGIN_POR_EMAIL,
      QUINZE_MINUTOS,
    );
    if (!porEmail.permitido) {
      return {
        error: `Muitas tentativas de entrada. Espere ${textoDeEspera(porEmail.segundosParaTentar)} e tente de novo.`,
      };
    }

    if (endereco) {
      const porEndereco = await consumirTentativa(
        `login:ip:${endereco}`,
        LIMITE_LOGIN_POR_ENDERECO,
        QUINZE_MINUTOS,
      );
      if (!porEndereco.permitido) {
        return {
          error: `Muitas tentativas deste aparelho. Espere ${textoDeEspera(porEndereco.segundosParaTentar)} e tente de novo.`,
        };
      }
    }

    const user = await authenticateUser(input);

    // Acertou: zera o contador daquele e-mail. Quem errou três vezes e
    // lembrou na quarta não deve ficar com o contador cheio para a próxima
    // sessão legítima. O contador por endereço fica — ele protege contra
    // varredura por muitas contas, e uma entrada certa não desmente isso.
    await limparTentativas(`login:email:${email}`);
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

export async function updateProfileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();

  try {
    const input = updateProfileInputSchema.parse({
      fullName: formData.get("fullName"),
      phone: formData.get("phone") || undefined,
      birthDate: formData.get("birthDate") || undefined,
      photoUrl: formData.get("photoUrl") || undefined,
    });

    await updateOwnProfile(session.userId, input);
  } catch (error) {
    if (error instanceof ZodError) return { error: firstZodMessage(error) };
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }

  revalidatePath("/eu");
  redirect("/eu");
}

export async function requestPasswordResetAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = (formData.get("email") as string | null)?.trim();
  if (!email) return { error: "Informe seu e-mail." };

  // Sem limite aqui, esta rota vira máquina de mandar e-mail em nome da
  // paróquia para qualquer endereço, quantas vezes se quiser.
  const endereco = await enderecoDeQuemChama();
  const chave = endereco ? `recuperar:ip:${endereco}` : `recuperar:email:${email.toLowerCase()}`;
  const limite = await consumirTentativa(chave, LIMITE_RECUPERACAO, UMA_HORA);
  if (!limite.permitido) {
    return {
      error: `Muitos pedidos de recuperação. Espere ${textoDeEspera(limite.segundosParaTentar)} e tente de novo.`,
    };
  }

  const path = await createPasswordResetToken(email);
  if (path) {
    const resetUrl = new URL(path, appBaseUrl()).toString();
    try {
      await sendPasswordResetEmail(email, resetUrl);
    } catch (error) {
      // Não propaga pro usuário — a tela seguinte é a mesma independente de
      // sucesso, de propósito (não revela se o e-mail existe nem se o envio
      // falhou). Falha real de envio fica só no log do servidor.
      console.error("Falha ao enviar e-mail de recuperação de acesso:", error);
    }
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
