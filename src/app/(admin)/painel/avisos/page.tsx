import type { Metadata } from "next";
import { requirePermissionForPage } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import { listAllAvisos } from "@/server/modules/avisos/service";
import { setAvisoStatusAction, excluirAvisoAction } from "@/server/actions/aviso-actions";
import { BotaoExcluir } from "@/components/ui/BotaoExcluir";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button, LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader, Eyebrow } from "@/components/ui/Typography";
import { formatDateTime } from "@/lib/date";
import { CreateAvisoForm } from "./CreateAvisoForm";
import {
  FiltroDeAvisos,
  SITUACOES,
  type FiltrosDeAvisos,
  type SituacaoDeAvisos,
} from "./_components/FiltroDeAvisos";
import { Megaphone } from "lucide-react";

export const metadata: Metadata = { title: "Avisos" };

export default async function AvisosAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ ver?: string; q?: string }>;
}) {
  const session = await requirePermissionForPage(PERMISSIONS.AVISOS_MANAGE);
  if (!session.membership) return null;

  const todos = await listAllAvisos(session.membership.parishId);

  const { ver, q } = await searchParams;
  const busca = (q ?? "").trim();
  const situacao: SituacaoDeAvisos = SITUACOES.some((v) => v.id === ver)
    ? (ver as SituacaoDeAvisos)
    : "publicados";

  // Sem acento e sem caixa: quem procura "quermesse" tem de achar o que foi
  // escrito com maiúscula, e "reuniao" tem de achar "reunião".
  const solto = (t: string) =>
    t
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase();

  const daSituacao: Record<SituacaoDeAvisos, (a: (typeof todos)[number]) => boolean> = {
    publicados: (a) => a.status !== "archived",
    arquivados: (a) => a.status === "archived",
    todos: () => true,
  };
  const quantos = Object.fromEntries(
    SITUACOES.map((v) => [v.id, todos.filter(daSituacao[v.id]).length]),
  ) as Record<SituacaoDeAvisos, number>;

  const filtros: FiltrosDeAvisos = { situacao, busca };
  const avisos = todos.filter(
    (a) =>
      daSituacao[situacao](a) &&
      (!busca || solto(`${a.title} ${a.body}`).includes(solto(busca))),
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Avisos"
        description="Comunicados da secretaria. Aparecem no Início e em Comunidade para toda a paróquia."
      />

      <Card>
        <p className="mb-3 font-serif text-lg font-semibold text-foreground">Novo aviso</p>
        <CreateAvisoForm />
      </Card>

      <section>
        {/* O título acompanha o recorte: dizer "Publicados" sobre uma lista
            de arquivados seria a tela contradizendo a si mesma. */}
        <Eyebrow tone="accent" className="mb-3">
          {SITUACOES.find((v) => v.id === situacao)?.rotulo}
        </Eyebrow>

        <FiltroDeAvisos filtros={filtros} quantos={quantos} />

        {avisos.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            title={todos.length === 0 ? "Nenhum aviso publicado" : "Nada neste recorte"}
            description={
              todos.length === 0
                ? "Crie o primeiro acima — ele aparece para toda a comunidade."
                : busca
                  ? `Nenhum aviso com "${busca}" entre os ${SITUACOES.find((v) => v.id === situacao)?.rotulo.toLowerCase()}.`
                  : "Não há avisos nesta situação."
            }
            action={
              todos.length > 0 ? (
                <LinkButton href="/painel/avisos" size="sm">
                  Ver os publicados
                </LinkButton>
              ) : undefined
            }
          />
        ) : (
          <div className="flex flex-col gap-2.5">
            {avisos.map((aviso) => {
              const archived = aviso.status === "archived";
              return (
                <Card key={aviso.id} className={archived ? "opacity-60" : undefined}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[14.5px] font-medium text-foreground">{aviso.title}</p>
                      <p className="mt-1 text-[13px] leading-relaxed text-muted">{aviso.body}</p>
                      <p className="mt-1.5 text-[11px] uppercase tracking-[0.04em] text-muted">
                        {formatDateTime(aviso.createdAt)}
                      </p>
                    </div>
                    <Badge tone={archived ? "muted" : "success"}>
                      {archived ? "Arquivado" : "Publicado"}
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
                    <LinkButton href={`/painel/avisos/${aviso.id}`} variant="ghost" size="sm">
                      Editar
                    </LinkButton>
                    <form action={setAvisoStatusAction}>
                      <input type="hidden" name="id" value={aviso.id} />
                      <input type="hidden" name="status" value={archived ? "published" : "archived"} />
                      <Button type="submit" variant="ghost" size="sm">
                        {archived ? "Republicar" : "Arquivar"}
                      </Button>
                    </form>
                    {/* Arquivar tira da vista e guarda; excluir é para o que
                        nunca deveria ter sido publicado. */}
                    <div className="ml-auto">
                      <BotaoExcluir
                        action={excluirAvisoAction}
                        id={aviso.id}
                        descricao={`o aviso ${aviso.title}`}
                      />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
