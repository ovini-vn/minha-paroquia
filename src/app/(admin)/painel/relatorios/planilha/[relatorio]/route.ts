import { NextResponse, type NextRequest } from "next/server";
import { getSessionContext } from "@/server/auth/session";
import { podeAlcancar } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import { RELATORIOS, montarRelatorio, paraCsv, type Relatorio } from "@/server/modules/relatorios/service";

/**
 * A planilha de um relatório, para abrir no Excel ou no Google Planilhas.
 *
 * A mesma tabela da tela — ver `montarRelatorio`. As contribuições pedem a
 * permissão de ver valores; os outros, a de ver o painel.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ relatorio: string }> }) {
  const session = await getSessionContext();
  if (!session?.membership) return new NextResponse("Entre na sua conta.", { status: 401 });

  const { relatorio } = await params;
  if (!(relatorio in RELATORIOS)) return new NextResponse("Relatório desconhecido.", { status: 404 });
  const qual = relatorio as Relatorio;
  const permissao = qual === "contribuicoes" ? PERMISSIONS.FINANCEIRO_VER : PERMISSIONS.DASHBOARD_PARISH_VIEW;
  if (!podeAlcancar(session, permissao)) return new NextResponse("Sem acesso a este relatório.", { status: 403 });

  const anoPedido = Number(req.nextUrl.searchParams.get("ano"));
  const ano = Number.isInteger(anoPedido) && anoPedido > 2000 && anoPedido < 2100 ? anoPedido : new Date().getFullYear();

  const tabela = await montarRelatorio(session.membership.parishId, qual, ano);
  return new NextResponse(paraCsv(tabela), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${qual}-${ano}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
