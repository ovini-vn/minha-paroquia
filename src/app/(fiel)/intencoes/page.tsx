import type { Metadata } from "next";
import { Flame } from "lucide-react";
import { requireSessionForPage } from "@/server/auth/guards";
import {
  ORDEM_DE_LEITURA,
  ROTULO_DA_INTENCAO,
  minhasIntencoes,
  missasParaIntencao,
} from "@/server/modules/intencoes/service";
import { pedirIntencaoAction, retirarMeuPedidoAction } from "@/server/actions/intencao-actions";
import { PedirIntencaoForm } from "@/components/domain/PedirIntencaoForm";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader, Eyebrow } from "@/components/ui/Typography";
import { formatDateTime } from "@/lib/date";

export const metadata: Metadata = { title: "Intenção de missa" };

/**
 * Pedir uma intenção de missa pelo app.
 *
 * Sem valor, sem Pix, sem "espórtula": a intenção é um pedido de oração da
 * comunidade, e o app não põe preço nela. A secretaria confere o pedido —
 * é ela quem sabe se aquela missa ainda comporta mais nomes — e só então
 * ele entra no rol lido no ambão.
 */
export default async function IntencoesPage() {
  const session = await requireSessionForPage();
  if (!session.membership) {
    return (
      <EmptyState
        icon={Flame}
        title="Você ainda não pertence a uma comunidade"
        description="Escolha a sua paróquia para pedir uma intenção de missa."
      />
    );
  }
  const parishId = session.membership.parishId;
  const agora = new Date();
  const [missas, minhas] = await Promise.all([
    missasParaIntencao(parishId, agora),
    minhasIntencoes(parishId, session.userId, agora),
  ]);

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Intenção de missa"
        description="Peça que a comunidade reze por alguém na missa. A secretaria confere e põe o nome no rol."
      />

      {minhas.length > 0 && (
        <section className="mb-6">
          <Eyebrow tone="accent" className="mb-2">
            Seus pedidos
          </Eyebrow>
          <Card className="px-3.5 py-1">
            <ul>
              {minhas.map((i) => (
                <li key={i.id} className="flex items-start gap-3 border-b border-border py-3 last:border-b-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-[14.5px] font-medium text-foreground">{i.texto}</p>
                    <p className="mt-0.5 text-[13px] text-muted">
                      {ROTULO_DA_INTENCAO[i.tipo]} · {formatDateTime(i.celebration.startsAt)}
                    </p>
                  </div>
                  {i.estado === "confirmada" ? (
                    <Badge tone="success">No rol</Badge>
                  ) : (
                    <div className="flex flex-col items-end gap-1">
                      <Badge tone="muted">Aguardando</Badge>
                      <form action={retirarMeuPedidoAction}>
                        <input type="hidden" name="intencaoId" value={i.id} />
                        <button type="submit" className="text-[12.5px] text-muted underline hover:text-error">
                          Retirar
                        </button>
                      </form>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}

      <Card className="p-4">
        <PedirIntencaoForm
          acao={pedirIntencaoAction}
          missas={missas.map((m) => ({ id: m.id, rotulo: formatDateTime(m.startsAt) + (m.location ? ` · ${m.location}` : "") }))}
          tipos={ORDEM_DE_LEITURA.map((t) => ({ valor: t, rotulo: ROTULO_DA_INTENCAO[t] }))}
          rotuloDoBotao="Pedir intenção"
        />
      </Card>
      <div className="rule-gold my-7" />
    </div>
  );
}
