import Link from "next/link";
import { getSessionContext } from "@/server/auth/session";
import { listMyFamilyMembers } from "@/server/modules/family/service";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { RELATIONSHIP_LABELS } from "@/lib/familia-labels";
import { formatDateOnly } from "@/lib/date";
import { FamilyMemberForm } from "./FamilyMemberForm";

export default async function FamilyPage() {
  const session = await getSessionContext();
  if (!session?.membership) {
    return (
      <EmptyState
        icon="👨‍👩‍👧"
        title="Você ainda não pertence a uma comunidade"
        description="Peça ao seu pároco, secretaria ou a alguém da paróquia um link ou QR Code de convite para entrar."
      />
    );
  }

  const members = await listMyFamilyMembers(session.membership.parishId, session.userId);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-serif text-xl text-ink-900">Minha família</h1>
        <p className="mt-1 text-sm text-ink-700">
          Cadastre seus dependentes aqui — é assim que eles podem ser matriculados na catequese.
        </p>
      </div>

      <Card>
        <FamilyMemberForm />
      </Card>

      {members.length === 0 ? (
        <EmptyState icon="👨‍👩‍👧" title="Nenhum dependente cadastrado" description="Adicione acima." />
      ) : (
        <div className="flex flex-col gap-2">
          {members.map((member) => (
            <Link key={member.id} href={`/eu/familia/${member.id}`}>
              <Card className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-ink-900">{member.fullName}</p>
                  {member.birthDate && <p className="text-xs text-ink-700">{formatDateOnly(member.birthDate)}</p>}
                </div>
                <Badge>{RELATIONSHIP_LABELS[member.relationship] ?? member.relationship}</Badge>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
