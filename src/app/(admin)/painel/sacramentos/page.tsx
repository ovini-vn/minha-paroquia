import type { Metadata } from "next";
import { ScrollText, Check, FileText } from "lucide-react";
import { requirePermissionForPage } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import { listSacramentsForValidation } from "@/server/modules/caminhada/service";
import { setSacramentValidationAction } from "@/server/actions/caminhada-actions";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button, LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Avatar } from "@/components/ui/Avatar";
import { PageHeader, Eyebrow } from "@/components/ui/Typography";
import { formatDateOnly } from "@/lib/date";
import { SACRAMENT_TYPE_LABELS, SACRAMENT_STATUS_LABELS } from "@/lib/caminhada-labels";
import type { SacramentType } from "@prisma/client";
import {
  FiltroDeSacramentos,
  type FiltrosDeSacramentos,
} from "./_components/FiltroDeSacramentos";

export const metadata: Metadata = { title: "Sacramentos" };

export default async function SacramentsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; q?: string }>;
}) {
  const session = await requirePermissionForPage(PERMISSIONS.SACRAMENTS_VALIDATE);
  if (!session.membership) return null;

  const todos = await listSacramentsForValidation(session.membership.parishId);

  const { tipo, q } = await searchParams;
  const busca = (q ?? "").trim();

  const solto = (t: string) =>
    t
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase();

  // Uma das duas pontas existe, garantido por CHECK no banco.
  const nomeDe = (x: (typeof todos)[number]) =>
    x.user?.fullName ?? x.familyMember?.fullName ?? "";

  const tipos = [...new Set(todos.map((x) => x.type))]
    .map((id) => ({ id, quantos: todos.filter((x) => x.type === id).length }))
    .sort((a, b) => b.quantos - a.quantos);

  const escolhido = tipos.some((t) => t.id === tipo) ? (tipo as SacramentType) : null;
  const filtros: FiltrosDeSacramentos = { tipo: escolhido, busca };

  const sacraments = todos.filter(
    (x) =>
      (!escolhido || x.type === escolhido) &&
      (!busca || solto(nomeDe(x)).includes(solto(busca))),
  );
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
          {/* A certidão só é oferecida depois de VALIDADO: certidão de
              sacramento autodeclarado seria a paróquia atestando o que ela
              não conferiu. */}
          {validated && (
            <LinkButton href={`/painel/sacramentos/${sacrament.id}/certidao`} variant="ghost" size="sm">
              <FileText className="h-3.5 w-3.5" strokeWidth={1.6} aria-hidden />
              Certidão
            </LinkButton>
          )}
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

      {todos.length > 0 && <FiltroDeSacramentos filtros={filtros} tipos={tipos} />}

      {sacraments.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title={todos.length === 0 ? "Nenhum sacramento registrado" : "Nada neste recorte"}
          description={
            todos.length === 0
              ? "Assim que um fiel registrar um sacramento em Minha Caminhada, ele aparece aqui."
              : busca
                ? `Nenhum registro no nome de "${busca}"${escolhido ? ` em ${SACRAMENT_TYPE_LABELS[escolhido]}` : ""}.`
                : "Não há registros deste tipo."
          }
          action={
            todos.length > 0 ? (
              <LinkButton href="/painel/sacramentos" size="sm">
                Ver todos os registros
              </LinkButton>
            ) : undefined
          }
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
                Já validados ({validados.length})
              </Eyebrow>
              <Card className="px-3.5 py-1.5">{validados.map(linha)}</Card>
            </section>
          )}
        </>
      )}
    </div>
  );
}
