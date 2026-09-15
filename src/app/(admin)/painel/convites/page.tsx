import { notFound } from "next/navigation";
import { CONVITES_ATIVOS } from "@/lib/funcionalidades";
import type { Metadata } from "next";
import { requirePermissionForPage } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import { getParishInvitations } from "@/server/modules/invitations/service";
import { revokeInvitationAction } from "@/server/actions/invitation-actions";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageHeader, Eyebrow } from "@/components/ui/Typography";
import { CreateInviteForm } from "../CreateInviteForm";

export const metadata: Metadata = { title: "Convites" };

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  used: "Utilizado",
  expired: "Expirado",
  revoked: "Cancelado",
};

const STATUS_TONE: Record<string, "success" | "muted" | "warning" | "error"> = {
  pending: "warning",
  used: "success",
  expired: "muted",
  revoked: "error",
};

/**
 * Os convites para entrar na paróquia, em tela própria.
 *
 * Vieram do índice do painel, onde ocupavam uma tabela inteira no meio do
 * caminho de quem ia fazer outra coisa.
 *
 * A lista vem ANTES do formulário: criar convite é ato ocasional, e quem
 * abre esta tela normalmente vem ver se alguém já usou o que foi mandado,
 * ou cancelar um que não deveria mais valer.
 */
export default async function ConvitesPage() {
  // Desligada (ver src/lib/funcionalidades.ts). "Não encontrado", e não um
  // aviso: a tela não está em menu nenhum, e só chega aqui quem guardou o
  // endereço.
  if (!CONVITES_ATIVOS) notFound();
  const session = await requirePermissionForPage(PERMISSIONS.INVITATIONS_CREATE);
  if (!session.membership) return null;

  const invitations = await getParishInvitations(session.membership.parishId);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Convites"
        description="Links e códigos para alguém entrar na paróquia pelo aplicativo."
      />

      <section>
        <Eyebrow tone="accent" className="mb-3">
          Convites criados
        </Eyebrow>
        {invitations.length === 0 ? (
          <p className="text-sm text-muted">
            Nenhum convite criado ainda. Use o formulário ao fim da página.
          </p>
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-muted">
                  <th className="py-2 pr-4">Código</th>
                  <th className="py-2 pr-4">Tipo</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Usado por</th>
                  <th className="py-2 pr-4" />
                </tr>
              </thead>
              <tbody>
                {invitations.map((invitation) => (
                  <tr key={invitation.id} className="border-b border-border last:border-b-0">
                    <td className="py-2 pr-4 font-mono">/convite/{invitation.code}</td>
                    <td className="py-2 pr-4">{invitation.type}</td>
                    <td className="py-2 pr-4">
                      <Badge tone={STATUS_TONE[invitation.status] ?? "muted"}>
                        {STATUS_LABEL[invitation.status] ?? invitation.status}
                      </Badge>
                    </td>
                    <td className="py-2 pr-4">{invitation.usedByUser?.fullName ?? "—"}</td>
                    <td className="py-2 pr-4">
                      {invitation.status === "pending" && (
                        <form action={revokeInvitationAction}>
                          <input type="hidden" name="id" value={invitation.id} />
                          <Button type="submit" variant="ghost">
                            Revogar
                          </Button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </section>

      <Card>
        <Eyebrow tone="accent" className="mb-3">
          Novo convite
        </Eyebrow>
        <CreateInviteForm />
      </Card>
    </div>
  );
}
