import { requirePermissionForPage } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import { listAllAvisos } from "@/server/modules/avisos/service";
import { setAvisoStatusAction } from "@/server/actions/aviso-actions";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button, LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateTime } from "@/lib/date";
import { CreateAvisoForm } from "./CreateAvisoForm";

export default async function AvisosAdminPage() {
  const session = await requirePermissionForPage(PERMISSIONS.AVISOS_MANAGE);
  if (!session.membership) return null;

  const avisos = await listAllAvisos(session.membership.parishId);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-2xl text-ink-900">Avisos</h1>

      <Card>
        <p className="mb-3 font-serif text-lg text-ink-900">Novo aviso</p>
        <CreateAvisoForm />
      </Card>

      {avisos.length === 0 ? (
        <EmptyState icon="📣" title="Nenhum aviso publicado ainda" description="Crie o primeiro acima." />
      ) : (
        <div className="flex flex-col gap-2">
          {avisos.map((aviso) => {
            const archived = aviso.status === "archived";
            return (
              <Card key={aviso.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-ink-900">{aviso.title}</p>
                    <p className="mt-1 text-sm text-ink-700">{aviso.body}</p>
                    <p className="mt-1 text-xs text-ink-700">{formatDateTime(aviso.createdAt)}</p>
                  </div>
                  <Badge>{archived ? "Arquivado" : "Publicado"}</Badge>
                </div>
                <div className="mt-3 flex items-center gap-2 border-t border-terracotta-50 pt-3">
                  <LinkButton href={`/painel/avisos/${aviso.id}`} variant="secondary">
                    Editar
                  </LinkButton>
                  <form action={setAvisoStatusAction}>
                    <input type="hidden" name="id" value={aviso.id} />
                    <input type="hidden" name="status" value={archived ? "published" : "archived"} />
                    <Button type="submit" variant="ghost">
                      {archived ? "Republicar" : "Arquivar"}
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
