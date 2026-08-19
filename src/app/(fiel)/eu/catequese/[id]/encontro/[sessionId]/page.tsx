import { notFound } from "next/navigation";
import { getSessionContext } from "@/server/auth/session";
import { isFullAdmin } from "@/server/auth/rbac";
import { getGroup, listEnrollments, listAttendanceForSession } from "@/server/modules/catequese/service";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { AttendanceForm } from "./AttendanceForm";

export default async function AttendancePage({
  params,
}: {
  params: Promise<{ id: string; sessionId: string }>;
}) {
  const session = await getSessionContext();
  if (!session?.membership) return null;
  const { id, sessionId } = await params;

  const catechistOnly = isFullAdmin(session.membership.roleCode) ? undefined : session.userId;
  const group = await getGroup(session.membership.parishId, id, catechistOnly);
  if (!group) notFound();

  const [enrollments, attendance] = await Promise.all([
    listEnrollments(session.membership.parishId, id),
    listAttendanceForSession(session.membership.parishId, sessionId),
  ]);
  const presentByEnrollment = Object.fromEntries(attendance.map((a) => [a.enrollmentId, a.present]));

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-serif text-xl text-foreground">Chamada — {group.name}</h1>

      {enrollments.length === 0 ? (
        <EmptyState icon="📖" title="Ninguém matriculado ainda" description="Nada para chamar por enquanto." />
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
