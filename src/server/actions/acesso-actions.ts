"use server";

import { requireSession } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import { criarLinkDeNovaSenhaParaMembro } from "@/server/modules/users/password-reset-service";
import { appBaseUrl } from "@/lib/url";
import { reiniciarOnboarding } from "@/server/modules/onboarding/service";
import { AppError } from "@/server/shared/errors";
import { revalidatePath } from "next/cache";

export type EstadoDoLink = {
  erro?: string;
  gerado?: { nome: string; url: string; expiraEm: string };
};

/**
 * Gera o link de nova senha de um membro, para a secretaria copiar e passar.
 *
 * O formulário manda o ID de um MEMBRO, nunca um e-mail: quem escolhe é uma
 * lista de gente da própria paróquia, e o serviço confere o vínculo de novo
 * do lado de cá. Aceitar e-mail digitado abriria a porta para gerar acesso
 * a qualquer conta da plataforma.
 *
 * A URL completa é montada aqui porque o serviço devolve só o caminho — quem
 * conhece o endereço público da aplicação é a camada de cima.
 */
export async function gerarLinkDeNovaSenhaAction(
  _anterior: EstadoDoLink,
  formData: FormData,
): Promise<EstadoDoLink> {
  const session = await requireSession();
  if (!session.membership) return { erro: "Você precisa pertencer a uma paróquia." };

  if (!session.permissions.includes(PERMISSIONS.MEMBER_PASSWORD_RESET)) {
    return { erro: "Você não tem permissão para gerar link de nova senha." };
  }

  const alvoUserId = String(formData.get("userId") ?? "");
  if (!alvoUserId) return { erro: "Escolha de quem é a conta." };

  const resultado = await criarLinkDeNovaSenhaParaMembro(
    session.membership.parishId,
    alvoUserId,
    {
      userId: session.userId,
      podeGerenciarPermissoes: session.permissions.includes(
        PERMISSIONS.PERMISSION_OVERRIDES_MANAGE,
      ),
    },
  );

  if (!resultado.ok) {
    return {
      erro:
        resultado.motivo === "nao-e-membro"
          ? "Esta pessoa não é membro ativo da sua paróquia."
          : "Só o pároco pode gerar link para quem administra a paróquia.",
    };
  }

  return {
    gerado: {
      nome: resultado.nome,
      url: new URL(resultado.caminho, appBaseUrl()).toString(),
      expiraEm: resultado.expiraEm.toISOString(),
    },
  };
}

export type EstadoDoReinicio = { erro?: string; ok?: string };

/**
 * Devolve uma conta ao começo do onboarding.
 *
 * Mesma permissão do link de nova senha, e pela mesma razão: as duas são
 * "ajudar alguém com o acesso", feitas por quem atende no balcão. Criar um
 * código de permissão só para esta obrigaria a conceder mais uma coisa a
 * quem já pode a outra.
 *
 * As travas moram no serviço, não aqui: conta de outra paróquia, conta com
 * histórico e conta em duas paróquias são recusadas lá, onde o dado é
 * escrito, e não na tela que por acaso chamou.
 */
export async function reiniciarOnboardingAction(
  _anterior: EstadoDoReinicio,
  formData: FormData,
): Promise<EstadoDoReinicio> {
  const session = await requireSession();
  if (!session.membership) return { erro: "Você precisa pertencer a uma paróquia." };

  if (!session.permissions.includes(PERMISSIONS.MEMBER_PASSWORD_RESET)) {
    return { erro: "Você não tem permissão para reiniciar o cadastro de alguém." };
  }

  const userId = String(formData.get("userId") ?? "");
  if (!userId) return { erro: "Escolha uma pessoa." };

  /*
   * Reiniciar a SI MESMO derrubaria o próprio vínculo — e com ele o acesso
   * ao painel, no meio da operação. Quem quer testar o próprio onboarding
   * pede a outra pessoa da secretaria, ou usa uma segunda conta.
   */
  if (userId === session.userId) {
    return { erro: "Você não pode reiniciar a sua própria conta: perderia o acesso ao painel." };
  }

  try {
    const { nome } = await reiniciarOnboarding(session.membership.parishId, userId, session.userId);
    revalidatePath("/painel/acesso");
    return { ok: `${nome} volta ao começo no próximo acesso.` };
  } catch (erro) {
    if (erro instanceof AppError) return { erro: erro.message };
    throw erro;
  }
}
