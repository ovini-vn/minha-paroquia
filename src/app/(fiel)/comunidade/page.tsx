import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, CalendarDays, Church, Megaphone, Users } from "lucide-react";
import { getSessionContext } from "@/server/auth/session";
import { PERMISSIONS } from "@/server/auth/rbac";
import { listPriests, getParoco } from "@/server/modules/priests/service";
import { resolverParoco, assinaturaDoPost } from "@/server/modules/parishes/paroco";
import { listUpcomingCelebrations } from "@/server/modules/celebrations/service";
import { listUpcomingEvents } from "@/server/modules/events/service";
import { listRecentPosts } from "@/server/modules/posts/service";
import { listPublishedAvisos } from "@/server/modules/avisos/service";
import { getParish } from "@/server/modules/parishes/service";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Avatar } from "@/components/ui/Avatar";
import { RowLink } from "@/components/ui/RowLink";
import { CartoesDeApresentacao } from "@/components/domain/CartoesDeApresentacao";
import { Eyebrow, SectionTitle } from "@/components/ui/Typography";
import { Arch } from "@/components/brand/Arch";
import { BleedTop } from "@/components/layout/Bleed";
import { PostCard } from "@/components/domain/PostCard";
import { CELEBRATION_TYPE_LABELS } from "@/lib/celebration-labels";
import { DuasColunas } from "@/components/layout/DuasColunas";
import { ProximosEncontros, type Encontro } from "@/components/domain/ProximosEncontros";
import { AcoesRapidas } from "@/components/domain/AcoesRapidas";
import { CreateAvisoForm } from "@/app/(admin)/painel/avisos/CreateAvisoForm";
import { CreateEventForm } from "@/app/(admin)/painel/CreateEventForm";
import { isUploadConfigured, diagnosticoDoUpload } from "@/server/modules/uploads/service";
import { LidoAoAbrir } from "@/components/domain/LidoAoAbrir";

export const metadata: Metadata = { title: "Minha Comunidade" };

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
  const [parish, parocoRegistrado, priests, celebrations, events, posts, avisos] = await Promise.all([
    getParish(parishId),
    getParoco(parishId),
    listPriests(parishId),
    listUpcomingCelebrations(parishId, 5),
    listUpcomingEvents(parishId, 5),
    listRecentPosts(parishId, 5),
    listPublishedAvisos(parishId, 5),
  ]);

  const paroco = parish ? resolverParoco(parish, parocoRegistrado) : null;

  const agendaItems: Encontro[] = [
    ...celebrations.map((c) => ({
      id: `celebration-${c.id}`,
      startsAt: c.startsAt,
      label: c.title || CELEBRATION_TYPE_LABELS[c.type],
      location: c.location,
      imageUrl: null,
      description: null,
      semHora: c.semHora,
    })),
    ...events.map((e) => ({
      id: `event-${e.id}`,
      startsAt: e.startsAt,
      label: e.title,
      location: e.location,
      imageUrl: e.imageUrl,
      description: e.description,
      semHora: e.semHora,
    })),
  ].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

  const localizacao = [parish?.city, parish?.state].filter(Boolean).join(" · ");

  // Publicar de onde se está lendo. Cada ação é adicionada só se a pessoa
  // tem a permissão dela — a lista vazia faz a barra sumir por inteiro.
  const pode = (code: string) =>
    session.isPlatformAdmin || session.permissions.includes(code as never);
  const acoes = [
    ...(pode(PERMISSIONS.AVISOS_MANAGE)
      ? [
          {
            id: "aviso",
            label: "Publicar aviso",
            icone: <Megaphone className="h-4 w-4" strokeWidth={1.5} aria-hidden />,
            conteudo: <CreateAvisoForm />,
          },
        ]
      : []),
    ...(pode(PERMISSIONS.AGENDA_MANAGE)
      ? [
          {
            id: "evento",
            label: "Novo evento",
            icone: <CalendarDays className="h-4 w-4" strokeWidth={1.5} aria-hidden />,
            conteudo: <CreateEventForm
              podeEnviarArquivo={isUploadConfigured()}
              motivoIndisponivel={diagnosticoDoUpload()}
            />,
          },
        ]
      : []),
  ];

  return (
    <div className="flex flex-col">
      <LidoAoAbrir caminho="/comunidade" />
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

      <CartoesDeApresentacao
        fotoIgreja={parish?.historiaFotoUrl ?? null}
        fotoParoco={paroco?.fotoUrl ?? null}
        nomeParoco={paroco?.nome ?? null}
      />

      {acoes.length > 0 && (
        <div className="pt-5">
          <AcoesRapidas acoes={acoes} />
        </div>
      )}

      {(parish?.address || parish?.phone) && (
        <p className="pt-4 text-[12.5px] text-muted">
          {[parish?.address, parish?.phone].filter(Boolean).join(" · ")}
        </p>
      )}

      {/*
        Duas colunas no computador.

        Principal: o que a pessoa veio ler — os avisos da secretaria e a
        palavra do padre. Lateral: o que ela consulta de relance — a agenda,
        quem são os sacerdotes e os atalhos.

        No celular volta a ser uma pilha, na ordem em que está escrito.
      */}
      <DuasColunas
        principal={
          <>
      {avisos.length > 0 && (
        <section className="pt-6">
          <SectionTitle
            eyebrow="Avisos"
            title="Da secretaria"
            actionLabel="Ver todos"
            actionHref="/avisos"
          />
          <Card className="px-3.5 py-1.5">
            {avisos.map((aviso) => (
              <div key={aviso.id} className="flex gap-3.5 border-b border-border py-3.5 last:border-b-0">
                <span className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-md bg-primary-tint text-primary">
                  <Megaphone className="h-[19px] w-[19px]" strokeWidth={1.5} aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-[14.5px] font-medium text-foreground">{aviso.title}</p>
                  {/* Duas linhas e para: aqui é vitrine. O texto inteiro
                      está em /avisos, no "Ver todos" acima. */}
                  <p className="mt-0.5 line-clamp-2 text-[12.5px] text-muted">{aviso.body}</p>
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
              <PostCard
                key={post.id}
                post={post}
                assinatura={assinaturaDoPost(post.priestProfile, paroco)}
              />
            ))}
          </div>
        )}
      </section>

          </>
        }
        lateral={
          <>
      <section className="pt-7">
        <SectionTitle eyebrow="Agenda" title="Próximos encontros" />
        <ProximosEncontros encontros={agendaItems} />
      </section>

      <section className="pt-7">
        <SectionTitle
          eyebrow="Sacerdotes"
          title="Quem caminha com você"
          actionLabel="Agendar"
          actionHref="/comunidade/sacerdotes"
        />
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
            href="/comunidade/pastorais"
            icon={Users}
            title="Grupos e pastorais"
            subtitle="Onde a comunidade se organiza para servir"
          />
          <RowLink
            href="/catequese"
            icon={BookOpen}
            title="Catequese"
            subtitle="Turmas, encontros e ritos"
          />
          <RowLink
            href="/agenda"
            icon={CalendarDays}
            title="Agenda completa"
            subtitle="Missas, eventos e meus atendimentos"
          />
        </Card>
      </section>
          </>
        }
      />

      <div className="rule-gold my-7" />
    </div>
  );
}
