import Link from "next/link";
import { getSessionContext } from "@/server/auth/session";
import { PERMISSIONS } from "@/server/auth/rbac";
import { listPriests } from "@/server/modules/priests/service";
import { listUpcomingCelebrations } from "@/server/modules/celebrations/service";
import { listUpcomingEvents } from "@/server/modules/events/service";
import { listRecentPosts } from "@/server/modules/posts/service";
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
  const [priests, celebrations, events, posts] = await Promise.all([
    listPriests(parishId),
    listUpcomingCelebrations(parishId, 5),
    listUpcomingEvents(parishId, 5),
    listRecentPosts(parishId, 5),
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
      <div>
        <h1 className="font-serif text-2xl text-ink-900">Sua Comunidade</h1>
      </div>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs uppercase tracking-wide text-terracotta-600">Palavra do Padre</p>
          {canPublish && (
            <Link href="/comunidade/palavra/nova" className="text-xs font-medium text-terracotta-700">
              Publicar
            </Link>
          )}
        </div>
        {posts.length === 0 ? (
          <Card>
            <p className="text-sm text-ink-700">Ainda não há publicações — em breve, aqui.</p>
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
        <p className="mb-2 text-xs uppercase tracking-wide text-terracotta-600">Agenda</p>
        {agendaItems.length === 0 ? (
          <Card>
            <p className="text-sm text-ink-700">Nenhum compromisso agendado ainda.</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {agendaItems.map((item) => (
              <Card key={item.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-ink-900">{item.label}</p>
                  <p className="text-xs text-ink-700">
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
        <p className="mb-2 text-xs uppercase tracking-wide text-terracotta-600">Sacerdotes</p>
        {priests.length === 0 ? (
          <Card>
            <p className="text-sm text-ink-700">Nenhum sacerdote cadastrado ainda.</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {priests.map((priest) => (
              <Link key={priest.id} href={`/comunidade/sacerdotes/${priest.id}`}>
                <Card className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-terracotta-100 text-sm font-medium text-terracotta-700">
                    {priest.user.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ink-900">{priest.user.fullName}</p>
                    <p className="text-xs text-ink-700">{priest.title}</p>
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
            <p className="text-sm font-medium text-ink-900">Catequese</p>
            <p className="text-xs text-ink-700">Turmas, encontros e ritos</p>
          </div>
          <span aria-hidden>→</span>
        </Card>
      </Link>
    </div>
  );
}
