import { getSessionContext } from "@/server/auth/session";
import { PERMISSIONS } from "@/server/auth/rbac";
import {
  listMyPrayerRequests,
  listCommunityPrayerRequests,
  listPrivatePrayerRequests,
} from "@/server/modules/prayer-requests/service";
import { HandHeart, Lock } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader, SectionTitle } from "@/components/ui/Typography";
import { formatDateTime } from "@/lib/date";
import { PrayerRequestForm } from "./PrayerRequestForm";
import { Badge } from "@/components/ui/Badge";

export default async function PrayerRequestsPage() {
  const session = await getSessionContext();
  if (!session?.membership) {
    return (
      <EmptyState
        icon={HandHeart}
        title="Você ainda não pertence a uma comunidade"
        description="Peça ao seu pároco, secretaria ou a alguém da paróquia um link ou QR Code de convite para entrar."
      />
    );
  }

  const canViewPrivate = session.permissions.includes(PERMISSIONS.PRAYER_REQUESTS_VIEW_PRIVATE);
  const [myRequests, communityRequests, privateRequests] = await Promise.all([
    listMyPrayerRequests(session.membership.parishId, session.userId),
    // O mural é aberto a todo membro. O que protege o nome de quem pede
    // não é uma trava de entrada, é a moderação: nada aparece aqui sem um
    // moderador ter aprovado, e o pedido anônimo esconde o nome dele.
    listCommunityPrayerRequests(session.membership.parishId),
    canViewPrivate ? listPrivatePrayerRequests(session.membership.parishId) : Promise.resolve([]),
  ]);

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Pedidos de oração"
        description="Envie ao pároco, ou compartilhe no mural para a comunidade rezar com você."
      />

      <Card>
        <PrayerRequestForm />
      </Card>

      {canViewPrivate && (
        <section className="pt-7">
          <SectionTitle eyebrow="Reservado ao sacerdote" title="Pedidos privados" />
          {privateRequests.length === 0 ? (
            <EmptyState
              icon={Lock}
              title="Nenhum pedido privado"
              description="Pedidos enviados diretamente ao sacerdote aparecem aqui, e só para ele."
            />
          ) : (
            <div className="flex flex-col gap-2.5">
              {privateRequests.map((request) => (
                <Card key={request.id}>
                  <p className="font-serif text-[17px] leading-relaxed text-foreground">
                    {request.contentText}
                  </p>
                  <p className="mt-2 text-xs text-muted">
                    {request.requesterName ?? "Anônimo"} · {formatDateTime(request.createdAt)}
                  </p>
                </Card>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="pt-7">
        <SectionTitle eyebrow="Mural" title="Rezar uns pelos outros" />
        {communityRequests.length === 0 ? (
          <EmptyState
            icon={HandHeart}
            title="Nenhum pedido no mural"
            description="Quando alguém compartilhar um pedido com a comunidade, ele aparece aqui."
          />
        ) : (
          <div className="flex flex-col gap-2.5">
            {communityRequests.map((request) => (
              <Card key={request.id}>
                <p className="font-serif text-[17px] leading-relaxed text-foreground">
                  {request.contentText}
                </p>
                <p className="mt-2 text-xs text-muted">
                  {request.requesterName ?? "Anônimo"} · {formatDateTime(request.createdAt)}
                </p>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="pt-7">
        <SectionTitle eyebrow="Seus" title="Meus pedidos" />
        {myRequests.length === 0 ? (
          <EmptyState
            icon={HandHeart}
            title="Você ainda não enviou nenhum pedido"
            description="Use o formulário acima para pedir oração."
          />
        ) : (
          <div className="flex flex-col gap-2.5">
            {myRequests.map((request) => (
              <Card key={request.id}>
                <p className="font-serif text-[17px] leading-relaxed text-foreground">
                  {request.contentText}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <p className="text-xs text-muted">{formatDateTime(request.createdAt)}</p>
                  {/* Sem isto, quem pediu olharia o mural, não se encontraria
                      lá e concluiria que o pedido se perdeu. */}
                  {request.visibility === "comunidade" && request.status === "pendente" && (
                    <Badge tone="warning">Aguardando a paróquia publicar</Badge>
                  )}
                  {request.visibility === "comunidade" && request.status === "recusado" && (
                    <Badge tone="muted">Não publicado no mural</Badge>
                  )}
                  {request.visibility === "padre" && <Badge tone="muted">Só o sacerdote vê</Badge>}
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <div className="rule-gold my-7" />
    </div>
  );
}
