import { requirePermissionForPage } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import { listSacramentsForValidation } from "@/server/modules/caminhada/service";
import { setSacramentValidationAction } from "@/server/actions/caminhada-actions";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateOnly } from "@/lib/date";
import { SACRAMENT_TYPE_LABELS, SACRAMENT_STATUS_LABELS } from "@/lib/caminhada-labels";

export default async function SacramentsAdminPage() {
  const session = await requirePermissionForPage(PERMISSIONS.SACRAMENTS_VALIDATE);
  if (!session.membership) return null;

  const sacraments = await listSacramentsForValidation(session.membership.parishId);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-2xl text-foreground">Validação de sacramentos</h1>
      <p className="text-sm text-muted">
        Sacramentos são autodeclarados pelo fiel. Validar confirma que batem com o registro oficial da paróquia.
      </p>

      {sacraments.length === 0 ? (
        <EmptyState
          icon="📜"
          title="Nenhum sacramento registrado ainda"
          description="Assim que um fiel registrar um sacramento em Minha Caminhada, ele aparece aqui."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {sacraments.map((sacrament) => {
            const validated = sacrament.status === "validated";
            return (
              <Card key={sacrament.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {SACRAMENT_TYPE_LABELS[sacrament.type]} · {sacrament.user.fullName}
                  </p>
                  <p className="text-xs text-muted">
                    {formatDateOnly(sacrament.date)}
                    {sacrament.location ? ` · ${sacrament.location}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge>{SACRAMENT_STATUS_LABELS[sacrament.status]}</Badge>
                  <form action={setSacramentValidationAction}>
                    <input type="hidden" name="id" value={sacrament.id} />
                    <input type="hidden" name="validated" value={validated ? "false" : "true"} />
                    <Button type="submit" variant="ghost">
                      {validated ? "Reverter" : "Validar"}
                    </Button>
                  </form>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
