import Link from "next/link";
import {
  Church,
  BookOpen,
  HeartHandshake,
  Mic,
  CalendarDays,
  Megaphone,
  Users,
  Footprints,
} from "lucide-react";
import { getSessionContext } from "@/server/auth/session";
import { getNextCelebration } from "@/server/modules/celebrations/service";
import { getLatestPost } from "@/server/modules/posts/service";
import { listPublishedAvisos } from "@/server/modules/avisos/service";
import { getLiturgicalSeason } from "@/lib/liturgical-season";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { RowLink } from "@/components/ui/RowLink";
import { Eyebrow, SectionTitle } from "@/components/ui/Typography";
import { Avatar } from "@/components/ui/Avatar";
import { Arch } from "@/components/brand/Arch";
import { BleedTop } from "@/components/layout/Bleed";
import { FeastList } from "@/components/domain/FeastList";
import { formatDateTime } from "@/lib/date";
import { CELEBRATION_TYPE_LABELS } from "@/lib/celebration-labels";

const POST_PREVIEW_LABEL: Record<string, string> = {
  audio: "Novo áudio disponível — toque para ouvir.",
  video: "Novo vídeo disponível — toque para assistir.",
};

const SHORTCUTS = [
  { href: "/agenda", icon: CalendarDays, label: "Agenda" },
  // Leva à aba Oração, onde ficam o Evangelho em áudio e as leituras.
  { href: "/oracao", icon: BookOpen, label: "Liturgia" },
  { href: "/servir", icon: HeartHandshake, label: "Servir" },
  { href: "/caminhada", icon: Footprints, label: "Caminhada" },
] as const;

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

export default async function HomePage() {
  const session = await getSessionContext();
  const firstName = session?.fullName.split(" ")[0] ?? "";

  if (!session?.membership) {
    return (
      <EmptyState
        icon={Church}
        title="Você ainda não pertence a uma comunidade"
        description="Peça ao seu pároco, secretaria ou a alguém da paróquia um link ou QR Code de convite para entrar."
      />
    );
  }

  const [nextCelebration, latestPost, latestAvisos] = await Promise.all([
    getNextCelebration(session.membership.parishId),
    getLatestPost(session.membership.parishId),
    listPublishedAvisos(session.membership.parishId, 1),
  ]);
  const latestAviso = latestAvisos[0] ?? null;
  const season = getLiturgicalSeason(new Date());

  return (
    <div className="flex flex-col">
      {/* Hero — portal e caminho dourado, a assinatura da marca. */}
      <BleedTop>
        <section className="relative overflow-hidden bg-wash px-[18px] pb-[26px] pt-[30px] text-white">
          <Arch className="pointer-events-none absolute inset-0 h-full w-full opacity-50" />
          <div className="relative">
            <p className="text-[12.5px] tracking-[0.04em] text-white/70">
              {greeting()}, {firstName}
            </p>
            <h1 className="mt-1.5 font-serif text-[32px] font-medium leading-[1.1]">
              {session.membership.parishName}
            </h1>
          </div>
        </section>
      </BleedTop>

      {/* Próxima celebração — sobreposta ao hero, o "cartão de hoje". */}
      <div className="relative z-[2] -mt-[22px] rounded-lg border border-border bg-surface px-[18px] py-4 shadow">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Eyebrow>Próxima celebração</Eyebrow>
            {nextCelebration ? (
              <>
                <p className="mt-1.5 font-serif text-[29px] font-semibold leading-none text-primary">
                  {nextCelebration.title || CELEBRATION_TYPE_LABELS[nextCelebration.type]}
                </p>
                <p className="mt-1 text-[13px] text-muted">
                  {formatDateTime(nextCelebration.startsAt)}
                  {nextCelebration.location ? ` · ${nextCelebration.location}` : ""}
                </p>
              </>
            ) : (
              <p className="mt-1.5 text-[13px] text-muted">Nenhuma celebração agendada ainda.</p>
            )}
          </div>
          <Badge tone="gold">{season.name}</Badge>
        </div>
      </div>

      {/* Atalhos — "a vida da paróquia" a um toque. */}
      <section className="pt-[26px]">
        <Eyebrow tone="accent" className="mb-3">
          A vida da paróquia
        </Eyebrow>
        {/*
          SEM data-season próprio: a cor vem do tema que a pessoa escolheu
          em /eu/aparencia, herdada do layout. Quem está no tema padrão vê
          violeta; quem escolheu "cor do Tempo Litúrgico" vê o verde do
          Tempo Comum, o roxo da Quaresma, e assim por diante.

          Forçar a cor litúrgica aqui — como estava — passava por cima de
          uma preferência explícita do usuário.
        */}
        <div className="grid grid-cols-4 gap-2.5">
          {SHORTCUTS.map((shortcut) => {
            const Icon = shortcut.icon;
            return (
              <Link
                key={shortcut.href}
                href={shortcut.href}
                className="flex flex-col items-center gap-2 rounded-xl px-1 pb-3 pt-3 text-center transition-transform hover:-translate-y-px"
              >
                <span className="grid h-[74px] w-[74px] place-items-center rounded-[22px] bg-primary text-white shadow-sm transition-colors">
                  <Icon className="h-8 w-8" strokeWidth={1.5} aria-hidden />
                </span>
                <span className="text-[12.5px] font-medium leading-tight text-foreground">
                  {shortcut.label}
                </span>
              </Link>
            );
          })}
        </div>

      </section>

      {/*
       * Daqui para baixo, duas colunas no desktop: a leitura (Palavra do
       * Padre + Hoje) à esquerda e a chamada de serviço à direita. No
       * celular vira uma coluna só, na mesma ordem de antes.
       */}
      <div className="lg:grid lg:grid-cols-[1.7fr_1fr] lg:items-start lg:gap-8">
      <div className="flex flex-col">
      {/* Palavra do Padre — tratamento editorial, não "mais um card". */}
      {latestPost && (
        <section className="pt-[30px]">
          <SectionTitle
            eyebrow="Palavra do Padre"
            title="Uma mensagem para esta semana"
            actionLabel="Ver todas"
            actionHref="/comunidade"
          />
          <article className="relative overflow-hidden rounded-lg border border-border bg-surface p-5 before:absolute before:inset-x-5 before:top-0 before:h-px before:bg-gradient-to-r before:from-gold before:to-transparent">
            <div className="flex items-center gap-3">
              <Avatar name={latestPost.priestProfile.user.fullName} size="sm" />
              <div>
                <p className="text-[13px] font-medium text-foreground">
                  {latestPost.priestProfile.user.fullName}
                </p>
                <p className="text-xs text-muted">{formatDateTime(latestPost.publishedAt)}</p>
              </div>
            </div>
            <p className="mt-3 font-serif text-[18px] leading-[1.62] text-foreground">
              {latestPost.mediaType === "texto"
                ? latestPost.contentText
                : POST_PREVIEW_LABEL[latestPost.mediaType]}
            </p>
            <LinkButton href="/comunidade" variant="gold" size="sm" className="mt-3.5">
              <Mic className="h-4 w-4" strokeWidth={1.5} aria-hidden />
              Ler mensagem
            </LinkButton>
          </article>
        </section>
      )}

      {/* Hoje — o princípio "quero dar uma olhadinha". */}
      <section className="pt-[30px]">
        <SectionTitle eyebrow="Hoje" title="O que tem na comunidade" />
        <Card className="px-3.5 py-1.5">
          {latestAviso && (
            <RowLink
              href="/inicio"
              icon={Megaphone}
              title={latestAviso.title}
              subtitle={latestAviso.body}
            />
          )}
          <RowLink
            href="/agenda"
            icon={CalendarDays}
            title="Agenda da comunidade"
            subtitle="Missas, eventos e seus atendimentos"
          />
          <RowLink
            href="/comunidade"
            icon={Users}
            title="Sacerdotes e pastorais"
            subtitle="Conheça quem caminha com você"
          />
        </Card>
      </section>
      </div>

      {/* Coluna da direita no desktop. */}
      <div className="flex flex-col lg:sticky lg:top-24">
      {/* Calendário da Igreja — o que vem por aí. */}
      <section className="pt-[30px]">
        <SectionTitle eyebrow="Calendário da Igreja" title="Próximas celebrações" />
        <FeastList from={new Date()} limit={4} />
      </section>

      {/* Serviço — a fé que vira ação. */}
      <section className="pt-[30px]">
        <div className="rounded-lg border border-gold/45 bg-gradient-to-b from-gold/[0.07] to-transparent p-[18px]">
          <Eyebrow className="text-[#8a6b24] dark:text-gold">Serviço</Eyebrow>
          <h3 className="mb-2 mt-2 font-serif text-2xl font-semibold leading-tight text-foreground">
            Cada pessoa tem um dom.
          </h3>
          <p className="max-w-[34ch] text-[13.5px] text-muted">
            Diga como você gostaria de servir e a paróquia procura você quando houver uma
            necessidade.
          </p>
          <LinkButton href="/servir" className="mt-4 flex w-full">
            <HeartHandshake className="h-[17px] w-[17px]" strokeWidth={1.5} aria-hidden />
            Eu posso ajudar
          </LinkButton>
        </div>
      </section>
      </div>
      </div>

      <div className="rule-gold my-7 lg:hidden" />
    </div>
  );
}
