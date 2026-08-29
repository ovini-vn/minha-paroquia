import type { Metadata } from "next";
import { requireSessionForPage } from "@/server/auth/guards";
import { findUserById } from "@/server/modules/users/repository";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/Typography";
import { ProfileForm } from "./ProfileForm";

export const metadata: Metadata = { title: "Meu perfil" };

export default async function ProfileEditPage() {
  const session = await requireSessionForPage();
  const user = await findUserById(session.userId);
  if (!user) return null;

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Editar perfil"
        description="Como a comunidade vê você. Só seu nome aparece para os outros."
      />
      <Card>
        <ProfileForm
          fullName={user.fullName}
          phone={user.phone ?? ""}
          birthDate={user.birthDate ? user.birthDate.toISOString().slice(0, 10) : ""}
          photoUrl={user.photoUrl ?? ""}
        />
      </Card>
    </div>
  );
}
