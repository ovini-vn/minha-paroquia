import { getSessionContext } from "@/server/auth/session";
import { PERMISSIONS } from "@/server/auth/rbac";
import {
  listMyPrayerRequests,
  listCommunityPrayerRequests,
  listPrivatePrayerRequests,
} from "@/server/modules/prayer-requests/service";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateTime } from "@/lib/date";
import { PrayerRequestForm } from "./PrayerRequestForm";

export default async function PrayerRequestsPage() {
  const session = await getSessionContext();
  if (!session?.membership) {
    return (
      <EmptyState
        icon="🙏"
        title="Você ainda não pertence a uma comunidade"
        description="Peça ao seu pároco, secretaria ou a alguém da paróquia um link ou QR Code de convite para entrar."
      />
    );
  }

  const canViewPrivate = session.permissions.includes(PERMISSIONS.PRAYER_REQUESTS_VIEW_PRIVATE);
  const [myRequests, communityRequests, privateRequests] = await Promise.all([
    listMyPrayerRequests(session.membership.parishId, session.userId),
    listCommunityPrayerRequests(session.membership.parishId),
    canViewPrivate ? listPrivatePrayerRequests(session.membership.parishId) : Promise.resolve([]),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-xl text-ink-900">Pedidos de oração</h1>
        <p className="mt-1 text-sm text-ink-700">
          Envie ao pároco/sacerdote, ou compartilhe no mural para a comunidade rezar com você.
        </p>
      </div>

      <Card>
        <PrayerRequestForm />
      </Card>

      {canViewPrivate && (
        <section>
          <p className="mb-2 text-xs uppercase tracking-wide text-terracotta-600">Pedidos privados</p>
          {privateRequests.length === 0 ? (
            <Card>
              <p className="text-sm text-ink-700">Nenhum pedido privado ainda.</p>
            </Card>
          ) : (
            <div className="flex flex-col gap-2">
              {privateRequests.map((request) => (
                <Card key={request.id}>
                  <p className="text-sm text-ink-900">{request.contentText}</p>
                  <p className="mt-1 text-xs text-ink-700">
                    {request.requesterName ?? "Anônimo"} · {formatDateTime(request.createdAt)}
                  </p>
                </Card>
              ))}
            </div>
          )}
        </section>
      )}

      <section>
        <p className="mb-2 text-xs uppercase tracking-wide text-terracotta-600">Mural da comunidade</p>
        {communityRequests.length === 0 ? (
          <Card>
            <p className="text-sm text-ink-700">Nenhum pedido compartilhado ainda.</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {communityRequests.map((request) => (
              <Card key={request.id}>
                <p className="text-sm text-ink-900">{request.contentText}</p>
                <p className="mt-1 text-xs text-ink-700">
                  {request.requesterName ?? "Anônimo"} · {formatDateTime(request.createdAt)}
                </p>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <p className="mb-2 text-xs uppercase tracking-wide text-terracotta-600">Meus pedidos</p>
        {myRequests.length === 0 ? (
          <Card>
            <p className="text-sm text-ink-700">Você ainda não enviou nenhum pedido.</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {myRequests.map((request) => (
              <Card key={request.id}>
                <p className="text-sm text-ink-900">{request.contentText}</p>
                <p className="mt-1 text-xs text-ink-700">{formatDateTime(request.createdAt)}</p>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
