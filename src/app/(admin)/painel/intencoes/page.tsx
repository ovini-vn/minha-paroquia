import type { Metadata } from "next";
import Link from "next/link";
import { Check, ChevronRight, Flame } from "lucide-react";
import { requirePermissionForPage } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import {
  ORDEM_DE_LEITURA,
  ROTULO_DA_INTENCAO,
  intencoesDoPainel,
  missasParaIntencao,
} from "@/server/modules/intencoes/service";
import {
  apagarIntencaoAction,
  confirmarIntencaoAction,
  registrarNoBalcaoAction,
} from "@/server/actions/intencao-actions";
import { PedirIntencaoForm } from "@/components/domain/PedirIntencaoForm";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Eyebrow } from "@/components/ui/Typography";
import { formatDateTime } from "@/lib/date";

export const metadata: Metadata = { title: "Intenções de missa" };

/**
 * O balcão das intenções.
 *
 * Três coisas, na ordem em que a secretaria as faz: conferir o que chegou
 * pelo app, registrar quem pediu pessoalmente, e imprimir o rol de cada
 * missa para o leitor. Sem valor em nenhuma delas — intenção de missa não
 * tem preço.
 */
export default async function IntencoesDoPainelPage() {
  const session = await requirePermissionForPage(PERMISSIONS.AGENDA_MANAGE);
  if (!session.membership) return null;
  const parishId = session.membership.parishId;
  const agora = new Date();
  const [{ pedidas, missas }, paraRegistrar] = await Promise.all([
    intencoesDoPainel(parishId, agora),
    missasParaIntencao(parishId, agora),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <section>
        <Eyebrow tone="accent" className="mb-2">
          Pedidos do app a conferir
        </Eyebrow>
        {pedidas.length === 0 ? (
          <p className="text-[13.5px] text-muted">Nenhum pedido esperando. O que chega pelo app aparece aqui.</p>
        ) : (
          <Card className="px-3.5 py-1">
            <ul>
              {pedidas.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center gap-3 border-b border-border py-3 last:border-b-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-[14.5px] font-medium text-foreground">{i.texto}</p>
                    <p className="mt-0.5 text-[13px] text-muted">
                      {ROTULO_DA_INTENCAO[i.tipo]} · {formatDateTime(i.celebration.startsAt)}
                      {i.pedidoPor?.fullName ? ` · pedido por ${i.pedidoPor.fullName}` : ""}
                    </p>
                  </div>
                  <form action={confirmarIntencaoAction}>
                    <input type="hidden" name="intencaoId" value={i.id} />
                    <Button type="submit" size="sm">
                      <Check className="h-4 w-4" strokeWidth={2} aria-hidden />
                      Pôr no rol
                    </Button>
                  </form>
                  <form action={apagarIntencaoAction}>
                    <input type="hidden" name="intencaoId" value={i.id} />
                    <button type="submit" className="text-[12.5px] text-muted underline hover:text-error">
                      Não cabe
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>

      <section>
        <Eyebrow tone="accent" className="mb-2">
          Registrar no balcão
        </Eyebrow>
        <Card className="p-4">
          <PedirIntencaoForm
            acao={registrarNoBalcaoAction}
            balcao
            missas={paraRegistrar.map((m) => ({
              id: m.id,
              rotulo: formatDateTime(m.startsAt) + (m.location ? ` · ${m.location}` : ""),
            }))}
            tipos={ORDEM_DE_LEITURA.map((t) => ({ valor: t, rotulo: ROTULO_DA_INTENCAO[t] }))}
            rotuloDoBotao="Registrar"
          />
        </Card>
      </section>

      <section>
        <Eyebrow tone="accent" className="mb-2">
          Rol das próximas missas
        </Eyebrow>
        {missas.length === 0 ? (
          <EmptyState
            icon={Flame}
            title="Nenhuma missa nos próximos 14 dias"
            description="Cadastre os horários em Horários das missas e elas aparecem aqui."
          />
        ) : (
          <Card className="px-3.5 py-1">
            <ul>
              {missas.map((m) => (
                <li key={m.id} className="border-b border-border last:border-b-0">
                  <Link href={`/painel/intencoes/rol/${m.id}`} className="flex items-center gap-3 py-3 hover:text-primary">
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14.5px] font-medium text-foreground">{formatDateTime(m.startsAt)}</span>
                      <span className="mt-0.5 block text-[13px] text-muted">
                        {m._count.intencoes === 0
                          ? "Nenhuma intenção"
                          : `${m._count.intencoes} ${m._count.intencoes === 1 ? "intenção" : "intenções"} no rol`}
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-border-strong" strokeWidth={1.5} aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>
    </div>
  );
}
