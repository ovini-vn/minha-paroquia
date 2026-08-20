import { requirePermissionForPage } from "@/server/auth/guards";
import { PERMISSIONS, PERMISSION_NAMES, type PermissionCode } from "@/server/auth/rbac";
import { listActiveMembers } from "@/server/modules/parishes/service";
import { listOverrides } from "@/server/modules/permission-overrides/service";
import { removeOverrideAction } from "@/server/actions/permission-override-actions";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { SetOverrideForm } from "./SetOverrideForm";
import { KeyRound } from "lucide-react";

export default async function PermissionOverridesPage() {
  const session = await requirePermissionForPage(PERMISSIONS.PERMISSION_OVERRIDES_MANAGE);
  if (!session.membership) return null;

  const [members, overrides] = await Promise.all([
    listActiveMembers(session.membership.parishId),
    listOverrides(session.membership.parishId),
  ]);

  const memberOptions = members.map((m) => ({ userId: m.user.id, fullName: m.user.fullName, roleName: m.role.name }));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-[29px] font-semibold leading-tight text-foreground">Delegar permissões</h1>
      <p className="text-sm text-muted">
        Conceda ou revogue uma permissão específica para alguém, além do que o papel dela já dá — ex.: um coordenador
        que pode editar catequese, mas não liturgia.
      </p>

      <Card>
        <SetOverrideForm members={memberOptions} />
      </Card>

      {overrides.length === 0 ? (
        <EmptyState icon={KeyRound} title="Nenhuma permissão delegada ainda" description="Use o formulário acima." />
      ) : (
        <div className="flex flex-col gap-2">
          {overrides.map((override) => (
            <Card key={override.id} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{override.user.fullName}</p>
                <p className="text-xs text-muted">
                  {PERMISSION_NAMES[override.permissionCode as PermissionCode] ?? override.permissionCode}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge>{override.granted ? "Concedida" : "Revogada"}</Badge>
                <form action={removeOverrideAction}>
                  <input type="hidden" name="userId" value={override.userId} />
                  <input type="hidden" name="permissionCode" value={override.permissionCode} />
                  <Button type="submit" variant="ghost">
                    Remover
                  </Button>
                </form>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
