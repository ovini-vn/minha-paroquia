import type { Metadata } from "next";
import { ScrollText } from "lucide-react";
import { requirePermissionForPage } from "@/server/auth/guards";
import {
  PERMISSIONS,
  PERMISSION_NAMES,
  ROLE_NAMES,
  type PermissionCode,
  type RoleCode,
} from "@/server/auth/rbac";
import { contarPorAcao, listar, ROTULO_DA_ACAO, type Acao } from "@/server/modules/auditoria/service";
import { LinkButton } from "@/components/ui/Button";
import {
  FiltroDoRegistro,
  enderecoDoRegistro,
  PERIODOS,
  type FiltrosDoRegistro,
  type PeriodoDoRegistro,
} from "./_components/FiltroDoRegistro";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/Typography";
import { formatDateTime } from "@/lib/date";

export const metadata: Metadata = { title: "Histórico de acessos" };

/**
 * Quem fez o quê nas operações que dão ou tiram acesso.
 *
 * Reservado a quem administra a paróquia — a mesma permissão que delega
 * permissões. Um histórico de quem mexeu no acesso de quem é, ele próprio,
 * informação sensível.
 *
 * Não há como editar nem apagar linha nenhuma, nem por aqui nem por lugar
 * nenhum no código. Um registro que pode ser alterado não registra nada.
 */
export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string; acao?: string }>;
}) {
  const session = await requirePermissionForPage(PERMISSIONS.PERMISSION_OVERRIDES_MANAGE);
  if (!session.membership) return null;
  const parishId = session.membership.parishId;

  const { periodo, acao } = await searchParams;
  const escolhidoPeriodo: PeriodoDoRegistro = PERIODOS.some((p) => p.id === periodo)
    ? (periodo as PeriodoDoRegistro)
    : "30";

  const acoes = await contarPorAcao(parishId);
  const escolhidaAcao = acoes.some((a) => a.acao === acao) ? (acao as string) : null;

  /*
   * A janela conta para trás a partir de AGORA, e não do começo do dia.
   *
   * "Últimos 7 dias" num registro de auditoria quer dizer as últimas 168
   * horas — quem investiga algo que aconteceu ontem à noite não deve
   * depender de o dia ter virado.
   */
  const desde =
    escolhidoPeriodo === "tudo"
      ? undefined
      : new Date(Date.now() - Number(escolhidoPeriodo) * 24 * 3_600_000);

  const filtros: FiltrosDoRegistro = { periodo: escolhidoPeriodo, acao: escolhidaAcao };
  const registros = await listar(parishId, { acao: escolhidaAcao ?? undefined, desde });

  /** Traduz o que está em `detalhe` para quem lê, sem expor código cru. */
  function descrever(detalhe: unknown): string | null {
    if (!detalhe || typeof detalhe !== "object") return null;
    const d = detalhe as Record<string, string>;

    if (d.de && d.para) {
      const nome = (c: string) => ROLE_NAMES[c as RoleCode] ?? c;
      return `de ${nome(d.de)} para ${nome(d.para)}`;
    }
    if (d.permissao) {
      return PERMISSION_NAMES[d.permissao as PermissionCode] ?? d.permissao;
    }
    if (d.decisao) return d.decisao === "aprovado" ? "publicado no mural" : "não publicado";
    return null;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Histórico de acessos"
        description="Quem mudou papéis, permissões e senhas nesta paróquia."
      />

      {acoes.length > 0 && <FiltroDoRegistro filtros={filtros} acoes={acoes} />}

      {registros.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title={acoes.length === 0 ? "Nada registrado ainda" : "Nada neste recorte"}
          description={
            acoes.length === 0
              ? "Trocas de papel, permissões concedidas e links de nova senha aparecem aqui assim que acontecerem."
              : escolhidaAcao
                ? `«${ROTULO_DA_ACAO[escolhidaAcao as Acao] ?? escolhidaAcao}» já aconteceu nesta paróquia, mas não neste período.`
                : "Nada mudou no acesso de ninguém neste período."
          }
          action={
            escolhidoPeriodo !== "tudo" ? (
              <LinkButton
                href={enderecoDoRegistro({ ...filtros, periodo: "tudo" })}
                size="sm"
              >
                Procurar desde o começo
              </LinkButton>
            ) : undefined
          }
        />
      ) : (
        <Card className="px-3.5 py-1.5">
          {registros.map((r) => {
            const detalhe = descrever(r.detalhe);
            return (
              <div key={r.id} className="border-b border-border py-3.5 last:border-b-0">
                <p className="text-[14.5px] font-medium text-foreground">
                  {ROTULO_DA_ACAO[r.acao as Acao] ?? r.acao}
                  {r.alvoNome && <span className="font-normal text-muted"> · {r.alvoNome}</span>}
                </p>
                <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted">
                  {r.atorNome}
                  {detalhe && ` — ${detalhe}`}
                </p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.04em] text-muted">
                  {formatDateTime(r.createdAt)}
                </p>
              </div>
            );
          })}
        </Card>
      )}

      <p className="text-[12.5px] leading-relaxed text-muted">
        O registro guarda ids e códigos, nunca conteúdo. O texto de um pedido de oração ou de um
        aviso não é copiado para cá — o histórico diz que algo foi moderado, não o que estava
        escrito.
      </p>
    </div>
  );
}
