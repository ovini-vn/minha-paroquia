import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, Church, Users } from "lucide-react";
import { requireSessionForPage } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import {
  getGroup,
  listEnrollments,
  listAttendanceForSession,
  listarMissaDaTurma,
  obterEncontro,
} from "@/server/modules/catequese/service";
import { listUpcomingCelebrations } from "@/server/modules/celebrations/service";
import { domingoAte } from "@/lib/brasilia";
import { formatDateTime } from "@/lib/date";
import { Eyebrow } from "@/components/ui/Typography";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { AttendanceForm } from "../../../../_components/AttendanceForm";
import { MissaDaTurmaForm } from "../../../../_components/MissaDaTurmaForm";

export default async function ChamadaPage({
  params,
}: {
  params: Promise<{ id: string; sessionId: string }>;
}) {
  const session = await requireSessionForPage();
  if (!session.membership) return null;
  const { id, sessionId } = await params;

  const parishId = session.membership.parishId;
  const pode = (code: string) =>
    session.isPlatformAdmin || session.permissions.includes(code as never);
  const coordena = pode(PERMISSIONS.CATEQUESE_MANAGE);
  const leciona = pode(PERMISSIONS.CATEQUESE_TEACH);
  if (!coordena && !leciona) notFound();

  const group = await getGroup(parishId, id, coordena ? undefined : session.userId);
  if (!group) notFound();

  const encontro = await obterEncontro(parishId, sessionId);
  if (!encontro || encontro.catechismGroupId !== id) notFound();
  // A missa não é no dia do encontro: o padrão é o domingo mais recente até
  // ele — o caso comum de uma catequese de sábado ou de meio de semana.
  const domingoSugerido = domingoAte(encontro?.date ?? new Date());
  const diaDaMissa = new Date(`${domingoSugerido}T00:00:00.000Z`);

  const [enrollments, attendance, naMissa, celebracoes] = await Promise.all([
    listEnrollments(parishId, id),
    listAttendanceForSession(parishId, sessionId),
    listarMissaDaTurma(parishId, id, diaDaMissa),
    listUpcomingCelebrations(parishId, 10),
  ]);
  const presentByEnrollment = Object.fromEntries(attendance.map((a) => [a.enrollmentId, a.present]));
  const presentesNaMissa = new Set(naMissa.map((m) => m.enrollmentId));

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
          Chamada
        </h1>
      </div>

      {enrollments.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Ninguém matriculado ainda"
          description="Nada para chamar por enquanto."
        />
      ) : (
        <>
          {/*
            Duas presenças, e nenhuma substitui a outra: a do encontro diz se
            a criança veio à catequese; a da missa é o que a caminhada
            sacramental pede, e é a que a família mais acompanha.

            Antes só a primeira estava aqui. A da missa existia apenas dentro
            da ficha de cada catequizando — numa turma de 25, eram 25 telas
            para marcar quem foi no domingo.
          */}
          <section>
            <Eyebrow tone="accent" className="mb-3">
              <Users className="mr-1.5 inline h-3.5 w-3.5" strokeWidth={2} aria-hidden />
              Presença no encontro
            </Eyebrow>
            <Card>
              <AttendanceForm
                groupId={id}
                sessionId={sessionId}
                enrollments={enrollments}
                presentByEnrollment={presentByEnrollment}
              />
            </Card>
          </section>

          <section className="pt-7">
            <Eyebrow tone="accent" className="mb-3">
              <Church className="mr-1.5 inline h-3.5 w-3.5" strokeWidth={2} aria-hidden />
              Presença na missa
            </Eyebrow>
            <Card>
              <MissaDaTurmaForm
                groupId={id}
                sessionId={sessionId}
                matriculas={enrollments}
                presentes={presentesNaMissa}
                domingoSugerido={domingoSugerido}
                celebracoes={celebracoes.map((c) => ({
                  id: c.id,
                  label: `${c.title || "Missa"} · ${formatDateTime(c.startsAt)}`,
                }))}
              />
            </Card>
          </section>
        </>
      )}
    </div>
  );
}
