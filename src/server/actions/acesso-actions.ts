"use server";

import { requireSession } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import { criarLinkDeNovaSenhaParaMembro } from "@/server/modules/users/password-reset-service";
import { appBaseUrl } from "@/lib/url";

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
