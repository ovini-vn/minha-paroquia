import type { Metadata } from "next";
import Link from "next/link";
import {
  HandHeart,
  Footprints,
  ScrollText,
  Sparkles,
  BookOpen,
  BookMarked,
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
import { diaEmBrasilia, hojeEmBrasilia } from "@/lib/brasilia";
import { Card } from "@/components/ui/Card";
import { Retrato } from "@/components/ui/Retrato";
import { VideoDoPost } from "@/components/domain/VideoDoPost";
import { OuvirAudioDoPost } from "@/components/domain/OuvirAudioDoPost";
import { POST_PREVIEW_LABEL } from "@/lib/post-labels";
import { EmptyState } from "@/components/ui/EmptyState";
import { RowLink } from "@/components/ui/RowLink";
import { Eyebrow, SectionTitle } from "@/components/ui/Typography";
import { PalavraDoDiaCard } from "@/components/domain/PalavraDoDiaCard";
import { Arch } from "@/components/brand/Arch";
import { BleedTop } from "@/components/layout/Bleed";
import { formatDateTime } from "@/lib/date";
import { DuasColunas } from "@/components/layout/DuasColunas";
import { MaosEmOracao } from "@/components/oracao/MaosEmOracao";
import { CATECISMO_ATIVO } from "@/lib/funcionalidades";

export const metadata: Metadata = { title: "Palavra" };

/** Os quatro botões do topo — ver o comentário onde são desenhados. */
const FERRAMENTAS = [
  { href: "/biblia", icon: BookOpen, label: "Bíblia" },
  { href: "/rezar", icon: MaosEmOracao, label: "Rezar" },
  { href: "/oracao/pedidos", icon: HandHeart, label: "Pedir oração" },
  { href: "/caminhada", icon: Footprints, label: "Minha caminhada" },
] as const;

export default async function OracaoPage() {
  const session = await getSessionContext();
  if (!session?.membership) {
    return (
      <EmptyState
        icon={HandHeart}
        title="Você ainda não pertence a uma comunidade"
        description="Escolha a sua paróquia para acompanhar a vida da comunidade."
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
  // Comparado em Brasília: às 21h daqui o servidor da Vercel já virou o dia.
  const palavraEhDeHoje = latestPost
    ? diaEmBrasilia(latestPost.publishedAt) === hojeEmBrasilia()
    : false;

  return (
    <div className="flex flex-col">
      {/* O hoje litúrgico — data e tempo, calculados pelo próprio app. */}
      <BleedTop>
        <section className="relative overflow-hidden bg-wash px-[18px] pb-6 pt-7 text-white">
          <Arch className="pointer-events-none absolute inset-0 h-full w-full opacity-45" />
          <div className="relative">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-eyebrow text-gold-soft">
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

      {/*
        AS FERRAMENTAS DE ORAÇÃO, em quatro botões iguais aos atalhos do
        Início (15/09/2026, decisão do usuário): Bíblia, Rezar, Pedir oração e
        Minha caminhada. É o que a pessoa vem fazer quando toca em Orações —
        ler, rezar, pedir e registrar —, e fica tudo à vista antes de rolar.

        Antes eram dois cartões compridos (a Bíblia cheia e o Rezar dourado),
        e pedir oração e a Caminhada moravam na coluna de baixo, depois da
        Palavra do Padre e do Evangelho.

        O desenho é o mesmo do Início de propósito — quadrado cheio, ícone
        branco, nome embaixo: quem aprendeu lá reconhece aqui. Quatro numa
        fileira no celular; no tamanho de letra G, a regra de
        `.grade-de-atalhos` em globals.css passa para duas colunas.

        NÃO sobrepor à faixa litúrgica: quadrado cheio sobre a faixa da mesma
        cor desaparece dentro dela. Precisa do fundo claro embaixo.
      */}
      <nav aria-label="Ferramentas de oração" className="pt-5">
        <div className="grade-de-atalhos grid grid-cols-4 gap-2.5 lg:max-w-[34rem]">
          {FERRAMENTAS.map((ferramenta) => {
            const Icone = ferramenta.icon;
            return (
              <Link
                key={ferramenta.href}
                href={ferramenta.href}
                className="flex flex-col items-center gap-2 rounded-xl px-0.5 pb-2 pt-1 text-center transition-transform hover:-translate-y-px"
              >
                <span className="mx-auto grid aspect-square w-full max-w-[96px] place-items-center rounded-[22px] bg-primary text-white shadow-sm transition-colors dark:bg-primary-light">
                  <Icone className="h-[34px] w-[34px]" strokeWidth={1.5} aria-hidden />
                </span>
                <span className="text-[13px] font-medium leading-tight text-foreground">{ferramenta.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* O CATECISMO: é para onde se vai quando a pergunta é "o que a Igreja
          ensina sobre isso?". Contorno e não fundo cheio — os botões cheios
          desta tela são as ferramentas de oração.
          Oculto por `CATECISMO_ATIVO` (ver src/lib/funcionalidades.ts). */}
      {CATECISMO_ATIVO && (
      <Link
        href="/catecismo"
        className="mt-2.5 flex items-center gap-3.5 rounded-lg border border-border bg-surface px-4 py-3.5 transition-colors hover:border-primary"
      >
        <span className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-[14px] bg-primary-tint text-primary">
          <BookMarked className="h-[24px] w-[24px]" strokeWidth={1.5} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-serif text-[19px] font-semibold leading-tight text-foreground">
            Catecismo
          </span>
          <span className="mt-0.5 block text-[13px] leading-snug text-muted">
            Pelo número ou pelo assunto
          </span>
        </span>
        <ChevronRight className="h-5 w-5 shrink-0 text-border-strong" strokeWidth={1.5} aria-hidden />
      </Link>
      )}

      {/*
        Principal: a palavra do padre e a leitura do dia — o que se LÊ.
        Lateral: falar com um sacerdote e o mural.
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
            title={palavraEhDeHoje ? "A mensagem de hoje" : "A última mensagem"}
            actionLabel="Ver todas"
            actionHref="/comunidade"
          />
          <article className="relative overflow-hidden rounded-lg border border-border bg-surface p-5 before:absolute before:inset-x-5 before:top-0 before:h-px before:bg-gradient-to-r before:from-gold before:to-transparent">
            <div className="flex items-center gap-3">
              <Retrato nome={assinatura.nome} fotoUrl={assinatura.fotoUrl} size="sm" />
              <div>
                <p className="text-[13px] font-medium text-foreground">{assinatura.nome}</p>
                <p className="text-[13px] text-muted">{formatDateTime(latestPost.publishedAt)}</p>
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
            <OuvirAudioDoPost mediaType={latestPost.mediaType} mediaUrl={latestPost.mediaUrl} />
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
        {/* Pedidos de oração e Minha caminhada subiram para os botões do topo
            (15/09/2026). Fica aqui o que não virou botão: conversar com um
            sacerdote. */}
        <Eyebrow tone="accent" className="mb-3">
          Sacramentos
        </Eyebrow>

        <Card className="px-3.5 py-1.5">
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
                <p className="mt-2 text-[13px] text-muted">
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
