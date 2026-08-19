import { requirePermissionForPage } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import { listGroups } from "@/server/modules/catequese/service";
import { listMembersByRole } from "@/server/modules/parishes/service";
import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { CreateGroupForm } from "./CreateGroupForm";

export default async function CatequeseAdminPage() {
  const session = await requirePermissionForPage(PERMISSIONS.CATEQUESE_MANAGE);
  if (!session.membership) return null;

  const [groups, catechists] = await Promise.all([
    listGroups(session.membership.parishId),
    listMembersByRole(session.membership.parishId, "CATEQUISTA"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-2xl text-foreground">Catequese</h1>

      <Card>
        <p className="mb-3 font-serif text-lg text-foreground">Nova turma</p>
        <CreateGroupForm catechists={catechists} />
      </Card>

      {groups.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">Nenhuma turma criada ainda.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {groups.map((group) => (
            <Card key={group.id} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {group.name} · {group.year}
                </p>
                <p className="text-xs text-muted">
                  {group.catechist ? group.catechist.fullName : "Sem catequista designado"} ·{" "}
                  {group._count.enrollments} {group._count.enrollments === 1 ? "matriculado" : "matriculados"}
                </p>
              </div>
              <LinkButton href={`/painel/catequese/${group.id}`} variant="secondary">
                Ver turma
              </LinkButton>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
