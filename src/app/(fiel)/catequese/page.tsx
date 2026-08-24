import Link from "next/link";
import { BookOpen, Users, GraduationCap, Sparkles, CalendarDays, TriangleAlert } from "lucide-react";
import { requireSessionForPage } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import {
  listGroups,
  listGroupsForCatechist,
  listEnrollmentsForCatechist,
  listMyChildrenEnrollments,
  getCatequeseOverview,
} from "@/server/modules/catequese/service";
import { listMembersByRole } from "@/server/modules/parishes/service";
import { listUnlinkedParishPeople } from "@/server/modules/family/service";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Stat } from "@/components/ui/Stat";
import { EmptyState } from "@/components/ui/EmptyState";
import { RowLink } from "@/components/ui/RowLink";
import { PageHeader, Eyebrow } from "@/components/ui/Typography";
import { formatDateOnly } from "@/lib/date";
import { CreateGroupForm } from "./_components/CreateGroupForm";
import { ParishPeoplePanel } from "./_components/ParishPeoplePanel";

/**
 * Catequese num lugar só, com o conteúdo mudando conforme quem olha.
 *
 * Antes eram três telas separadas — /painel/catequese, /eu/catequese e
 * /comunidade/catequese — e no painel apareciam "Catequese" e "Minha
 * catequese" lado a lado, sem que a diferença ficasse clara.
 *
 * As seções são cumulativas de propósito: quem coordena E dá aula E tem
 * filho matriculado vê as três, na ordem do mais amplo para o mais pessoal.
 * É comum na paróquia a mesma pessoa acumular esses papéis.
 */
export default async function CatequesePage() {
  const session = await requireSessionForPage();
  if (!session.membership) {
    return (
      <EmptyState
        icon={BookOpen}
        title="Você ainda não pertence a uma comunidade"
        description="Peça um convite à secretaria da sua paróquia para acompanhar a catequese."
      />
    );
  }

  const parishId = session.membership.parishId;
  const pode = (code: string) =>
    session.isPlatformAdmin || session.permissions.includes(code as never);
  const coordena = pode(PERMISSIONS.CATEQUESE_MANAGE);
  const leciona = pode(PERMISSIONS.CATEQUESE_TEACH);

  const [overview, grupos, catequistas, pessoasSoltas, minhasTurmas, meusAlunos, filhos] =
    await Promise.all([
      coordena ? getCatequeseOverview(parishId) : null,
      coordena ? listGroups(parishId) : [],
      coordena ? listMembersByRole(parishId, "CATEQUISTA") : [],
      coordena ? listUnlinkedParishPeople(parishId) : [],
      leciona ? listGroupsForCatechist(parishId, session.userId) : [],
      leciona ? listEnrollmentsForCatechist(parishId, session.userId) : [],
      listMyChildrenEnrollments(parishId, session.userId),
    ]);

  const nadaParaMostrar = !coordena && !leciona && filhos.length === 0;

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Catequese"
        description="A caminhada de quem se prepara para os sacramentos."
      />

      {nadaParaMostrar && (
        <EmptyState
          icon={BookOpen}
          title="Nada da catequese para você por enquanto"
          description="Quando alguém da sua família for matriculado, o acompanhamento aparece aqui. Se você é catequista, peça à secretaria para ajustar o seu papel."
        />
      )}

      {/* ---------------- Coordenação ---------------- */}
      {coordena && overview && (
        <>
          <section>
            <Eyebrow tone="accent" className="mb-3">
              Visão geral
            </Eyebrow>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Turmas" value={String(overview.turmas)} />
              <Stat label="Catequizandos" value={String(overview.matriculas)} />
              <Stat label="Catequistas" value={String(overview.catequistas)} />
              <Stat label="Sem catequista" value={String(overview.turmasSemCatequista)} />
            </div>
            {overview.turmasSemCatequista > 0 && (
              <p className="mt-2.5 flex items-start gap-2 text-[12.5px] leading-relaxed text-muted">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden />
                {overview.turmasSemCatequista === 1
                  ? "Uma turma está sem catequista designado."
                  : `${overview.turmasSemCatequista} turmas estão sem catequista designado.`}{" "}
                Defina em Membros e papéis quem é catequista, e depois edite a turma.
              </p>
            )}
          </section>

          {overview.proximosRitos.length > 0 && (
            <section className="pt-7">
              <Eyebrow tone="accent" className="mb-3">
                Próximos ritos
              </Eyebrow>
              <Card className="px-3.5 py-1.5">
                {overview.proximosRitos.map((rito) => (
                  <div
                    key={rito.id}
                    className="flex items-center gap-3.5 border-b border-border py-3 last:border-b-0"
                  >
                    <span className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-md bg-gold/15 text-[#8a6b24] dark:text-gold">
                      <Sparkles className="h-[18px] w-[18px]" strokeWidth={1.5} aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14.5px] font-medium text-foreground">{rito.name}</p>
                      <p className="mt-0.5 text-[12.5px] text-muted">
                        {rito.enrollment.familyMember.fullName} · {rito.enrollment.group.name}
                      </p>
                    </div>
                    {rito.scheduledAt && <Badge>{formatDateOnly(rito.scheduledAt)}</Badge>}
                  </div>
                ))}
              </Card>
            </section>
          )}

          <section className="pt-7">
            <Eyebrow tone="accent" className="mb-3">
              Turmas
            </Eyebrow>
            {grupos.length === 0 ? (
              <EmptyState
                icon={GraduationCap}
                title="Nenhuma turma ainda"
                description="Crie a primeira abaixo."
              />
            ) : (
              <Card className="px-3.5 py-1.5">
                {grupos.map((grupo) => (
                  <RowLink
                    key={grupo.id}
                    href={`/catequese/turma/${grupo.id}`}
                    icon={GraduationCap}
                    title={`${grupo.name} · ${grupo.year}`}
                    subtitle={`${grupo.catechist ? grupo.catechist.fullName : "Sem catequista"} · ${grupo._count.enrollments} ${grupo._count.enrollments === 1 ? "matriculado" : "matriculados"}`}
                  />
                ))}
              </Card>
            )}
            <Card className="mt-3">
              <Eyebrow className="mb-3">Nova turma</Eyebrow>
              <CreateGroupForm catechists={catequistas} />
            </Card>
          </section>

          <section className="pt-7">
            <Eyebrow tone="accent" className="mb-3">
              Catequizandos
            </Eyebrow>
            <Card>
              <p className="mb-3 text-sm leading-relaxed text-muted">
                Cadastre o aluno mesmo que a família não use o aplicativo. Se um dia ela entrar, é só
                vincular — a matrícula e o histórico continuam os mesmos.
              </p>
              <ParishPeoplePanel
                pessoas={pessoasSoltas.map((p) => ({
                  id: p.id,
                  fullName: p.fullName,
                  birthDate: p.birthDate,
                  guardianName: p.guardianName,
                  guardianPhone: p.guardianPhone,
                  matriculas: p._count.enrollments,
                }))}
              />
            </Card>
          </section>
        </>
      )}

      {/* ---------------- Catequista ---------------- */}
      {leciona && (
        <section className={coordena ? "pt-9" : ""}>
          <Eyebrow tone="accent" className="mb-3">
            {coordena ? "As turmas que eu mesmo acompanho" : "Minhas turmas"}
          </Eyebrow>
          {minhasTurmas.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="Nenhuma turma sob sua responsabilidade"
              description="Quando a coordenação designar você como catequista de uma turma, ela aparece aqui."
            />
          ) : (
            <>
              <Card className="px-3.5 py-1.5">
                {minhasTurmas.map((turma) => {
                  const alunos = meusAlunos.filter((a) => a.group.id === turma.id).length;
                  return (
                    <RowLink
                      key={turma.id}
                      href={`/catequese/turma/${turma.id}`}
                      icon={BookOpen}
                      title={`${turma.name} · ${turma.year}`}
                      subtitle={`${alunos} ${alunos === 1 ? "catequizando" : "catequizandos"}`}
                    />
                  );
                })}
              </Card>

              {meusAlunos.length > 0 && (
                <div className="pt-5">
                  <Eyebrow className="mb-3">Meus catequizandos</Eyebrow>
                  <Card className="px-3.5 py-1.5">
                    {meusAlunos.map((aluno) => (
                      <Link
                        key={aluno.id}
                        href={`/catequese/aluno/${aluno.id}`}
                        className="flex items-center gap-3.5 border-b border-border py-3 transition-colors last:border-b-0 hover:bg-primary-tint"
                      >
                        <span className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-md bg-primary-tint text-primary">
                          <Users className="h-[18px] w-[18px]" strokeWidth={1.5} aria-hidden />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[14.5px] font-medium text-foreground">
                            {aluno.familyMember.fullName}
                          </p>
                          <p className="mt-0.5 text-[12.5px] text-muted">
                            {aluno.group.name}
                            {/* O contato do responsável fora do app é o que
                                o catequista precisa quando o aluno falta. */}
                            {aluno.familyMember.guardianPhone
                              ? ` · ${aluno.familyMember.guardianName ?? "Responsável"} · ${aluno.familyMember.guardianPhone}`
                              : ""}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </Card>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {/* ---------------- Família ---------------- */}
      {filhos.length > 0 && (
        <section className={coordena || leciona ? "pt-9" : ""}>
          <Eyebrow tone="accent" className="mb-3">
            Na minha família
          </Eyebrow>
          <Card className="px-3.5 py-1.5">
            {filhos.map((matricula) => (
              <RowLink
                key={matricula.id}
                href={`/catequese/aluno/${matricula.id}`}
                icon={CalendarDays}
                title={matricula.familyMember.fullName}
                subtitle={`${matricula.group.name} · ${matricula.group.year}`}
              />
            ))}
          </Card>
          <p className="mt-2.5 text-[12.5px] leading-relaxed text-muted">
            Abra para ver o que está sendo dado, as presenças nos encontros e nas missas.
          </p>
        </section>
      )}

      <div className="rule-gold my-7" />
    </div>
  );
}
