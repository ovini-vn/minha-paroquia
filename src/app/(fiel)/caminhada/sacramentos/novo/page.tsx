import type { Metadata } from "next";
import { getSessionContext } from "@/server/auth/session";
import { listPriests } from "@/server/modules/priests/service";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/Typography";
import { SacramentForm } from "./SacramentForm";
import { HandHeart } from "lucide-react";

export const metadata: Metadata = { title: "Registrar sacramento" };

export default async function NewSacramentPage() {
  const session = await getSessionContext();
  if (!session?.membership) {
    return (
      <EmptyState
        icon={HandHeart}
        title="Você ainda não pertence a uma comunidade"
        description="Escolha a sua paróquia para acompanhar a vida da comunidade."
      />
    );
  }

  const priests = await listPriests(session.membership.parishId);

  return (
    <div className="flex flex-col lg:max-w-[42rem]">
      <PageHeader
        title="Registrar sacramento"
        description="Registre um marco da sua vida de fé. A paróquia pode depois validar com o registro oficial."
      />
      <Card>
        <SacramentForm priests={priests} />
      </Card>
    </div>
  );
}
