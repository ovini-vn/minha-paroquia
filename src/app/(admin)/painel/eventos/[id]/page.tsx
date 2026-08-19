import { notFound } from "next/navigation";
import { requirePermissionForPage } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import { getEvent } from "@/server/modules/events/service";
import { Card } from "@/components/ui/Card";
import { EditEventForm } from "./EditEventForm";

function toLocalDatetimeInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermissionForPage(PERMISSIONS.AGENDA_MANAGE);
  if (!session.membership) return null;

  const { id } = await params;
  const event = await getEvent(session.membership.parishId, id);
  if (!event) notFound();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-2xl text-ink-900">Editar evento</h1>
      <Card>
        <EditEventForm
          id={event.id}
          title={event.title}
          description={event.description ?? ""}
          startsAtLocal={toLocalDatetimeInputValue(event.startsAt)}
          location={event.location ?? ""}
        />
      </Card>
    </div>
  );
}
