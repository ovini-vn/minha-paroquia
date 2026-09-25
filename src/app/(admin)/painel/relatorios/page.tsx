import type { Metadata } from "next";
import Link from "next/link";
import { Download } from "lucide-react";
import { podeAlcancar, requirePermissionForPage } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import { RELATORIOS, montarRelatorio, type Relatorio } from "@/server/modules/relatorios/service";
import { BotaoImprimir } from "@/components/domain/BotaoImprimir";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Relatórios" };

/**
 * Os relatórios da secretaria: um de cada vez, na tela, no papel (A4) e na
 * planilha. O ano escolhe o período dos que são anuais; a participação por
 * pastoral olha sempre os últimos 90 dias, que é o que o conselho pergunta.
 */
export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<{ r?: string; ano?: string }>;
}) {
  const session = await requirePermissionForPage(PERMISSIONS.DASHBOARD_PARISH_VIEW);
  if (!session.membership) return null;

  const { r, ano: anoTexto } = await searchParams;
  const veValores = podeAlcancar(session, PERMISSIONS.FINANCEIRO_VER);
  const disponiveis = (Object.keys(RELATORIOS) as Relatorio[]).filter((k) => k !== "contribuicoes" || veValores);
  const qual: Relatorio = r && disponiveis.includes(r as Relatorio) ? (r as Relatorio) : "pastorais";
  const anoAtual = new Date().getFullYear();
  const anoPedido = Number(anoTexto);
  const ano = Number.isInteger(anoPedido) && anoPedido >= anoAtual - 5 && anoPedido <= anoAtual ? anoPedido : anoAtual;
  const anual = qual !== "pastorais";

  const tabela = await montarRelatorio(session.membership.parishId, qual, ano);
  const endereco = (k: Relatorio, a = ano) => `/painel/relatorios?r=${k}${k !== "pastorais" ? `&ano=${a}` : ""}`;

  return (
    <div className="flex flex-col gap-5">
      <div className="nao-imprime flex flex-col gap-3">
        <nav aria-label="Relatórios" className="flex flex-wrap gap-2">
          {disponiveis.map((k) => (
            <Link
              key={k}
              href={endereco(k)}
              aria-current={k === qual ? "page" : undefined}
              className={cn(
                "rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors",
                k === qual
                  ? "border-primary bg-primary-tint text-primary"
                  : "border-border-strong text-muted hover:text-foreground",
              )}
            >
              {RELATORIOS[k]}
            </Link>
          ))}
        </nav>
        <div className="flex flex-wrap items-center gap-2">
          {anual && (
            <div className="flex flex-wrap gap-1.5" aria-label="Ano">
              {[anoAtual, anoAtual - 1, anoAtual - 2].map((a) => (
                <Link
                  key={a}
                  href={endereco(qual, a)}
                  aria-current={a === ano ? "true" : undefined}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-[13px] tabular-nums",
                    a === ano ? "bg-sunken font-semibold text-foreground" : "text-muted hover:text-foreground",
                  )}
                >
                  {a}
                </Link>
              ))}
            </div>
          )}
          <span className="flex-1" />
          <a
            href={`/painel/relatorios/planilha/${qual}?ano=${ano}`}
            className="inline-flex items-center gap-1.5 rounded-md border border-border-strong px-3 py-2 text-[13px] font-medium text-foreground hover:border-primary"
          >
            <Download className="h-4 w-4" strokeWidth={1.5} aria-hidden />
            Baixar planilha
          </a>
          <BotaoImprimir />
        </div>
      </div>

      <article className="folha">
        <header className="mb-4">
          <p className="text-[12.5px] uppercase tracking-[0.08em] text-muted">{session.membership.parishName}</p>
          <h1 className="mt-1 font-serif text-[22px] font-semibold text-foreground">{tabela.titulo}</h1>
          <p className="mt-1 text-[13px] text-muted">{tabela.descricao}</p>
        </header>
        {tabela.linhas.length === 0 ? (
          <p className="text-[14px] text-muted">Nada registrado neste período ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13.5px] tabular-nums">
              <thead>
                <tr className="border-b border-border-strong text-left">
                  {tabela.colunas.map((c, i) => (
                    <th key={c} className={cn("px-2 py-2 font-semibold text-foreground", i > 0 && "text-right")}>
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tabela.linhas.map((l, n) => (
                  <tr key={n} className="border-b border-border">
                    {l.map((v, i) => (
                      <td key={i} className={cn("px-2 py-2 text-foreground", i > 0 && "text-right")}>
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              {tabela.total && (
                <tfoot>
                  <tr className="border-t-2 border-border-strong">
                    {tabela.total.map((v, i) => (
                      <td key={i} className={cn("px-2 py-2 font-semibold text-foreground", i > 0 && "text-right")}>
                        {v}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
        <p className="mt-4 text-[12px] text-muted">
          Gerado em {new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}.
        </p>
      </article>
    </div>
  );
}
