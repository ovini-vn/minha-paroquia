import type { Metadata } from "next";
import { requirePermissionForPage } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import { getParish } from "@/server/modules/parishes/service";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/Typography";
import { ParishProfileForm } from "../ParishProfileForm";

export const metadata: Metadata = { title: "Dados da paróquia" };

/**
 * Endereço, contato e redes da paróquia — o que o fiel vê em Comunidade e
 * em Contato.
 *
 * Morava no índice do painel, logo abaixo do nome da paróquia. Era um
 * formulário de nove campos ocupando o alto da tela por onde toda tarefa
 * passa, para uma informação que se preenche uma vez e se corrige quando o
 * telefone muda.
 */
export default async function DadosDaParoquiaPage() {
  const session = await requirePermissionForPage(PERMISSIONS.DASHBOARD_PARISH_VIEW);
  if (!session.membership) return null;

  const parish = await getParish(session.membership.parishId);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dados da paróquia"
        description="Endereço, contato e redes. É o que o fiel vê em Minha Comunidade e na tela de Contato."
      />
      <Card>
        <ParishProfileForm
          city={parish?.city ?? ""}
          state={parish?.state ?? ""}
          address={parish?.address ?? ""}
          phone={parish?.phone ?? ""}
          description={parish?.description ?? ""}
          logoUrl={parish?.logoUrl ?? ""}
          whatsapp={parish?.whatsapp ?? ""}
          email={parish?.email ?? ""}
          facebookUrl={parish?.facebookUrl ?? ""}
          instagramUrl={parish?.instagramUrl ?? ""}
        />
      </Card>
    </div>
  );
}
