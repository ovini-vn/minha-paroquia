import Link from "next/link";
import { Church, BookOpen, HandHeart, Megaphone, CalendarDays } from "lucide-react";
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
import { Avatar } from "@/components/ui/Avatar";
import { RowLink } from "@/components/ui/RowLink";
import { Eyebrow, SectionTitle } from "@/components/ui/Typography";
import { Arch } from "@/components/brand/Arch";
import { BleedTop } from "@/components/layout/Bleed";
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
        icon={Church}
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

  const localizacao = [parish?.city, parish?.state].filter(Boolean).join(" · ");

  return (
    <div className="flex flex-col">
      {/* Capa — a paróquia como lugar, não como cabeçalho de formulário. */}
      <BleedTop>
        <section className="relative overflow-hidden bg-wash px-[18px] pb-6 pt-7 text-white">
          <Arch className="pointer-events-none absolute inset-0 h-full w-full opacity-45" />
          <div className="relative flex items-center gap-3.5">
            {parish?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={parish.logoUrl}
                alt=""
                className="h-14 w-14 shrink-0 rounded-full border border-gold/45 object-cover"
              />
            ) : (
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full border border-gold/45 bg-white/10">
                <Church className="h-6 w-6" strokeWidth={1.5} aria-hidden />
              </span>
            )}
            <div className="min-w-0">
              <p className="font-serif text-2xl font-semibold leading-tight">
                {parish?.name ?? "Sua Comunidade"}
              </p>
              {localizacao && (
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-eyebrow text-gold-soft">
                  {localizacao}
                </p>
              )}
            </div>
          </div>

          {parish?.description && (
            <p className="relative mt-4 border-l-[1.5px] border-gold pl-3.5 font-serif text-[16.5px] italic leading-snug text-white/90">
              {parish.description}
            </p>
          )}
        </section>
      </BleedTop>

      {(parish?.address || parish?.phone) && (
        <p className="pt-4 text-[12.5px] text-muted">
          {[parish?.address, parish?.phone].filter(Boolean).join(" · ")}
        </p>
      )}

      {avisos.length > 0 && (
        <section className="pt-6">
          <SectionTitle eyebrow="Avisos" title="Da secretaria" />
          <Card className="px-3.5 py-1.5">
            {avisos.map((aviso) => (
              <div key={aviso.id} className="flex gap-3.5 border-b border-border py-3.5 last:border-b-0">
                <span className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-md bg-primary-tint text-primary">
                  <Megaphone className="h-[19px] w-[19px]" strokeWidth={1.5} aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-[14.5px] font-medium text-foreground">{aviso.title}</p>
                  <p className="mt-0.5 text-[12.5px] text-muted">{aviso.body}</p>
                </div>
              </div>
            ))}
          </Card>
        </section>
      )}

      <section className="pt-7">
        <SectionTitle
          eyebrow="Palavra do Padre"
          title="Mensagens da comunidade"
          actionLabel={canPublish ? "Publicar" : undefined}
          actionHref={canPublish ? "/comunidade/palavra/nova" : undefined}
        />
        {posts.length === 0 ? (
          <EmptyState
            title="Ainda não há publicações"
            description="Quando o pároco publicar uma mensagem, ela aparece aqui."
          />
        ) : (
          <div className="flex flex-col gap-2.5">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </section>

      <section className="pt-7">
        <SectionTitle eyebrow="Agenda" title="Próximos encontros" />
        {agendaItems.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="Nenhum compromisso agendado"
            description="Missas, celebrações e eventos da paróquia aparecem aqui."
          />
        ) : (
          <Card className="px-3.5 py-1.5">
            {agendaItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3.5 border-b border-border py-3.5 last:border-b-0"
              >
                <span className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-md bg-primary-tint text-primary">
                  <CalendarDays className="h-[19px] w-[19px]" strokeWidth={1.5} aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-[14.5px] font-medium text-foreground">{item.label}</p>
                  <p className="mt-0.5 text-[12.5px] text-muted">
                    {formatDateTime(item.startsAt)}
                    {item.location ? ` · ${item.location}` : ""}
                  </p>
                </div>
              </div>
            ))}
          </Card>
        )}
      </section>

      <section className="pt-7">
        <SectionTitle eyebrow="Sacerdotes" title="Quem caminha com você" />
        {priests.length === 0 ? (
          <EmptyState
            title="Nenhum sacerdote cadastrado"
            description="Os sacerdotes da paróquia aparecem aqui assim que forem vinculados."
          />
        ) : (
          <Card className="px-3.5 py-1.5">
            {priests.map((priest) => (
              <Link
                key={priest.id}
                href={`/comunidade/sacerdotes/${priest.id}`}
                className="flex items-center gap-3.5 border-b border-border py-3 transition-colors last:border-b-0 hover:bg-primary-tint"
              >
                <Avatar name={priest.user.fullName} size="sm" />
                <div className="min-w-0">
                  <p className="text-[14.5px] font-medium text-foreground">{priest.user.fullName}</p>
                  <p className="mt-0.5 text-[12.5px] text-muted">{priest.title}</p>
                </div>
              </Link>
            ))}
          </Card>
        )}
      </section>

      <section className="pt-7">
        <Eyebrow tone="accent" className="mb-3">
          Também na comunidade
        </Eyebrow>
        <Card className="px-3.5 py-1.5">
          <RowLink
            href="/comunidade/catequese"
            icon={BookOpen}
            title="Catequese"
            subtitle="Turmas, encontros e ritos"
          />
          <RowLink
            href="/comunidade/oracao"
            icon={HandHeart}
            title="Pedidos de oração"
            subtitle="Envie ao pároco ou compartilhe no mural"
          />
        </Card>
      </section>

      <div className="rule-gold my-7" />
    </div>
  );
}
