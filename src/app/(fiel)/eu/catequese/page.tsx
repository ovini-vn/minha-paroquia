import { BookOpen } from "lucide-react";
import { getSessionContext } from "@/server/auth/session";
import { PERMISSIONS, isFullAdmin } from "@/server/auth/rbac";
import { listGroups, listGroupsForCatechist } from "@/server/modules/catequese/service";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { RowLink } from "@/components/ui/RowLink";
import { PageHeader } from "@/components/ui/Typography";

export default async function MyCatequesePage() {
  const session = await getSessionContext();
  const canManage = session?.permissions.includes(PERMISSIONS.CATEQUESE_MANAGE);
  const canTeach = session?.permissions.includes(PERMISSIONS.CATEQUESE_TEACH);

  if (!session?.membership || (!canManage && !canTeach)) {
    return (
      <EmptyState
        icon={BookOpen}
        title="Esta área é para catequistas"
        description="Gerenciar encontros e presença é reservado a quem tem um vínculo de catequista na paróquia."
      />
    );
  }

  const groups = isFullAdmin(session.membership.roleCode)
    ? await listGroups(session.membership.parishId)
    : await listGroupsForCatechist(session.membership.parishId, session.userId);

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Minha catequese"
        description="As turmas que você acompanha. Abra uma para registrar encontros e presença."
      />

      {groups.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Nenhuma turma atribuída"
          description="Peça ao pároco ou à secretaria para te designar como catequista de uma turma."
        />
      ) : (
        <Card className="px-3.5 py-1.5">
          {groups.map((group) => (
            <RowLink
              key={group.id}
              href={`/eu/catequese/${group.id}`}
              icon={BookOpen}
              title={group.name}
              subtitle={`Turma de ${group.year}`}
            />
          ))}
        </Card>
      )}

      <div className="rule-gold my-7" />
    </div>
  );
}
