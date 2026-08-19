"use client";

import { recordAttendanceAction } from "@/server/actions/catequese-actions";
import { Button } from "@/components/ui/Button";

type Enrollment = { id: string; familyMember: { fullName: string } };

export function AttendanceForm({
  groupId,
  sessionId,
  enrollments,
  presentByEnrollment,
}: {
  groupId: string;
  sessionId: string;
  enrollments: Enrollment[];
  presentByEnrollment: Record<string, boolean>;
}) {
  return (
    <form action={recordAttendanceAction} className="flex flex-col gap-3">
      <input type="hidden" name="groupId" value={groupId} />
      <input type="hidden" name="sessionId" value={sessionId} />
      {enrollments.map((enrollment) => (
        <label key={enrollment.id} className="flex items-center gap-2 text-sm text-ink-900">
          <input type="hidden" name="enrollmentId" value={enrollment.id} />
          <input
            type="checkbox"
            name={`present_${enrollment.id}`}
            defaultChecked={presentByEnrollment[enrollment.id] ?? false}
          />
          {enrollment.familyMember.fullName}
        </label>
      ))}
      <Button type="submit" className="mt-2 w-fit">
        Salvar chamada
      </Button>
    </form>
  );
}
