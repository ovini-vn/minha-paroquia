import { notFound } from "next/navigation";
import { getSessionContext } from "@/server/auth/session";
import { isFullAdmin } from "@/server/auth/rbac";
import {
  getGroup,
  listEnrollments,
  listSessions,
  listRitesForEnrollment,
} from "@/server/modules/catequese/service";
import { BookOpen } from "lucide-react";
import { completeRiteAction } from "@/server/actions/catequese-actions";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LinkButton, Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateOnly } from "@/lib/date";
import { CreateSessionForm } from "./CreateSessionForm";
import { CreateRiteForm } from "./CreateRiteForm";

export default async function CatequeseGroupPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionContext();
  if (!session?.membership) return null;
  const { id } = await params;

  const catechistOnly = isFullAdmin(session.membership.roleCode) ? undefined : session.userId;
  const group = await getGroup(session.membership.parishId, id, catechistOnly);
  if (!group) notFound();

  const [enrollments, sessions] = await Promise.all([
    listEnrollments(session.membership.parishId, id),
    listSessions(session.membership.parishId, id),
  ]);

  const ritesByEnrollment = await Promise.all(
    enrollments.map((e) => listRitesForEnrollment(session.membership!.parishId, e.id)),
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl text-foreground">
          {group.name} · {group.year}
        </h1>
      </div>

      <Card>
        <p className="mb-3 font-serif text-lg text-foreground">Encontros</p>
        <CreateSessionForm groupId={id} />

        {sessions.length === 0 ? (
          <p className="mt-4 text-sm text-muted">Nenhum encontro cadastrado ainda.</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-2">
            {sessions.map((s) => (
              <li key={s.id} className="flex items-center justify-between border-b border-border py-2 text-sm">
                <div>
                  <p className="text-foreground">{formatDateOnly(s.date)}</p>
                  {s.topic && <p className="text-xs text-muted">{s.topic}</p>}
                </div>
                <LinkButton href={`/eu/catequese/${id}/encontro/${s.id}`} variant="secondary">
                  Chamada
                </LinkButton>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <p className="mb-3 font-serif text-lg text-foreground">Matriculados e ritos</p>
        {enrollments.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="Ninguém matriculado ainda"
            description="Peça ao pároco ou à secretaria para matricular dependentes nesta turma."
          />
        ) : (
          <>
            <CreateRiteForm enrollments={enrollments} />
            <div className="mt-4 flex flex-col gap-3">
              {enrollments.map((enrollment, index) => (
                <div key={enrollment.id} className="border-t border-border pt-3">
                  <p className="text-sm font-medium text-foreground">{enrollment.familyMember.fullName}</p>
                  {ritesByEnrollment[index]!.length === 0 ? (
                    <p className="text-xs text-muted">Nenhum rito registrado.</p>
                  ) : (
                    <div className="mt-1 flex flex-wrap gap-2">
                      {ritesByEnrollment[index]!.map((rite) => (
                        <div key={rite.id} className="flex items-center gap-1.5">
                          <Badge>
                            {rite.name}
                            {rite.completedAt ? " · concluído" : rite.scheduledAt ? ` · ${formatDateOnly(rite.scheduledAt)}` : ""}
                          </Badge>
                          {!rite.completedAt && (
                            <form action={completeRiteAction}>
                              <input type="hidden" name="riteId" value={rite.id} />
                              <Button type="submit" variant="ghost">
                                Concluir
                              </Button>
                            </form>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
