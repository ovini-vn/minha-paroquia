import { getSessionContext } from "@/server/auth/session";
import { listGroups, listMyChildrenEnrollments, getNextSessionForGroup, listRitesForEnrollment } from "@/server/modules/catequese/service";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateOnly } from "@/lib/date";

export default async function CatequeseComunidadePage() {
  const session = await getSessionContext();
  if (!session?.membership) return null;

  const parishId = session.membership.parishId;
  const [groups, myEnrollments] = await Promise.all([
    listGroups(parishId),
    listMyChildrenEnrollments(parishId, session.userId),
  ]);

  const myEnrollmentDetails = await Promise.all(
    myEnrollments.map(async (enrollment) => {
      const [nextSession, rites] = await Promise.all([
        getNextSessionForGroup(parishId, enrollment.catechismGroupId),
        listRitesForEnrollment(parishId, enrollment.id),
      ]);
      const nextRite = rites.find((r) => !r.completedAt) ?? null;
      return { enrollment, nextSession, nextRite };
    }),
  );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-2xl text-ink-900">Catequese</h1>

      {myEnrollmentDetails.length > 0 && (
        <section>
          <p className="mb-2 text-xs uppercase tracking-wide text-terracotta-600">Seus filhos na catequese</p>
          <div className="flex flex-col gap-2">
            {myEnrollmentDetails.map(({ enrollment, nextSession, nextRite }) => (
              <Card key={enrollment.id}>
                <p className="text-sm font-medium text-ink-900">
                  {enrollment.familyMember.fullName} · {enrollment.group.name}
                </p>
                <p className="mt-1 text-sm text-ink-700">
                  Próximo encontro: {nextSession ? formatDateOnly(nextSession.date) : "ainda não marcado"}
                </p>
                <p className="text-sm text-ink-700">
                  Próximo rito: {nextRite ? nextRite.name : "nenhum pendente"}
                </p>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section>
        <p className="mb-2 text-xs uppercase tracking-wide text-terracotta-600">Turmas da paróquia</p>
        {groups.length === 0 ? (
          <EmptyState icon="📖" title="Nenhuma turma ainda" description="Em breve, novas turmas por aqui." />
        ) : (
          <div className="flex flex-col gap-2">
            {groups.map((group) => (
              <Card key={group.id}>
                <p className="text-sm font-medium text-ink-900">
                  {group.name} · {group.year}
                </p>
                <p className="text-xs text-ink-700">
                  {group.catechist ? group.catechist.fullName : "Catequista a definir"}
                </p>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
