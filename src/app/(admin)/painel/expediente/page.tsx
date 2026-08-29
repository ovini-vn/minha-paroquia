import type { Metadata } from "next";
import { requirePermissionForPage } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import { listOfficeHours } from "@/server/modules/parishes/service";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/Typography";
import { ExpedienteForm } from "./ExpedienteForm";

export const metadata: Metadata = { title: "Horário da secretaria" };

export default async function ExpedienteAdminPage() {
  const session = await requirePermissionForPage(PERMISSIONS.DASHBOARD_PARISH_VIEW);
  if (!session.membership) return null;

  const faixas = await listOfficeHours(session.membership.parishId);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Horário da secretaria"
        description="O fiel vê estes horários em Contato, junto com o aviso de aberta ou fechada agora."
      />
      <Card>
        <ExpedienteForm faixas={faixas} />
      </Card>
    </div>
  );
}
