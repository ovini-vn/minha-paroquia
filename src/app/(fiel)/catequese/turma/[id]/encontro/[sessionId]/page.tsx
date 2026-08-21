import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen } from "lucide-react";
import { requireSessionForPage } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import {
  getGroup,
  listEnrollments,
  listAttendanceForSession,
} from "@/server/modules/catequese/service";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { AttendanceForm } from "../../../../_components/AttendanceForm";

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

  const [enrollments, attendance] = await Promise.all([
    listEnrollments(parishId, id),
    listAttendanceForSession(parishId, sessionId),
  ]);
  const presentByEnrollment = Object.fromEntries(attendance.map((a) => [a.enrollmentId, a.present]));

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
        <Card>
          <AttendanceForm
            groupId={id}
            sessionId={sessionId}
            enrollments={enrollments}
            presentByEnrollment={presentByEnrollment}
          />
        </Card>
      )}
    </div>
  );
}
