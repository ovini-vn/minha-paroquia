import { requireSessionForPage } from "@/server/auth/guards";
import { findUserById } from "@/server/modules/users/repository";
import { Card } from "@/components/ui/Card";
import { ProfileForm } from "./ProfileForm";

export default async function ProfileEditPage() {
  const session = await requireSessionForPage();
  const user = await findUserById(session.userId);
  if (!user) return null;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-serif text-xl text-ink-900">Editar perfil</h1>
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
