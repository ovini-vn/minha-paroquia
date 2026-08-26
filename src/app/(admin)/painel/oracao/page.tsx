import { HandHeart, Check, X } from "lucide-react";
import { requirePermissionForPage } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import { listPendingPrayerRequests } from "@/server/modules/prayer-requests/service";
import { moderarPedidoDeOracaoAction } from "@/server/actions/prayer-request-actions";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/Typography";
import { formatDateTime } from "@/lib/date";

/**
 * A fila de pedidos que esperam ir ao mural.
 *
 * O mural é lido pela comunidade inteira e o campo é texto livre — alguém
 * precisa olhar antes. Pedido endereçado ao padre não passa por aqui: ele é
 * privado, e moderar uma mensagem dirigida a ele, por ele mesmo, seria
 * circular.
 */
export default async function ModerarOracaoPage() {
  const session = await requirePermissionForPage(PERMISSIONS.PRAYER_REQUESTS_MODERATE);
  if (!session.membership) return null;

  const pendentes = await listPendingPrayerRequests(session.membership.parishId);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Pedidos de oração"
        description="O que aguarda aprovação para aparecer no mural da comunidade."
      />

      {pendentes.length === 0 ? (
        <EmptyState
          icon={HandHeart}
          title="Nenhum pedido esperando"
          description="Quando alguém pedir oração para a comunidade, o texto aparece aqui antes de ir ao mural."
        />
      ) : (
        <div className="flex flex-col gap-2.5">
          {pendentes.map((pedido) => (
            <Card key={pedido.id}>
              <div className="flex flex-wrap items-center gap-2">
                {/* Quem modera vê o nome mesmo quando o pedido é anônimo: é
                    preciso saber de quem veio para decidir, e para procurar
                    a pessoa se for o caso. O anonimato vale no mural. */}
                <p className="text-[14.5px] font-medium text-foreground">
                  {pedido.requester.fullName}
                </p>
                {pedido.isAnonymous && <Badge tone="muted">Anônimo no mural</Badge>}
                <span className="text-[12px] text-muted">{formatDateTime(pedido.createdAt)}</span>
              </div>

              <p className="mt-2.5 whitespace-pre-line border-l-[1.5px] border-gold pl-3 font-serif text-[16px] leading-relaxed text-foreground">
                {pedido.contentText}
              </p>

              <div className="mt-3.5 flex flex-wrap gap-2 border-t border-border pt-3.5">
                <form action={moderarPedidoDeOracaoAction}>
                  <input type="hidden" name="id" value={pedido.id} />
                  <input type="hidden" name="decisao" value="aprovar" />
                  <Button type="submit" size="sm">
                    <Check className="h-4 w-4" strokeWidth={2} aria-hidden />
                    Publicar no mural
                  </Button>
                </form>
                <form action={moderarPedidoDeOracaoAction}>
                  <input type="hidden" name="id" value={pedido.id} />
                  <input type="hidden" name="decisao" value="recusar" />
                  <Button type="submit" variant="ghost" size="sm">
                    <X className="h-4 w-4" strokeWidth={1.8} aria-hidden />
                    Não publicar
                  </Button>
                </form>
              </div>
            </Card>
          ))}
        </div>
      )}

      <p className="text-[12.5px] leading-relaxed text-muted">
        Pedidos marcados como “só o padre” não passam por aqui — vão direto para o sacerdote, em
        Comunidade › Oração.
      </p>
    </div>
  );
}
