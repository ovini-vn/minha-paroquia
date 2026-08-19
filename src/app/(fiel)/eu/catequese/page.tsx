import { getSessionContext } from "@/server/auth/session";
import { PERMISSIONS, isFullAdmin } from "@/server/auth/rbac";
import { listGroups, listGroupsForCatechist } from "@/server/modules/catequese/service";
import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function MyCatequesePage() {
  const session = await getSessionContext();
  const canManage = session?.permissions.includes(PERMISSIONS.CATEQUESE_MANAGE);
  const canTeach = session?.permissions.includes(PERMISSIONS.CATEQUESE_TEACH);

  if (!session?.membership || (!canManage && !canTeach)) {
    return (
      <EmptyState
        icon="📖"
        title="Esta área é para catequistas"
        description="Gerenciar encontros e presença é reservado a quem tem um vínculo de catequista na paróquia."
      />
    );
  }

  const groups = isFullAdmin(session.membership.roleCode)
    ? await listGroups(session.membership.parishId)
    : await listGroupsForCatechist(session.membership.parishId, session.userId);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-serif text-xl text-ink-900">Minha catequese</h1>

      {groups.length === 0 ? (
        <EmptyState
          icon="📖"
          title="Nenhuma turma atribuída"
          description="Peça ao pároco ou à secretaria para te designar como catequista de uma turma."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {groups.map((group) => (
            <Card key={group.id} className="flex items-center justify-between">
              <p className="text-sm font-medium text-ink-900">
                {group.name} · {group.year}
              </p>
              <LinkButton href={`/eu/catequese/${group.id}`} variant="secondary">
                Abrir
              </LinkButton>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
