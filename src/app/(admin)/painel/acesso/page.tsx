import { KeyRound } from "lucide-react";
import { requirePermissionForPage } from "@/server/auth/guards";
import { PERMISSIONS, ROLES_QUE_ADMINISTRAM, type RoleCode } from "@/server/auth/rbac";
import { listActiveMembers } from "@/server/modules/parishes/service";
import { PageHeader } from "@/components/ui/Typography";
import { EmptyState } from "@/components/ui/EmptyState";
import { GerarLinkForm } from "./GerarLinkForm";

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
export default async function AcessoPage() {
  const session = await requirePermissionForPage(PERMISSIONS.MEMBER_PASSWORD_RESET);
  if (!session.membership) return null;

  const podeGerenciarPermissoes = session.permissions.includes(
    PERMISSIONS.PERMISSION_OVERRIDES_MANAGE,
  );

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
        title="Esqueci minha senha"
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
