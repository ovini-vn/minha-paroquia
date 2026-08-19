import { notFound } from "next/navigation";
import { requireSessionForPage } from "@/server/auth/guards";
import { getOwnFamilyMember, listGuardians } from "@/server/modules/family/service";
import { listActiveMembers } from "@/server/modules/parishes/service";
import { removeGuardianAction } from "@/server/actions/family-actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { RELATIONSHIP_LABELS } from "@/lib/familia-labels";
import { formatDateOnly } from "@/lib/date";
import { AddGuardianForm } from "./AddGuardianForm";

export default async function FamilyMemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSessionForPage();
  if (!session.membership) return null;

  const { id } = await params;
  const member = await getOwnFamilyMember(session.membership.parishId, id, session.userId);
  if (!member) notFound();

  const [guardians, activeMembers] = await Promise.all([
    listGuardians(session.membership.parishId, id),
    listActiveMembers(session.membership.parishId),
  ]);

  const guardianUserIds = new Set(guardians.map((g) => g.userId));
  const candidates = activeMembers
    .filter((m) => !guardianUserIds.has(m.user.id))
    .map((m) => ({ id: m.user.id, fullName: m.user.fullName }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-xl text-ink-900">{member.fullName}</h1>
        <p className="mt-1 text-sm text-ink-700">
          {RELATIONSHIP_LABELS[member.relationship] ?? member.relationship}
          {member.birthDate ? ` · ${formatDateOnly(member.birthDate)}` : ""}
        </p>
      </div>

      <Card>
        <p className="mb-3 font-serif text-lg text-ink-900">Responsáveis</p>
        <p className="mb-3 text-sm text-ink-700">
          Mais de uma pessoa pode ser responsável ao mesmo tempo (ex.: pai e mãe) — todas enxergam e gerenciam este
          cadastro.
        </p>
        <ul className="mb-4 flex flex-col gap-1.5">
          {guardians.map((guardian) => (
            <li key={guardian.id} className="flex items-center justify-between border-b border-border py-2 text-sm">
              <span className="text-ink-900">{guardian.user.fullName}</span>
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
        <AddGuardianForm familyMemberId={id} candidates={candidates} />
      </Card>
    </div>
  );
}
