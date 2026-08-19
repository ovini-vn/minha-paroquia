import { getSessionContext } from "@/server/auth/session";
import { PERMISSIONS } from "@/server/auth/rbac";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button, LinkButton } from "@/components/ui/Button";
import { logoutAction } from "@/server/actions/auth-actions";

export default async function ProfilePage() {
  const session = await getSessionContext();
  if (!session) return null;

  const canSeeAdminPanel =
    session.isPlatformAdmin || session.permissions.includes(PERMISSIONS.DASHBOARD_PARISH_VIEW);
  const canManageAvailability = session.permissions.includes(PERMISSIONS.AVAILABILITY_MANAGE);
  const canTeachCatequese =
    session.permissions.includes(PERMISSIONS.CATEQUESE_TEACH) ||
    session.permissions.includes(PERMISSIONS.CATEQUESE_MANAGE);

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col items-center gap-2 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-terracotta-100 text-2xl">
          {session.fullName.charAt(0).toUpperCase()}
        </div>
        <p className="font-serif text-lg text-ink-900">{session.fullName}</p>
        <p className="text-sm text-ink-700">{session.email}</p>
        {session.membership && <Badge>{session.membership.roleName}</Badge>}
      </Card>

      {session.membership && (
        <Card>
          <p className="text-xs uppercase tracking-wide text-terracotta-600">Sua comunidade</p>
          <p className="mt-1 text-sm text-ink-900">{session.membership.parishName}</p>
        </Card>
      )}

      <LinkButton href="/eu/atendimentos" variant="secondary" className="w-full">
        Meus atendimentos
      </LinkButton>

      <LinkButton href="/eu/familia" variant="secondary" className="w-full">
        Minha família
      </LinkButton>

      {canManageAvailability && (
        <LinkButton href="/eu/disponibilidade" variant="secondary" className="w-full">
          Minha disponibilidade
        </LinkButton>
      )}

      {canTeachCatequese && (
        <LinkButton href="/eu/catequese" variant="secondary" className="w-full">
          Minha catequese
        </LinkButton>
      )}

      {canSeeAdminPanel && (
        <LinkButton href="/painel" variant="secondary" className="w-full">
          Painel da paróquia
        </LinkButton>
      )}

      <form action={logoutAction}>
        <Button variant="ghost" type="submit" className="w-full">
          Sair
        </Button>
      </form>
    </div>
  );
}
