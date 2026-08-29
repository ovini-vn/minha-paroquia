import type { Metadata } from "next";
import { requirePermissionForPage } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import { getParish } from "@/server/modules/parishes/service";
import { isUploadConfigured, diagnosticoDoUpload } from "@/server/modules/uploads/service";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/Typography";
import { HistoriaForm } from "./HistoriaForm";

export const metadata: Metadata = { title: "Nossa História" };

export default async function HistoriaAdminPage() {
  const session = await requirePermissionForPage(PERMISSIONS.DASHBOARD_PARISH_VIEW);
  if (!session.membership) return null;

  const parish = await getParish(session.membership.parishId);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Nossa História"
        description="O memorial da paróquia, como o fiel lê em Comunidade → Nossa História."
      />
      <Card>
        <HistoriaForm
          historia={parish?.historia ?? ""}
          fotoUrl={parish?.historiaFotoUrl ?? ""}
          podeEnviarArquivo={isUploadConfigured()}
          motivoIndisponivel={diagnosticoDoUpload()}
        />
      </Card>
    </div>
  );
}
