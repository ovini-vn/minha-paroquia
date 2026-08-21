import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, Users, CalendarDays } from "lucide-react";
import { requireSessionForPage } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import {
  getGroup,
  listEnrollments,
  listSessions,
  listRitesForEnrollment,
} from "@/server/modules/catequese/service";
import { listAllFamilyMembers } from "@/server/modules/family/service";
import { completeRiteAction } from "@/server/actions/catequese-actions";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Eyebrow } from "@/components/ui/Typography";
import { formatDateOnly } from "@/lib/date";
import { EnrollForm } from "../../_components/EnrollForm";
import { CreateSessionForm } from "../../_components/CreateSessionForm";
import { CreateRiteForm } from "../../_components/CreateRiteForm";

/**
 * A turma, vista por quem coordena e/ou por quem dá aula.
 *
 * Rota única no lugar das duas que existiam (/painel/catequese/[id] para
 * matricular, /eu/catequese/[id] para lecionar). A permissão decide o que
 * aparece, não o endereço.
 */
export default async function TurmaPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSessionForPage();
  if (!session.membership) return null;
  const { id } = await params;

  const parishId = session.membership.parishId;
  const pode = (code: string) =>
    session.isPlatformAdmin || session.permissions.includes(code as never);
  const coordena = pode(PERMISSIONS.CATEQUESE_MANAGE);
  const leciona = pode(PERMISSIONS.CATEQUESE_TEACH);

  // Quem só leciona alcança apenas as próprias turmas; quem coordena vê
  // todas. getGroup faz esse filtro no banco, não na tela.
  const group = await getGroup(parishId, id, coordena ? undefined : session.userId);
  if (!group) notFound();

  const [enrollments, sessions] = await Promise.all([
    listEnrollments(parishId, id),
    listSessions(parishId, id),
  ]);

  const ritesByEnrollment = await Promise.all(
    enrollments.map((e) => listRitesForEnrollment(parishId, e.id)),
  );

  const disponiveis = coordena
    ? (await listAllFamilyMembers(parishId)).filter(
        (fm) => !enrollments.some((e) => e.familyMemberId === fm.id),
      )
    : [];

  return (
    <div className="flex flex-col">
      <div className="pb-2">
        <Link href="/catequese" className="text-[13px] text-muted hover:text-foreground">
          ← Catequese
        </Link>
        <h1 className="mt-1 font-serif text-[29px] font-semibold leading-tight text-foreground">
          {group.name} · {group.year}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {group.catechist ? `Catequista: ${group.catechist.fullName}` : "Sem catequista designado"}
        </p>
      </div>

      {coordena && (
        <section className="pt-5">
          <Eyebrow tone="accent" className="mb-3">
            Matricular
          </Eyebrow>
          <Card>
            {disponiveis.length === 0 ? (
              <p className="text-sm text-muted">
                Todos os catequizandos cadastrados já estão nesta turma. Cadastre outros em{" "}
                <Link href="/catequese" className="text-primary underline">
                  Catequese
                </Link>
                .
              </p>
            ) : (
              <EnrollForm groupId={id} familyMembers={disponiveis} />
            )}
          </Card>
        </section>
      )}

      {leciona && (
        <section className="pt-7">
          <Eyebrow tone="accent" className="mb-3">
            Encontros
          </Eyebrow>
          <Card>
            <CreateSessionForm groupId={id} />
          </Card>
          {sessions.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Nenhum encontro lançado ainda.</p>
          ) : (
            <Card className="mt-3 px-3.5 py-1.5">
              {sessions.map((s) => (
                <Link
                  key={s.id}
                  href={`/catequese/turma/${id}/encontro/${s.id}`}
                  className="flex items-center gap-3.5 border-b border-border py-3 transition-colors last:border-b-0 hover:bg-primary-tint"
                >
                  <span className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-md bg-primary-tint text-primary">
                    <CalendarDays className="h-[18px] w-[18px]" strokeWidth={1.5} aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14.5px] font-medium text-foreground">
                      {s.topic || "Encontro"}
                    </p>
                    <p className="mt-0.5 text-[12.5px] text-muted">{formatDateOnly(s.date)}</p>
                  </div>
                  <span className="text-[12.5px] text-muted">Chamada →</span>
                </Link>
              ))}
            </Card>
          )}
        </section>
      )}

      <section className="pt-7">
        <Eyebrow tone="accent" className="mb-3">
          Catequizandos
        </Eyebrow>
        {enrollments.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Ninguém matriculado ainda"
            description={coordena ? "Use o formulário acima." : "Fale com a coordenação."}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {enrollments.map((enrollment, i) => {
              const rites = ritesByEnrollment[i] ?? [];
              return (
                <Card key={enrollment.id}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        href={`/catequese/aluno/${enrollment.id}`}
                        className="text-[15px] font-medium text-foreground hover:text-primary"
                      >
                        {enrollment.familyMember.fullName}
                      </Link>
                      <p className="mt-0.5 text-[12.5px] text-muted">
                        {enrollment.familyMember.responsible
                          ? `Responsável: ${enrollment.familyMember.responsible.fullName}`
                          : enrollment.familyMember.guardianName
                            ? `Responsável: ${enrollment.familyMember.guardianName}${enrollment.familyMember.guardianPhone ? ` · ${enrollment.familyMember.guardianPhone}` : ""} — fora do app`
                            : "Sem responsável cadastrado"}
                      </p>
                    </div>
                  </div>

                  {rites.length > 0 && (
                    <ul className="mt-3 flex flex-col gap-1.5 border-t border-border pt-3">
                      {rites.map((rite) => (
                        <li key={rite.id} className="flex items-center justify-between gap-2 text-sm">
                          <span className="text-foreground">
                            {rite.name}
                            {rite.scheduledAt && (
                              <span className="text-muted"> · {formatDateOnly(rite.scheduledAt)}</span>
                            )}
                          </span>
                          {rite.completedAt ? (
                            <Badge tone="success">Realizado</Badge>
                          ) : (
                            leciona && (
                              <form action={completeRiteAction}>
                                <input type="hidden" name="riteId" value={rite.id} />
                                <input type="hidden" name="groupId" value={id} />
                                <Button type="submit" variant="ghost" size="sm">
                                  Marcar realizado
                                </Button>
                              </form>
                            )
                          )}
                        </li>
                      ))}
                    </ul>
                  )}

                </Card>
              );
            })}
          </div>
        )}

        {leciona && enrollments.length > 0 && (
          <Card className="mt-3">
            <Eyebrow className="mb-3">Registrar um rito</Eyebrow>
            <CreateRiteForm enrollments={enrollments} />
          </Card>
        )}
      </section>

      {!coordena && !leciona && (
        <EmptyState
          icon={BookOpen}
          title="Sem acesso a esta turma"
          description="Esta área é da coordenação e dos catequistas."
        />
      )}

      <div className="rule-gold my-7" />
    </div>
  );
}
