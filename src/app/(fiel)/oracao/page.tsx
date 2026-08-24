import { HandHeart, Footprints, ScrollText, Sparkles, BookOpen } from "lucide-react";
import { getSessionContext } from "@/server/auth/session";
import { listCommunityPrayerRequests } from "@/server/modules/prayer-requests/service";
import { getTodayContext } from "@/server/modules/liturgia/daily-service";
import { getLiturgyForDate } from "@/server/modules/liturgia/liturgy-of-the-day-service";
import { getPalavraDoDia } from "@/server/modules/liturgia/vatican-news-service";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { RowLink } from "@/components/ui/RowLink";
import { Eyebrow, SectionTitle } from "@/components/ui/Typography";
import { PalavraDoDiaCard } from "@/components/domain/PalavraDoDiaCard";
import { Arch } from "@/components/brand/Arch";
import { BleedTop } from "@/components/layout/Bleed";
import { formatDateTime } from "@/lib/date";

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
  const [liturgy, communityRequests, palavraDoDia] = await Promise.all([
    getLiturgyForDate(session.membership.parishId, today),
    listCommunityPrayerRequests(session.membership.parishId, 3),
    getPalavraDoDia(),
  ]);

  const leituras = liturgy
    ? [
        { label: "1ª leitura", value: liturgy.firstReading },
        { label: "Salmo", value: liturgy.psalm },
        { label: "2ª leitura", value: liturgy.secondReading },
      ].filter((r): r is { label: string; value: string } => Boolean(r.value))
    : [];

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

      {/* Leituras do dia — publicadas pela paróquia. */}
      <div className="relative z-[2] -mt-[22px] rounded-lg border border-border bg-surface px-[18px] py-4 shadow">
        <Eyebrow tone="accent">Evangelho de hoje</Eyebrow>
        {liturgy ? (
          <>
            <p className="mt-1.5 font-serif text-[26px] font-semibold leading-tight text-primary">
              {liturgy.gospelReference}
            </p>
            {liturgy.gospelTitle && (
              <p className="mt-1 text-[13.5px] text-muted">{liturgy.gospelTitle}</p>
            )}
            {leituras.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border pt-3">
                {leituras.map((r) => (
                  <Badge key={r.label} tone="muted">
                    {r.label}: {r.value}
                  </Badge>
                ))}
              </div>
            )}
            {liturgy.reflection && (
              <p className="mt-3 border-l-[1.5px] border-gold pl-3.5 font-serif text-[17px] leading-relaxed text-foreground">
                {liturgy.reflection}
              </p>
            )}
          </>
        ) : (
          <p className="mt-1.5 text-[13.5px] text-muted">
            Sua paróquia ainda não publicou as leituras de hoje.
          </p>
        )}
      </div>

      {/* Vem DEPOIS das leituras da própria paróquia: o que o pároco
          publicou para esta comunidade tem precedência sobre o que vem de
          fora. Se a paróquia não publicou nada, este cartão é o que a
          pessoa encontra. */}
      <section className="pt-[26px]">
        <PalavraDoDiaCard palavra={palavraDoDia} />
      </section>

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
            href="/comunidade"
            icon={BookOpen}
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

      <div className="rule-gold my-7" />
    </div>
  );
}
