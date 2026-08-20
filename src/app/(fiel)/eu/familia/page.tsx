import Link from "next/link";
import { getSessionContext } from "@/server/auth/session";
import { listMyFamilyMembers } from "@/server/modules/family/service";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Avatar } from "@/components/ui/Avatar";
import { PageHeader, Eyebrow } from "@/components/ui/Typography";
import { RELATIONSHIP_LABELS } from "@/lib/familia-labels";
import { formatDateOnly } from "@/lib/date";
import { FamilyMemberForm } from "./FamilyMemberForm";
import { Users } from "lucide-react";

export default async function FamilyPage() {
  const session = await getSessionContext();
  if (!session?.membership) {
    return (
      <EmptyState
        icon={Users}
        title="Você ainda não pertence a uma comunidade"
        description="Peça ao seu pároco, secretaria ou a alguém da paróquia um link ou QR Code de convite para entrar."
      />
    );
  }

  const members = await listMyFamilyMembers(session.membership.parishId, session.userId);

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Minha família"
        description="Cadastre seus dependentes aqui — é assim que eles podem ser matriculados na catequese."
      />

      <Card>
        <FamilyMemberForm />
      </Card>

      <section className="pt-7">
        <Eyebrow tone="accent" className="mb-3">
          Dependentes
        </Eyebrow>
        {members.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Nenhum dependente cadastrado"
            description="Adicione acima quem faz parte da sua família na paróquia."
          />
        ) : (
          <Card className="px-3.5 py-1.5">
            {members.map((member) => (
              <Link
                key={member.id}
                href={`/eu/familia/${member.id}`}
                className="flex items-center gap-3.5 border-b border-border py-3 transition-colors last:border-b-0 hover:bg-primary-tint"
              >
                <Avatar name={member.fullName} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-[14.5px] font-medium text-foreground">{member.fullName}</p>
                  {member.birthDate && (
                    <p className="mt-0.5 text-[12.5px] text-muted">
                      {formatDateOnly(member.birthDate)}
                    </p>
                  )}
                </div>
                <Badge>{RELATIONSHIP_LABELS[member.relationship] ?? member.relationship}</Badge>
              </Link>
            ))}
          </Card>
        )}
      </section>

      <div className="rule-gold my-7" />
    </div>
  );
}
