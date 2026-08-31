import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Sparkles } from "lucide-react";
import { requireSessionForPage } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import {
  getGroup,
  listEnrollments,
  obterRitoDaTurma,
} from "@/server/modules/catequese/service";
import { registrarParticipacaoNoRitoAction } from "@/server/actions/catequese-actions";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { INPUT_CLASSES } from "@/components/ui/FormField";
import { hojeEmBrasilia } from "@/lib/brasilia";

export const metadata: Metadata = { title: "Rito da turma" };

/**
 * Quem participou do rito — a turma inteira numa tela.
 *
 * Mesma forma da chamada do encontro, e pelo mesmo motivo: o rito acontece
 * num domingo para todos, e registrar isso criança por criança eram 25
 * telas.
 */
export default async function RitoDaTurmaPage({
  params,
}: {
  params: Promise<{ id: string; ritoId: string }>;
}) {
  const session = await requireSessionForPage();
  if (!session.membership) return null;
  const { id, ritoId } = await params;

  const parishId = session.membership.parishId;
  const pode = (code: string) =>
    session.isPlatformAdmin || session.permissions.includes(code as never);
  const coordena = pode(PERMISSIONS.CATEQUESE_MANAGE);
  const leciona = pode(PERMISSIONS.CATEQUESE_TEACH);
  if (!coordena && !leciona) notFound();

  const group = await getGroup(parishId, id, coordena ? undefined : session.userId);
  if (!group) notFound();

  const rito = await obterRitoDaTurma(parishId, ritoId);
  if (!rito || rito.catechismGroupId !== id) notFound();

  const enrollments = await listEnrollments(parishId, id);
  const jaParticiparam = new Set(rito.participacoes.map((p) => p.enrollmentId));

  /*
   * O dia do rito já vem preenchido com o previsto, quando há: quem está
   * registrando acabou de sair da celebração.
   *
   * `scheduledAt` e `completedAt` são coluna `@db.Date` — dia de calendário,
   * que o Prisma devolve à meia-noite UTC. Passar isso por `diaEmBrasilia`
   * VOLTA UM DIA: um rito marcado para 13/09 sugeria 12/09, porque meia-noite
   * em UTC ainda é o dia anterior às 21h em Brasília.
   *
   * Data já guardada se lê como está; só "hoje", que nasce de um instante,
   * precisa do relógio de Brasília.
   */
  const diaGuardado = (data: Date) => data.toISOString().slice(0, 10);
  const diaSugerido = rito.completedAt
    ? diaGuardado(rito.completedAt)
    : rito.scheduledAt
      ? diaGuardado(rito.scheduledAt)
      : hojeEmBrasilia();

  return (
    <div className="flex flex-col">
      <div className="pb-4">
        <Link
          href={`/catequese/turma/${id}`}
          className="text-[13px] text-muted hover:text-foreground"
        >
          ← {group.name}
        </Link>
        <h1 className="mt-1 font-serif text-[29px] font-semibold leading-tight text-foreground">
          {rito.nome}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {rito.completedAt
            ? "Rito já realizado — pode corrigir quem participou."
            : "Marque quem participou. Ao salvar, o rito passa a constar como realizado."}
        </p>
      </div>

      {enrollments.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="Ninguém matriculado ainda"
          description="Sem catequizandos na turma, não há participação a registrar."
        />
      ) : (
        <Card>
          <form action={registrarParticipacaoNoRitoAction} className="flex flex-col gap-3">
            <input type="hidden" name="ritoId" value={ritoId} />

            <div className="flex flex-col gap-1.5">
              <label htmlFor="quando" className="text-sm font-medium text-muted">
                Dia do rito
              </label>
              <input
                id="quando"
                name="quando"
                type="date"
                required
                defaultValue={diaSugerido}
                className={`${INPUT_CLASSES} max-w-[220px]`}
              />
            </div>

            <div className="flex flex-col gap-2.5 pt-1">
              {enrollments.map((matricula) => (
                <label
                  key={matricula.id}
                  className="flex items-center gap-2.5 text-[14.5px] text-foreground"
                >
                  {/*
                    Desmarcar remove SÓ a participação vinda deste rito. Um
                    rito lançado à mão na ficha da criança nunca é apagado
                    aqui — registro sacramental não some como efeito colateral
                    de uma chamada.
                  */}
                  <input
                    type="checkbox"
                    name="participou"
                    value={matricula.id}
                    defaultChecked={jaParticiparam.has(matricula.id)}
                    className="h-[18px] w-[18px] accent-[rgb(var(--color-primary))]"
                  />
                  {matricula.familyMember.fullName}
                </label>
              ))}
            </div>

            <Button type="submit" className="mt-1 w-fit">
              <Sparkles className="h-[17px] w-[17px]" strokeWidth={1.5} aria-hidden />
              Salvar participação
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
