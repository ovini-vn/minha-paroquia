import type { Metadata } from "next";
import Link from "next/link";
import {
  HandHeart,
  Footprints,
  ScrollText,
  Sparkles,
  Mic,
  BookOpen,
  MessagesSquare,
  ChevronRight,
} from "lucide-react";
import { getSessionContext } from "@/server/auth/session";
import { listCommunityPrayerRequests } from "@/server/modules/prayer-requests/service";
import { getTodayContext } from "@/server/modules/liturgia/daily-service";
import { getParish } from "@/server/modules/parishes/service";
import { getParoco } from "@/server/modules/priests/service";
import { getLatestPost } from "@/server/modules/posts/service";
import { resolverParoco, assinaturaDoPost } from "@/server/modules/parishes/paroco";
import { getPalavraDoDia } from "@/server/modules/liturgia/vatican-news-service";
import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { Retrato } from "@/components/ui/Retrato";
import { VideoDoPost } from "@/components/domain/VideoDoPost";
import { POST_PREVIEW_LABEL } from "@/lib/post-labels";
import { EmptyState } from "@/components/ui/EmptyState";
import { RowLink } from "@/components/ui/RowLink";
import { Eyebrow, SectionTitle } from "@/components/ui/Typography";
import { PalavraDoDiaCard } from "@/components/domain/PalavraDoDiaCard";
import { Arch } from "@/components/brand/Arch";
import { BleedTop } from "@/components/layout/Bleed";
import { formatDateTime } from "@/lib/date";
import { DuasColunas } from "@/components/layout/DuasColunas";

export const metadata: Metadata = { title: "Palavra" };

export default async function OracaoPage() {
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

  const today = new Date();
  const context = getTodayContext(today);
  const [parish, parocoRegistrado, latestPost, communityRequests, palavraDoDia] =
    await Promise.all([
      getParish(session.membership.parishId),
      getParoco(session.membership.parishId),
      getLatestPost(session.membership.parishId),
      // O mural é aberto a todo membro. O que protege o nome de quem pede
      // não é uma trava de entrada, é a moderação: nada aparece aqui sem um
      // moderador ter aprovado, e o pedido anônimo esconde o nome dele.
      listCommunityPrayerRequests(session.membership.parishId, 3),
      getPalavraDoDia(),
    ]);

  const paroco = parish ? resolverParoco(parish, parocoRegistrado) : null;
  const assinatura = latestPost ? assinaturaDoPost(latestPost.priestProfile, paroco) : null;

  return (
    <div className="flex flex-col">
      {/* O hoje litúrgico — data e tempo, calculados pelo próprio app. */}
      <BleedTop>
        <section className="relative overflow-hidden bg-wash px-[18px] pb-6 pt-7 text-white">
          <Arch className="pointer-events-none absolute inset-0 h-full w-full opacity-45" />
          <div className="relative">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-eyebrow text-gold-soft">
              <Sparkles className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
              {context.seasonName}
            </p>
            <h1 className="mt-2 font-serif text-[30px] font-medium leading-[1.1]">
              {context.weekdayLabel}
            </h1>
            <p className="mt-1 text-[13px] text-white/70">{context.dateLabel}</p>
          </div>
        </section>
      </BleedTop>

      {/* A BÍBLIA vem primeiro, logo abaixo do dia litúrgico.
          Antes havia aqui um "Evangelho de hoje" que a paróquia tinha de
          digitar todo dia — e que ficava dizendo "sua paróquia ainda não
          publicou". Era a mesma coisa que a Palavra do Padre, com o
          agravante de exigir trabalho diário para não parecer abandonado.

          O contraste é o dos atalhos do Início: fundo cheio, ícone branco.
          Fica só nesta tela — se tudo se destaca, nada se destaca.

          NÃO sobrepor à faixa litúrgica. O card que ficava aqui antes era
          branco, e branco sobre o verde da faixa contrasta; este é verde,
          e sobreposto ele desaparece dentro dela. Precisa do fundo claro
          da página embaixo para ter o mesmo efeito do Início. */}
      <Link
        href="/biblia"
        className="mt-5 flex items-center gap-3.5 rounded-lg bg-primary px-4 py-4 text-white shadow transition-transform dark:bg-primary-light hover:-translate-y-px"
      >
        <span className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-[14px] bg-white/15">
          <BookOpen className="h-[26px] w-[26px]" strokeWidth={1.5} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-serif text-[19px] font-semibold leading-tight">Bíblia</span>
          <span className="mt-0.5 block text-[12.5px] leading-snug text-white/80">
            Os 73 livros, para ler e procurar
          </span>
        </span>
        <ChevronRight className="h-5 w-5 shrink-0 text-white/60" strokeWidth={1.5} aria-hidden />
      </Link>

      {/*
        Principal: a palavra do padre e a leitura do dia — o que se LÊ.
        Lateral: rezar hoje e o mural, que são atalhos e consulta.
      */}
      <DuasColunas
        principal={
          <>
      {/* Palavra do Padre — o que ESTA paróquia tem a dizer vem antes do
          que chega de fora. */}
      {latestPost && assinatura && (
        <section className="pt-[26px]">
          <SectionTitle
            eyebrow="Palavra do Padre"
            title="Uma mensagem para esta semana"
            actionLabel="Ver todas"
            actionHref="/comunidade"
          />
          <article className="relative overflow-hidden rounded-lg border border-border bg-surface p-5 before:absolute before:inset-x-5 before:top-0 before:h-px before:bg-gradient-to-r before:from-gold before:to-transparent">
            <div className="flex items-center gap-3">
              <Retrato nome={assinatura.nome} fotoUrl={assinatura.fotoUrl} size="sm" />
              <div>
                <p className="text-[13px] font-medium text-foreground">{assinatura.nome}</p>
                <p className="text-xs text-muted">{formatDateTime(latestPost.publishedAt)}</p>
              </div>
            </div>
            <p className="mt-3 font-serif text-[18px] leading-[1.62] text-foreground">
              {latestPost.mediaType === "texto"
                ? latestPost.contentText
                : POST_PREVIEW_LABEL[latestPost.mediaType]}
            </p>
            {latestPost.mediaType === "video" && latestPost.mediaUrl && (
              <VideoDoPost url={latestPost.mediaUrl} titulo={assinatura.nome} />
            )}
            {latestPost.mediaType !== "video" && (
              <LinkButton href="/comunidade" variant="gold" size="sm" className="mt-3.5">
                <Mic className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                Ler mensagem
              </LinkButton>
            )}
          </article>
        </section>
      )}

      {/* Vem DEPOIS das leituras da própria paróquia: o que o pároco
          publicou para esta comunidade tem precedência sobre o que vem de
          fora. Se a paróquia não publicou nada, este cartão é o que a
          pessoa encontra. */}
      <section className="pt-[26px]">
        <PalavraDoDiaCard palavra={palavraDoDia} />
      </section>

          </>
        }
        lateral={
          <>
      <section className="pt-[26px]">
        <Eyebrow tone="accent" className="mb-3">
          Rezar hoje
        </Eyebrow>

        <Card className="px-3.5 py-1.5">
          <RowLink
            href="/oracao/pedidos"
            icon={HandHeart}
            title="Pedidos de oração"
            subtitle="Envie ao pároco ou compartilhe no mural"
          />
          <RowLink
            href="/caminhada"
            icon={Footprints}
            title="Minha caminhada"
            subtitle="Sacramentos, missas e confissões"
          />
          <RowLink
            href="/comunidade/sacerdotes"
            icon={MessagesSquare}
            title="Falar com um sacerdote"
            subtitle="Agende uma conversa ou confissão"
          />
        </Card>
      </section>

      <section className="pt-7">
        <SectionTitle
          eyebrow="Mural"
          title="Rezar uns pelos outros"
          actionLabel="Ver todos"
          actionHref="/oracao/pedidos"
        />
        {communityRequests.length === 0 ? (
          <EmptyState
            icon={ScrollText}
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
          </>
        }
      />

      <div className="rule-gold my-7" />
    </div>
  );
}
