import { notFound } from "next/navigation";
import { requirePermissionForPage } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import { getAviso } from "@/server/modules/avisos/service";
import { Card } from "@/components/ui/Card";
import { EditAvisoForm } from "./EditAvisoForm";

export default async function EditAvisoPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermissionForPage(PERMISSIONS.AVISOS_MANAGE);
  if (!session.membership) return null;

  const { id } = await params;
  const aviso = await getAviso(session.membership.parishId, id);
  if (!aviso) notFound();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-2xl text-foreground">Editar aviso</h1>
      <Card>
        <EditAvisoForm id={aviso.id} title={aviso.title} body={aviso.body} />
      </Card>
    </div>
  );
}
