import type { Metadata } from "next";
import { getSessionContext } from "@/server/auth/session";
import { PERMISSIONS } from "@/server/auth/rbac";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/Typography";
import { PostForm } from "./PostForm";
import { Mic } from "lucide-react";

export const metadata: Metadata = { title: "Publicar Palavra do Padre" };

export default async function NewPostPage() {
  const session = await getSessionContext();

  if (!session?.membership || !session.permissions.includes(PERMISSIONS.POSTS_CREATE)) {
    return (
      <EmptyState
        icon={Mic}
        title="Esta área é para sacerdotes"
        description="Publicar a Palavra do Padre é reservado a quem tem um perfil de sacerdote na paróquia."
      />
    );
  }

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Palavra do Padre"
        description="Uma mensagem para a comunidade. Aparece no Início e em Comunidade."
      />
      <Card>
        <PostForm />
      </Card>
    </div>
  );
}
