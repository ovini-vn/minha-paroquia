import { Users } from "lucide-react";
import { requirePermissionForPage } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import { listActiveMembers, listPendingMembers } from "@/server/modules/parishes/service";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Avatar } from "@/components/ui/Avatar";
import { ChangeRoleForm } from "./ChangeRoleForm";
import { decidirMembroPendenteAction } from "@/server/actions/parish-actions";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Typography";

/**
 * Quem é quem na paróquia, e o papel de cada um.
 *
 * Existe porque não havia NENHUM caminho para mudar o papel de alguém: ele
 * era definido no aceite do convite e nunca mais. Quem entrou por um link
 * genérico de fiel ficava fiel para sempre — e delegar permissão avulsa não
 * resolvia, porque as telas que procuram catequista, sacerdote ou
 * coordenador procuram POR PAPEL.
 */
export default async function MembrosAdminPage() {
  const session = await requirePermissionForPage(PERMISSIONS.PERMISSION_OVERRIDES_MANAGE);
  if (!session.membership) return null;

  const [members, pendentes] = await Promise.all([
    listActiveMembers(session.membership.parishId),
    listPendingMembers(session.membership.parishId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-[29px] font-semibold leading-tight text-foreground">
          Membros e papéis
        </h1>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          O papel define o que a pessoa enxerga e pode fazer. É assim que um fiel passa a ser
          catequista, coordenador ou secretaria.
        </p>
      </div>

      {/* Quem chegou sozinho vem PRIMEIRO: é o que precisa de decisão hoje.
          A lista de membros já confirmados não vai a lugar nenhum. */}
      {pendentes.length > 0 && (
        <section>
          <Eyebrow tone="accent" className="mb-3">
            Aguardando confirmação
          </Eyebrow>
          <p className="mb-3 text-[13px] leading-relaxed text-muted">
            Estas pessoas escolheram a sua paróquia no aplicativo. Até você confirmar, elas veem os
            horários e avisos, mas não veem as outras pessoas da comunidade.
          </p>
          <Card className="px-3.5 py-1.5">
            {pendentes.map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center gap-3 border-b border-border py-3.5 last:border-b-0"
              >
                <Avatar name={p.user.fullName} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-[14.5px] font-medium text-foreground">{p.user.fullName}</p>
                  <p className="mt-0.5 text-[12.5px] text-muted">{p.user.email}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <form action={decidirMembroPendenteAction}>
                    <input type="hidden" name="userId" value={p.user.id} />
                    <input type="hidden" name="decisao" value="confirmar" />
                    <Button type="submit" size="sm">
                      Confirmar
                    </Button>
                  </form>
                  <form action={decidirMembroPendenteAction}>
                    <input type="hidden" name="userId" value={p.user.id} />
                    <input type="hidden" name="decisao" value="recusar" />
                    <Button type="submit" variant="ghost" size="sm">
                      Recusar
                    </Button>
                  </form>
                </div>
              </div>
            ))}
          </Card>
        </section>
      )}

      {members.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Ninguém na comunidade ainda"
          description="Crie um convite no painel para as primeiras pessoas entrarem."
        />
      ) : (
        <Card className="px-3.5 py-1.5">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex flex-wrap items-center gap-3 border-b border-border py-3.5 last:border-b-0"
            >
              <Avatar name={member.user.fullName} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-[14.5px] font-medium text-foreground">{member.user.fullName}</p>
                <p className="mt-0.5">
                  <Badge>{member.role.name}</Badge>
                </p>
              </div>
              <ChangeRoleForm
                userId={member.user.id}
                fullName={member.user.fullName}
                currentRoleCode={member.role.code}
                ehVoce={member.user.id === session.userId}
              />
            </div>
          ))}
        </Card>
      )}

      <p className="text-[12.5px] leading-relaxed text-muted">
        Precisa dar só uma permissão específica sem mudar o papel? Use{" "}
        <span className="text-foreground">Delegar permissões</span>.
      </p>
    </div>
  );
}
