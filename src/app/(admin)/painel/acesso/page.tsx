import type { Metadata } from "next";
import { KeyRound } from "lucide-react";
import { requirePermissionForPage } from "@/server/auth/guards";
import { PERMISSIONS, ROLES_QUE_ADMINISTRAM, type RoleCode } from "@/server/auth/rbac";
import { listActiveMembers } from "@/server/modules/parishes/service";
import { PageHeader } from "@/components/ui/Typography";
import { EmptyState } from "@/components/ui/EmptyState";
import { GerarLinkForm } from "./GerarLinkForm";
import { ReiniciarForm } from "./ReiniciarForm";
import { listarContasReiniciaveis } from "@/server/modules/onboarding/service";
import { Eyebrow } from "@/components/ui/Typography";

/**
 * Quando alguém esquece a senha.
 *
 * A recuperação por e-mail não funciona: depende de domínio verificado, que
 * a plataforma ainda não tem. Sem esta tela, quem esquece a senha não volta
 * — e numa comunidade com gente mais velha isso acontece na primeira
 * semana. Era o único item que travava um piloto de verdade.
 *
 * A secretaria vê aqui só quem ela pode atender. Contas que ADMINISTRAM a
 * paróquia ficam de fora da lista dela, porque gerar link de nova senha é
 * tomar a conta: sem essa separação, a secretaria assumiria a paróquia.
 */
export const metadata: Metadata = { title: "Ajudar quem não consegue entrar" };

export default async function AcessoPage() {
  const session = await requirePermissionForPage(PERMISSIONS.MEMBER_PASSWORD_RESET);
  if (!session.membership) return null;

  const podeGerenciarPermissoes = session.permissions.includes(
    PERMISSIONS.PERMISSION_OVERRIDES_MANAGE,
  );

  const reiniciaveis = await listarContasReiniciaveis(session.membership.parishId);

  const membros = (await listActiveMembers(session.membership.parishId))
    // A lista já reflete o que o servidor vai aceitar. Mostrar um nome que
    // seria recusado no envio é fazer a pessoa descobrir a regra errando.
    .filter(
      (m) =>
        podeGerenciarPermissoes || !ROLES_QUE_ADMINISTRAM.includes(m.role.code as RoleCode),
    )
    .map((m) => ({ id: m.user.id, nome: m.user.fullName, papel: m.role.name }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Ajudar quem não consegue entrar"
        description="Gere um link para quem não consegue entrar. A pessoa escolhe a nova senha por conta própria."
      />

      {membros.length === 0 ? (
        <EmptyState
          icon={KeyRound}
          title="Nenhuma conta que você possa atender"
          description="Contas que administram a paróquia só podem ser atendidas pelo pároco."
        />
      ) : (
        <GerarLinkForm membros={membros} />
      )}

      {/*
        Reiniciar o cadastro mora AQUI, e não numa tela própria.

        É a mesma pergunta de quem chega ao balcão — "não consigo entrar",
        "entrei na paróquia errada" —, feita pela mesma pessoa, com a mesma
        permissão. Uma tela só para isto seria mais um destino na barra
        para uma tarefa que se faz junto com a outra.
      */}
      <section className="pt-2">
        <Eyebrow tone="accent" className="mb-3">
          Voltar alguém ao começo
        </Eyebrow>
        <p className="mb-3 text-[13px] leading-relaxed text-muted">
          Apaga o vínculo com a paróquia e as boas-vindas já vistas. A conta e a senha continuam
          valendo — no próximo acesso a pessoa escolhe a paróquia e vê as boas-vindas de novo.
          Serve para quem entrou na paróquia errada, e para testar o cadastro.
        </p>
        {reiniciaveis.length === 0 ? (
          <p className="text-[13px] text-muted">
            Nenhuma conta desta paróquia pode ser reiniciada agora.
          </p>
        ) : (
          <ReiniciarForm contas={reiniciaveis} />
        )}
      </section>

      <div className="rounded-lg border border-border bg-sunken px-4 py-3.5">
        <p className="text-[13px] leading-relaxed text-muted">
          O link vale por uma hora e serve uma única vez. Ao ser usado, as sessões abertas daquela
          conta são encerradas — quem estava logado precisa entrar de novo com a senha nova.
          {!podeGerenciarPermissoes &&
            " Para contas que administram a paróquia, peça ao pároco."}
        </p>
      </div>
    </div>
  );
}
