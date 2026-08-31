import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, Users, CalendarDays } from "lucide-react";
import { requireSessionForPage } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import { TriangleAlert, Sparkles } from "lucide-react";
import {
  getGroup,
  listEnrollments,
  listSessions,
  listarTemasDaTurma,
  obterAndamentoDaTurma,
  listarItinerarios,
  listarRitosDaTurma,
  listRitesForEnrollment,
} from "@/server/modules/catequese/service";
import { listAllFamilyMembers } from "@/server/modules/family/service";
import { completeRiteAction } from "@/server/actions/catequese-actions";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { INPUT_CLASSES } from "@/components/ui/FormField";
import { definirItinerarioDaTurmaAction } from "@/server/actions/catequese-actions";
import { EmptyState } from "@/components/ui/EmptyState";
import { Eyebrow } from "@/components/ui/Typography";
import { formatDateOnly } from "@/lib/date";
import { EnrollForm } from "../../_components/EnrollForm";
import { CreateSessionForm } from "../../_components/CreateSessionForm";
import { CreateRiteForm } from "../../_components/CreateRiteForm";
import { CriarRitoDaTurmaForm } from "../../_components/CriarRitoDaTurmaForm";
import { GestaoDaTurma } from "../../_components/GestaoDaTurma";
import { EditarEncontroForm } from "../../_components/EditarEncontroForm";
import { listMembersByRole } from "@/server/modules/parishes/service";

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

  const [enrollments, sessions, temas, andamento, itinerarios, ritosDaTurma, catequistas] =
    await Promise.all([
    listEnrollments(parishId, id),
    listSessions(parishId, id),
    listarTemasDaTurma(parishId, id),
    obterAndamentoDaTurma(parishId, id, new Date()),
    coordena ? listarItinerarios(parishId) : [],
    listarRitosDaTurma(parishId, id),
    coordena ? listMembersByRole(parishId, "CATEQUISTA") : [],
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
          {group.catechist
            ? `Catequista: ${group.catechist.fullName}`
            : group.catechistName
              ? `Catequista: ${group.catechistName} (ainda sem app)`
              : "Sem catequista designado"}
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

      {coordena && (
        <section className="pt-7">
          <Eyebrow tone="accent" className="mb-3">
            Gestão da turma
          </Eyebrow>
          <Card className="mb-3">
            <GestaoDaTurma
              groupId={id}
              nome={group.name}
              ano={group.year}
              catequistas={catequistas.map((c) => ({ id: c.user.id, fullName: c.user.fullName }))}
              catechistUserId={group.catechistUserId}
              catechistName={group.catechistName}
            />
          </Card>

          <Card>
            <Eyebrow className="mb-3">Itinerário da turma</Eyebrow>
            {/* Quem coordena define o plano; o catequista segue e lança. */}
            <form action={definirItinerarioDaTurmaAction} className="flex flex-wrap items-end gap-3">
              <input type="hidden" name="groupId" value={id} />
              <div className="flex min-w-[220px] flex-1 flex-col gap-1.5">
                <label htmlFor="itinerarioId" className="text-sm font-medium text-muted">
                  Plano que esta turma segue
                </label>
                <select
                  id="itinerarioId"
                  name="itinerarioId"
                  defaultValue={group.itinerarioId ?? ""}
                  className={INPUT_CLASSES}
                >
                  <option value="">Sem itinerário</option>
                  {itinerarios.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.nome}
                    </option>
                  ))}
                </select>
              </div>
              <Button type="submit">Salvar</Button>
            </form>
            {itinerarios.length === 0 && (
              <p className="mt-3 text-[12.5px] leading-relaxed text-muted">
                Nenhum itinerário cadastrado ainda. Crie o primeiro em{" "}
                <Link href="/catequese/itinerarios" className="font-medium text-primary hover:underline">
                  Itinerários
                </Link>
                .
              </p>
            )}
          </Card>
        </section>
      )}

      {/*
        Encontros: quem leciona E quem coordena.
        
        Era só de quem leciona, e isso deixava a coordenação sem conseguir
        corrigir um encontro lançado errado — apesar de a ação do servidor
        sempre ter permitido. A tela e a guarda tinham regras diferentes, que
        é o mesmo desencontro do `podeAlcancar` e do tempo litúrgico.
      */}
      {(leciona || coordena) && (
        <section className="pt-7">
          <Eyebrow tone="accent" className="mb-3">
            Encontros
          </Eyebrow>

          {/*
            O aviso de conteúdo não lançado, pedido pela catequista.

            Cita o encontro mais antigo pela DATA, e não só a quantidade: um
            aviso que diz "3 pendentes" manda a pessoa procurar quais; dizendo
            "o de 12 de agosto está há 18 dias", ela sabe onde tocar.

            Vermelho só no atrasado. Encontro que acabou ontem e ainda não foi
            lançado não é falha de ninguém, e pintar os dois de vermelho
            ensinaria a ignorar os dois.
          */}
          {andamento && andamento.lancamento.maisAntigo && (
            <div
              className={
                andamento.lancamento.atrasados > 0
                  ? "mb-3 flex items-start gap-2.5 rounded-lg border border-error/40 bg-error-tint px-3.5 py-3"
                  : "mb-3 flex items-start gap-2.5 rounded-lg border border-border bg-sunken px-3.5 py-3"
              }
            >
              <TriangleAlert
                className={
                  andamento.lancamento.atrasados > 0
                    ? "mt-0.5 h-4 w-4 shrink-0 text-error"
                    : "mt-0.5 h-4 w-4 shrink-0 text-muted"
                }
                strokeWidth={1.6}
                aria-hidden
              />
              <p className="text-[13px] leading-relaxed text-foreground">
                {andamento.lancamento.atrasados > 0 ? (
                  <>
                    <strong className="font-semibold">
                      Falta lançar o conteúdo de{" "}
                      {andamento.lancamento.atrasados === 1
                        ? "um encontro"
                        : `${andamento.lancamento.atrasados} encontros`}
                      .
                    </strong>{" "}
                    O mais antigo é o de {formatDateOnly(andamento.lancamento.maisAntigo.date)}, há{" "}
                    {andamento.lancamento.maisAntigo.dias} dias.
                  </>
                ) : (
                  <>
                    O encontro de {formatDateOnly(andamento.lancamento.maisAntigo.date)} ainda está
                    sem conteúdo lançado.
                  </>
                )}
              </p>
            </div>
          )}

          {andamento?.itinerario && andamento.previstos > 0 && (
            <p className="mb-3 text-[12.5px] text-muted">
              Itinerário{" "}
              <span className="font-medium text-foreground">{andamento.itinerario.nome}</span> —{" "}
              {andamento.dados} de {andamento.previstos} encontros previstos já dados.
            </p>
          )}
          <Card>
            <CreateSessionForm groupId={id} temas={temas} />
          </Card>
          {sessions.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Nenhum encontro lançado ainda.</p>
          ) : (
            <Card className="mt-3 px-3.5 py-1.5">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className="flex flex-wrap items-center gap-x-3.5 gap-y-1 border-b border-border py-3 last:border-b-0"
                >
                <Link
                  href={`/catequese/turma/${id}/encontro/${s.id}`}
                  className="flex flex-1 items-center gap-3.5 rounded-md transition-colors hover:bg-primary-tint"
                >
                  <span className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-md bg-primary-tint text-primary">
                    <CalendarDays className="h-[18px] w-[18px]" strokeWidth={1.5} aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14.5px] font-medium text-foreground">
                      {s.tema?.titulo || s.topic || "Encontro"}
                    </p>
                    <p className="mt-0.5 text-[12.5px] text-muted">
                      {formatDateOnly(s.date)}
                      {/* Sem conteúdo é a informação que a catequista procura
                          na lista — dizer só a data a faria abrir uma a uma. */}
                      {!s.tema && !s.topic?.trim() && " · sem conteúdo lançado"}
                    </p>
                  </div>
                  <span className="text-[12.5px] text-muted">Chamada →</span>
                </Link>
                <EditarEncontroForm
                  groupId={id}
                  sessionId={s.id}
                  date={s.date.toISOString().slice(0, 10)}
                  topic={s.topic}
                  itinerarioTemaId={s.itinerarioTemaId}
                  temas={temas}
                />
                </div>
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

        {(leciona || coordena) && enrollments.length > 0 && (
          <>
            {/*
              O rito da TURMA vem primeiro, e é o caminho normal: o rito
              acontece num domingo para todos. Registrar criança por criança
              eram 25 digitações numa turma de 25, cada uma podendo grafar o
              nome de um jeito — e aí a coordenação não conseguia contar nada.
            */}
            <Card className="mt-3">
              <Eyebrow className="mb-3">Marcar um rito para a turma</Eyebrow>
              <CriarRitoDaTurmaForm groupId={id} />

              {ritosDaTurma.length > 0 && (
                <div className="mt-4 border-t border-border pt-1">
                  {ritosDaTurma.map((rito) => (
                    <Link
                      key={rito.id}
                      href={`/catequese/turma/${id}/rito/${rito.id}`}
                      className="flex items-center gap-3.5 border-b border-border py-3 transition-colors last:border-b-0 hover:bg-primary-tint"
                    >
                      <span className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-md bg-gold/15 text-[#8a6b24] dark:text-gold">
                        <Sparkles className="h-[17px] w-[17px]" strokeWidth={1.5} aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-medium text-foreground">{rito.nome}</p>
                        <p className="mt-0.5 text-[12.5px] text-muted">
                          {rito.completedAt
                            ? `Realizado · ${rito._count.participacoes} ${
                                rito._count.participacoes === 1 ? "participou" : "participaram"
                              }`
                            : rito.scheduledAt
                              ? `Previsto para ${formatDateOnly(rito.scheduledAt)}`
                              : "Sem data marcada"}
                        </p>
                      </div>
                      <span className="text-[12.5px] text-muted">
                        {rito.completedAt ? "Corrigir →" : "Marcar quem participou →"}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </Card>

            {/* O individual continua existindo: serve ao caso de uma criança
                que recebeu o rito fora do domingo da turma. */}
            <Card className="mt-3">
              <Eyebrow className="mb-3">Registrar um rito de uma criança só</Eyebrow>
              <CreateRiteForm enrollments={enrollments} />
            </Card>
          </>
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
