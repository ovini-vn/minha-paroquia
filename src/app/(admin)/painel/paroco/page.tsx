import { UserRound } from "lucide-react";
import { requirePermissionForPage } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import { getParoco } from "@/server/modules/priests/service";
import { isUploadConfigured, diagnosticoDoUpload } from "@/server/modules/uploads/service";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/Typography";
import { ParocoForm } from "./ParocoForm";

export default async function ParocoAdminPage() {
  const session = await requirePermissionForPage(PERMISSIONS.DASHBOARD_PARISH_VIEW);
  if (!session.membership) return null;

  const paroco = await getParoco(session.membership.parishId);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Nosso Pároco"
        description="A apresentação do pároco, como o fiel lê em Comunidade → Nosso Pároco."
      />
      {paroco ? (
        <Card>
          <ParocoForm
            nome={paroco.user.fullName}
            title={paroco.title}
            bio={paroco.bio ?? ""}
            photoUrl={paroco.photoUrl ?? ""}
            podeEnviarArquivo={isUploadConfigured()}
            motivoIndisponivel={diagnosticoDoUpload()}
          />
        </Card>
      ) : (
        <EmptyState
          icon={UserRound}
          title="Nenhum pároco definido"
          description="Em Membros e papéis, dê o papel de Pároco a um sacerdote da paróquia. A apresentação dele aparece aqui em seguida."
        />
      )}
    </div>
  );
}
