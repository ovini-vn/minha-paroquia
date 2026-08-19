import { notFound } from "next/navigation";
import { requirePermissionForPage } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import { getGroup, listEnrollments } from "@/server/modules/catequese/service";
import { listAllFamilyMembers } from "@/server/modules/family/service";
import { Card } from "@/components/ui/Card";
import { EnrollForm } from "./EnrollForm";

export default async function CatequeseGroupAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermissionForPage(PERMISSIONS.CATEQUESE_MANAGE);
  if (!session.membership) return null;
  const { id } = await params;

  const group = await getGroup(session.membership.parishId, id);
  if (!group) notFound();

  const [enrollments, familyMembers] = await Promise.all([
    listEnrollments(session.membership.parishId, id),
    listAllFamilyMembers(session.membership.parishId),
  ]);

  const enrolledIds = new Set(enrollments.map((e) => e.familyMemberId));
  const available = familyMembers.filter((fm) => !enrolledIds.has(fm.id));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl text-foreground">
          {group.name} · {group.year}
        </h1>
        <p className="text-sm text-muted">
          {group.catechist ? `Catequista: ${group.catechist.fullName}` : "Sem catequista designado"}
        </p>
      </div>

      <Card>
        <p className="mb-3 font-serif text-lg text-foreground">Matricular dependente</p>
        {available.length === 0 ? (
          <p className="text-sm text-muted">
            Todos os dependentes cadastrados já estão matriculados nesta turma, ou nenhum dependente foi
            cadastrado ainda.
          </p>
        ) : (
          <EnrollForm groupId={id} familyMembers={available} />
        )}
      </Card>

      <Card>
        <p className="mb-3 font-serif text-lg text-foreground">Matriculados</p>
        {enrollments.length === 0 ? (
          <p className="text-sm text-muted">Ninguém matriculado ainda.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {enrollments.map((enrollment) => (
              <li key={enrollment.id} className="text-sm text-foreground">
                {enrollment.familyMember.fullName}{" "}
                <span className="text-xs text-muted">
                  (responsável: {enrollment.familyMember.responsible.fullName})
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
