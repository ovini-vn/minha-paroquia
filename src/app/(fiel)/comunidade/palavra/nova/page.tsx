import { getSessionContext } from "@/server/auth/session";
import { PERMISSIONS } from "@/server/auth/rbac";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PostForm } from "./PostForm";
import { Mic } from "lucide-react";

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
    <Card>
      <h1 className="mb-4 font-serif text-xl text-foreground">Palavra do Padre</h1>
      <PostForm />
    </Card>
  );
}
