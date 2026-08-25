import { requirePermissionForPage } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import { getParish } from "@/server/modules/parishes/service";
import { getParoco } from "@/server/modules/priests/service";
import { isUploadConfigured, diagnosticoDoUpload } from "@/server/modules/uploads/service";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/Typography";
import { ParocoForm } from "./ParocoForm";

export default async function ParocoAdminPage() {
  const session = await requirePermissionForPage(PERMISSIONS.DASHBOARD_PARISH_VIEW);
  if (!session.membership) return null;

  const parishId = session.membership.parishId;
  const [parish, registrado] = await Promise.all([getParish(parishId), getParoco(parishId)]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Nosso Pároco"
        description="A apresentação do pároco, como o fiel lê em Comunidade → Nosso Pároco."
      />
      <Card>
        <ParocoForm
          nome={parish?.parocoNome ?? ""}
          titulo={parish?.parocoTitulo ?? ""}
          historia={parish?.parocoHistoria ?? ""}
          fotoUrl={parish?.parocoFotoUrl ?? ""}
          nomeDaConta={registrado?.user.fullName ?? null}
          podeEnviarArquivo={isUploadConfigured()}
          motivoIndisponivel={diagnosticoDoUpload()}
        />
      </Card>
    </div>
  );
}
