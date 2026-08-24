import { notFound } from "next/navigation";
import { requireSessionForPage } from "@/server/auth/guards";
import { getOwnFamilyMember, listGuardians } from "@/server/modules/family/service";
import { removeGuardianAction } from "@/server/actions/family-actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { describeRelationship } from "@/lib/familia-labels";
import { formatDateOnly } from "@/lib/date";
import { AddGuardianForm } from "./AddGuardianForm";
import { RemoveFamilyMemberButton } from "./RemoveFamilyMemberButton";

export default async function FamilyMemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSessionForPage();
  if (!session.membership) return null;

  const { id } = await params;
  const member = await getOwnFamilyMember(session.membership.parishId, id, session.userId);
  if (!member) notFound();

  // Sem listar a paróquia: o vínculo é feito digitando o nome completo.
  const guardians = await listGuardians(session.membership.parishId, id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-[29px] font-semibold leading-tight text-foreground">{member.fullName}</h1>
        <p className="mt-1 text-sm text-muted">
          {describeRelationship(member.relationship)}
          {member.birthDate ? ` · ${formatDateOnly(member.birthDate)}` : ""}
        </p>
      </div>

      <Card>
        <p className="mb-3 font-serif text-lg font-semibold text-foreground">Responsáveis</p>
        <p className="mb-3 text-sm text-muted">
          Mais de uma pessoa pode ser responsável ao mesmo tempo (ex.: pai e mãe) — todas enxergam e gerenciam este
          cadastro.
        </p>
        <ul className="mb-4 flex flex-col gap-1.5">
          {guardians.map((guardian) => (
            <li key={guardian.id} className="flex items-center justify-between border-b border-border py-2 text-sm">
              <span className="text-foreground">{guardian.user.fullName}</span>
              {guardians.length > 1 && (
                <form action={removeGuardianAction}>
                  <input type="hidden" name="familyMemberId" value={id} />
                  <input type="hidden" name="userId" value={guardian.userId} />
                  <Button type="submit" variant="ghost">
                    Remover
                  </Button>
                </form>
              )}
            </li>
          ))}
        </ul>
        <AddGuardianForm familyMemberId={id} />
      </Card>

      {/* Separado do cartão de responsáveis: excluir o cadastro inteiro é
          outra ordem de gravidade do que tirar um responsável. */}
      <Card>
        <p className="mb-1 font-serif text-lg font-semibold text-foreground">Excluir cadastro</p>
        <p className="mb-3 text-sm leading-relaxed text-muted">
          Se este cadastro foi feito por engano ou está duplicado, pode ser removido. Para passar o
          dependente para outra conta sem perder nada, adicione essa pessoa como responsável acima e
          depois remova a sua — nada é perdido nesse caminho.
        </p>
        <RemoveFamilyMemberButton familyMemberId={id} fullName={member.fullName} />
      </Card>
    </div>
  );
}
