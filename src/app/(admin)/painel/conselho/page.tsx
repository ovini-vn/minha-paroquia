import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ChevronRight, FileSpreadsheet } from "lucide-react";
import { requirePermissionForPage } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import { resumoDoConselho, type NumerosDaPastoral } from "@/server/modules/relatorios/service";
import { Card } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { Eyebrow } from "@/components/ui/Typography";
import { formatDateOnly } from "@/lib/date";

export const metadata: Metadata = { title: "Painel do conselho" };

const pct = (parte: number, todo: number) => (todo === 0 ? "—" : `${Math.round((parte / todo) * 100)}%`);

/**
 * A reunião do conselho pastoral numa tela.
 *
 * Não é um relatório para arquivar — é a pauta: quantos somos, quantos
 * servem, e a lista curta do que precisa de alguém. Pastoral sem
 * coordenação, grupo que parou de se encontrar, gente que se ofereceu e
 * ninguém respondeu. Cada item leva à pastoral, onde se resolve.
 */
export default async function ConselhoPage() {
  const session = await requirePermissionForPage(PERMISSIONS.DASHBOARD_PARISH_VIEW);
  if (!session.membership) return null;
  const r = await resumoDoConselho(session.membership.parishId, new Date());
  const atencao = r.semCoordenacao.length + r.paradas.length + r.comInteressados.length;

  return (
    <div className="flex flex-col gap-6">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Fiéis no app" value={r.fieis} />
        <Stat label="Chegaram nos últimos 30 dias" value={r.chegaram} />
        <Stat label="Servem numa pastoral" value={r.servindo} />
        <Stat label="Da comunidade que serve" value={pct(r.servindo, r.fieis)} />
      </section>

      <section>
        <Eyebrow tone="accent" className="mb-2">
          Pede atenção
        </Eyebrow>
        {atencao === 0 ? (
          <p className="text-[13.5px] text-muted">Toda pastoral tem coordenação, se encontrou nos últimos 60 dias e respondeu a quem se ofereceu.</p>
        ) : (
          <Card className="px-3.5 py-1">
            <ul>
              {r.semCoordenacao.map((p) => (
                <Alerta key={`c-${p.id}`} p={p} texto="Sem coordenação — ninguém marcado como coordenador" />
              ))}
              {r.paradas.map((p) => (
                <Alerta
                  key={`e-${p.id}`}
                  p={p}
                  texto={
                    p.ultimoEncontro
                      ? `Sem encontro desde ${formatDateOnly(p.ultimoEncontro)}`
                      : "Nenhum encontro registrado no app"
                  }
                />
              ))}
              {r.comInteressados.map((p) => (
                <Alerta
                  key={`i-${p.id}`}
                  p={p}
                  texto={`${p.interessesEsperando} ${p.interessesEsperando === 1 ? "pessoa se ofereceu e espera" : "pessoas se ofereceram e esperam"} resposta`}
                />
              ))}
            </ul>
          </Card>
        )}
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between gap-3">
          <Eyebrow tone="accent">Pastorais nos últimos 90 dias</Eyebrow>
          <Link href="/painel/relatorios?r=pastorais" className="inline-flex items-center gap-1 text-[13px] text-primary underline">
            <FileSpreadsheet className="h-4 w-4" strokeWidth={1.5} aria-hidden />
            Relatório
          </Link>
        </div>
        <Card className="overflow-x-auto p-0">
          <table className="w-full border-collapse text-[13.5px] tabular-nums">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="px-3.5 py-2.5 font-medium">Pastoral</th>
                <th className="px-2 py-2.5 text-right font-medium">Participantes</th>
                <th className="px-2 py-2.5 text-right font-medium">Chegaram</th>
                <th className="px-3.5 py-2.5 text-right font-medium">Presença</th>
              </tr>
            </thead>
            <tbody>
              {r.pastorais.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-b-0">
                  <td className="px-3.5 py-2.5">
                    <Link href={`/comunidade/pastorais/${p.id}`} className="font-medium text-foreground hover:text-primary">
                      {p.nome}
                    </Link>
                  </td>
                  <td className="px-2 py-2.5 text-right text-foreground">{p.membros}</td>
                  <td className="px-2 py-2.5 text-right text-foreground">{p.novos > 0 ? `+${p.novos}` : "0"}</td>
                  <td className="px-3.5 py-2.5 text-right text-foreground">{pct(p.presentes, p.marcacoes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <p className="mt-2 text-[12.5px] text-muted">
          A presença conta só os encontros em que a coordenação fez a chamada no app.
        </p>
      </section>
    </div>
  );
}

function Alerta({ p, texto }: { p: NumerosDaPastoral; texto: string }) {
  return (
    <li className="border-b border-border last:border-b-0">
      <Link href={`/comunidade/pastorais/${p.id}`} className="flex items-center gap-3 py-3 hover:text-primary">
        <AlertTriangle className="h-[18px] w-[18px] shrink-0 text-warning" strokeWidth={1.6} aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block text-[14.5px] font-medium text-foreground">{p.nome}</span>
          <span className="mt-0.5 block text-[13px] text-muted">{texto}</span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-border-strong" strokeWidth={1.5} aria-hidden />
      </Link>
    </li>
  );
}
