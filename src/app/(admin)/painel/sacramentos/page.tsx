import type { Metadata } from "next";
import { ScrollText, Check } from "lucide-react";
import { requirePermissionForPage } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import { listSacramentsForValidation } from "@/server/modules/caminhada/service";
import { setSacramentValidationAction } from "@/server/actions/caminhada-actions";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Avatar } from "@/components/ui/Avatar";
import { PageHeader, Eyebrow } from "@/components/ui/Typography";
import { formatDateOnly } from "@/lib/date";
import { SACRAMENT_TYPE_LABELS, SACRAMENT_STATUS_LABELS } from "@/lib/caminhada-labels";

export const metadata: Metadata = { title: "Sacramentos" };

export default async function SacramentsAdminPage() {
  const session = await requirePermissionForPage(PERMISSIONS.SACRAMENTS_VALIDATE);
  if (!session.membership) return null;

  const sacraments = await listSacramentsForValidation(session.membership.parishId);
  const pendentes = sacraments.filter((s) => s.status !== "validated");
  const validados = sacraments.filter((s) => s.status === "validated");

  const linha = (sacrament: (typeof sacraments)[number]) => {
    const validated = sacrament.status === "validated";
    // Uma das duas pontas existe, garantido por CHECK no banco. O
    // catequizando sem conta aparece aqui como qualquer outro.
    const nome = sacrament.user?.fullName ?? sacrament.familyMember?.fullName ?? "Sem nome";
    return (
      <div
        key={sacrament.id}
        className="flex flex-wrap items-center gap-3 border-b border-border py-3.5 last:border-b-0"
      >
        <Avatar name={nome} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="text-[14.5px] font-medium text-foreground">
            {SACRAMENT_TYPE_LABELS[sacrament.type]}
          </p>
          <p className="mt-0.5 text-[12.5px] text-muted">
            {nome} · {formatDateOnly(sacrament.date)}
            {sacrament.location ? ` · ${sacrament.location}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge tone={validated ? "success" : "muted"}>
            {validated && <Check className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />}
            {SACRAMENT_STATUS_LABELS[sacrament.status]}
          </Badge>
          <form action={setSacramentValidationAction}>
            <input type="hidden" name="id" value={sacrament.id} />
            <input type="hidden" name="validated" value={validated ? "false" : "true"} />
            <Button type="submit" variant={validated ? "ghost" : "primary"} size="sm">
              {validated ? "Reverter" : "Validar"}
            </Button>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Validação de sacramentos"
        description="Sacramentos são autodeclarados pelo fiel. Validar confirma que batem com o registro oficial da paróquia."
      />

      {sacraments.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="Nenhum sacramento registrado"
          description="Assim que um fiel registrar um sacramento em Minha Caminhada, ele aparece aqui."
        />
      ) : (
        <>
          <section>
            <Eyebrow tone="accent" className="mb-3">
              Aguardando validação {pendentes.length > 0 && `(${pendentes.length})`}
            </Eyebrow>
            {pendentes.length === 0 ? (
              <Card>
                <p className="text-[13.5px] text-muted">Nada pendente — tudo validado.</p>
              </Card>
            ) : (
              <Card className="px-3.5 py-1.5">{pendentes.map(linha)}</Card>
            )}
          </section>

          {validados.length > 0 && (
            <section>
              <Eyebrow tone="accent" className="mb-3">
                Já validados
              </Eyebrow>
              <Card className="px-3.5 py-1.5">{validados.map(linha)}</Card>
            </section>
          )}
        </>
      )}
    </div>
  );
}
