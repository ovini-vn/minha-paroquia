import { BookOpen, CalendarDays, Sparkles } from "lucide-react";
import { getSessionContext } from "@/server/auth/session";
import {
  listGroups,
  listMyChildrenEnrollments,
  getNextSessionForGroup,
  listRitesForEnrollment,
} from "@/server/modules/catequese/service";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Avatar } from "@/components/ui/Avatar";
import { PageHeader, SectionTitle } from "@/components/ui/Typography";
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
    <div className="flex flex-col">
      <PageHeader
        title="Catequese"
        description="A iniciação à vida cristã na sua paróquia — turmas, encontros e ritos."
      />

      {myEnrollmentDetails.length > 0 && (
        <section>
          <SectionTitle eyebrow="Sua família" title="Quem está na catequese" />
          <div className="flex flex-col gap-2.5">
            {myEnrollmentDetails.map(({ enrollment, nextSession, nextRite }) => (
              <Card key={enrollment.id}>
                <div className="flex items-center gap-3">
                  <Avatar name={enrollment.familyMember.fullName} size="sm" />
                  <div className="min-w-0">
                    <p className="text-[14.5px] font-medium text-foreground">
                      {enrollment.familyMember.fullName}
                    </p>
                    <p className="mt-0.5 text-[12.5px] text-muted">{enrollment.group.name}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-col gap-1.5 border-t border-border pt-3">
                  <p className="flex items-center gap-2 text-[12.5px] text-muted">
                    <CalendarDays className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} aria-hidden />
                    Próximo encontro:{" "}
                    {nextSession ? formatDateOnly(nextSession.date) : "ainda não marcado"}
                  </p>
                  <p className="flex items-center gap-2 text-[12.5px] text-muted">
                    <Sparkles className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} aria-hidden />
                    Próximo rito: {nextRite ? nextRite.name : "nenhum pendente"}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section className={myEnrollmentDetails.length > 0 ? "pt-7" : undefined}>
        <SectionTitle eyebrow="Turmas" title="Da paróquia" />
        {groups.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="Nenhuma turma ainda"
            description="Quando a paróquia abrir turmas de catequese, elas aparecem aqui."
          />
        ) : (
          <Card className="px-3.5 py-1.5">
            {groups.map((group) => (
              <div
                key={group.id}
                className="flex items-center gap-3.5 border-b border-border py-3.5 last:border-b-0"
              >
                <span className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-md bg-primary-tint text-primary">
                  <BookOpen className="h-[19px] w-[19px]" strokeWidth={1.5} aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14.5px] font-medium text-foreground">{group.name}</p>
                  <p className="mt-0.5 text-[12.5px] text-muted">
                    {group.catechist ? group.catechist.fullName : "Catequista a definir"}
                  </p>
                </div>
                <Badge tone="muted">{group.year}</Badge>
              </div>
            ))}
          </Card>
        )}
      </section>

      <div className="rule-gold my-7" />
    </div>
  );
}
