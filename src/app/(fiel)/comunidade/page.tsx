import Link from "next/link";
import { getSessionContext } from "@/server/auth/session";
import { PERMISSIONS } from "@/server/auth/rbac";
import { listPriests } from "@/server/modules/priests/service";
import { listUpcomingCelebrations } from "@/server/modules/celebrations/service";
import { listUpcomingEvents } from "@/server/modules/events/service";
import { listRecentPosts } from "@/server/modules/posts/service";
import { listPublishedAvisos } from "@/server/modules/avisos/service";
import { getParish } from "@/server/modules/parishes/service";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PostCard } from "@/components/domain/PostCard";
import { formatDateTime } from "@/lib/date";
import { CELEBRATION_TYPE_LABELS } from "@/lib/celebration-labels";

type AgendaItem = {
  id: string;
  startsAt: Date;
  label: string;
  location: string | null;
};

export default async function ComunidadePage() {
  const session = await getSessionContext();
  if (!session?.membership) {
    return (
      <EmptyState
        icon="⛪"
        title="Você ainda não pertence a uma comunidade"
        description="Peça ao seu pároco, secretaria ou a alguém da paróquia um link ou QR Code de convite para entrar."
      />
    );
  }

  const parishId = session.membership.parishId;
  const canPublish = session.permissions.includes(PERMISSIONS.POSTS_CREATE);
  const [parish, priests, celebrations, events, posts, avisos] = await Promise.all([
    getParish(parishId),
    listPriests(parishId),
    listUpcomingCelebrations(parishId, 5),
    listUpcomingEvents(parishId, 5),
    listRecentPosts(parishId, 5),
    listPublishedAvisos(parishId, 5),
  ]);

  const agendaItems: AgendaItem[] = [
    ...celebrations.map((c) => ({
      id: `celebration-${c.id}`,
      startsAt: c.startsAt,
      label: c.title || CELEBRATION_TYPE_LABELS[c.type],
      location: c.location,
    })),
    ...events.map((e) => ({
      id: `event-${e.id}`,
      startsAt: e.startsAt,
      label: e.title,
      location: e.location,
    })),
  ].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        {parish?.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={parish.logoUrl} alt="" className="h-14 w-14 rounded-full object-cover" />
        )}
        <div>
          <h1 className="font-serif text-2xl text-foreground">{parish?.name ?? "Sua Comunidade"}</h1>
          {(parish?.address || parish?.phone) && (
            <p className="text-xs text-muted">
              {[parish?.address, parish?.phone].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
      </div>

      {parish?.description && (
        <Card>
          <p className="text-sm text-muted">{parish.description}</p>
        </Card>
      )}

      {avisos.length > 0 && (
        <section>
          <p className="mb-2 text-xs uppercase tracking-wide text-primary">Avisos</p>
          <div className="flex flex-col gap-2">
            {avisos.map((aviso) => (
              <Card key={aviso.id}>
                <p className="text-sm font-medium text-foreground">{aviso.title}</p>
                <p className="mt-1 text-sm text-muted">{aviso.body}</p>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs uppercase tracking-wide text-primary">Palavra do Padre</p>
          {canPublish && (
            <Link href="/comunidade/palavra/nova" className="text-xs font-medium text-primary">
              Publicar
            </Link>
          )}
        </div>
        {posts.length === 0 ? (
          <Card>
            <p className="text-sm text-muted">Ainda não há publicações — em breve, aqui.</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </section>

      <section>
        <p className="mb-2 text-xs uppercase tracking-wide text-primary">Agenda</p>
        {agendaItems.length === 0 ? (
          <Card>
            <p className="text-sm text-muted">Nenhum compromisso agendado ainda.</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {agendaItems.map((item) => (
              <Card key={item.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  <p className="text-xs text-muted">
                    {formatDateTime(item.startsAt)}
                    {item.location ? ` · ${item.location}` : ""}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <p className="mb-2 text-xs uppercase tracking-wide text-primary">Sacerdotes</p>
        {priests.length === 0 ? (
          <Card>
            <p className="text-sm text-muted">Nenhum sacerdote cadastrado ainda.</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {priests.map((priest) => (
              <Link key={priest.id} href={`/comunidade/sacerdotes/${priest.id}`}>
                <Card className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                    {priest.user.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{priest.user.fullName}</p>
                    <p className="text-xs text-muted">{priest.title}</p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      <Link href="/comunidade/catequese">
        <Card className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Catequese</p>
            <p className="text-xs text-muted">Turmas, encontros e ritos</p>
          </div>
          <span aria-hidden>→</span>
        </Card>
      </Link>

      <Link href="/comunidade/oracao">
        <Card className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">🙏 Pedidos de oração</p>
            <p className="text-xs text-muted">Envie ao pároco ou compartilhe no mural da comunidade</p>
          </div>
          <span aria-hidden>→</span>
        </Card>
      </Link>
    </div>
  );
}
