import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Cake, CalendarCheck, CalendarDays, Church, Footprints, HandCoins, HeartHandshake, Megaphone, Phone, Users } from "lucide-react";
import { getSessionContext } from "@/server/auth/session";
import { getNextCelebration } from "@/server/modules/celebrations/service";
import { getLatestPost } from "@/server/modules/posts/service";
import { getParish } from "@/server/modules/parishes/service";
import { getParoco } from "@/server/modules/priests/service";
import { resolverParoco, assinaturaDoPost } from "@/server/modules/parishes/paroco";
import { listPublishedAvisos } from "@/server/modules/avisos/service";
import { getPalavraDoDia } from "@/server/modules/liturgia/vatican-news-service";
import { PalavraDoDiaCard } from "@/components/domain/PalavraDoDiaCard";
import { listarAniversariosDaComunidade } from "@/server/modules/aniversarios/service";
import { NOME_DO_ANIVERSARIO } from "@/lib/aniversarios";
import { getLiturgicalSeason } from "@/lib/liturgical-season";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { RowLink } from "@/components/ui/RowLink";
import { Eyebrow, SectionTitle } from "@/components/ui/Typography";
import { Arch } from "@/components/brand/Arch";
import { BleedTop } from "@/components/layout/Bleed";
import { FeastList } from "@/components/domain/FeastList";
import { formatDateTime, formatDateOnly } from "@/lib/date";
import { VideoDoPost } from "@/components/domain/VideoDoPost";
import { OuvirAudioDoPost } from "@/components/domain/OuvirAudioDoPost";
import { Retrato } from "@/components/ui/Retrato";
import { CELEBRATION_TYPE_LABELS } from "@/lib/celebration-labels";
import { InstalarNaTelaInicial } from "@/components/domain/InstalarNaTelaInicial";
import { LidoAoVer } from "@/components/domain/LidoAoAbrir";
import { POST_PREVIEW_LABEL } from "@/lib/post-labels";
import { diaEmBrasilia, hojeEmBrasilia, horaEmBrasilia } from "@/lib/brasilia";
import { MaosEmOracao } from "@/components/oracao/MaosEmOracao";
import { proximosEncontrosDosMeusGrupos } from "@/server/modules/grupos/service";
import { ProximoEncontro } from "@/components/grupos/ProximoEncontro";

/*
 * Os atalhos são o que a pessoa VEIO fazer, e não um espelho da barra.
 *
 * Tinha "Servir" e "Palavra" aqui — os mesmos destinos das abas logo
 * abaixo, dois dos seis lugares gastos com o que já estava a um toque.
 * Enquanto isso, pedir oração ficava na aba Palavra, depois de rolar duas
 * telas (Bíblia, a mensagem inteira do padre, o Evangelho), e falar com um
 * sacerdote exigia saber que ele mora ali ou no fim da Comunidade.
 *
 * São justamente as duas coisas que o app faz e um site não faz: receber
 * o pedido de alguém e marcar a conversa. A primeira fileira é delas, ao
 * lado da Agenda; o resto vem depois.
 *
 * "Pedir oração" virou "Orações" (15/09/2026, decisão do usuário). Um botão
 * de AÇÃO — mandar um pedido — no meio de botões que são LUGARES destoava.
 * "Orações" abre a aba Palavra, que no topo tem as quatro ferramentas de
 * oração: Bíblia, Rezar, Pedir oração e Minha caminhada.
 *
 * SERVIR VOLTOU (22/09/2026, decisão do usuário), no lugar de "Falar com o
 * padre". O aplicativo existe para fazer mais gente participar da
 * comunidade, e esta é a tela que todos abrem: deixar o caminho de servir
 * fora dela era esconder justamente o convite que a paróquia mais quer
 * fazer. Falar com o padre continua a dois toques — o cartão "Sacerdotes e
 * pastorais", logo abaixo, leva até lá.
 *
 * Servir e Orações são as duas exceções à regra de não espelhar a barra, e
 * pelo mesmo motivo: quem pensa "quero ajudar" ou "vou rezar" não procura
 * pelo nome da aba. Os ícones são os mesmos dos destinos — as mãos em
 * oração são as do botão Rezar, e o aperto de mãos é o do convite de
 * Servir, no fim desta tela.
 */
const SHORTCUTS = [
  { href: "/agenda", icon: CalendarDays, label: "Agenda" },
  { href: "/oracao", icon: MaosEmOracao, label: "Orações" },
  { href: "/servir", icon: HeartHandshake, label: "Servir" },
  { href: "/caminhada", icon: Footprints, label: "Caminhada" },
  { href: "/doacao", icon: HandCoins, label: "Ofertar" },
  { href: "/contato", icon: Phone, label: "Contato" },
] as const;

/*
 * A saudação é a primeira linha que o fiel lê, e estava errada em produção.
 *
 * `new Date().getHours()` lê o fuso de QUEM ESTÁ RODANDO. Esta função roda
 * no servidor, e o servidor da Vercel é UTC: às seis da tarde de Brasília
 * já são 21h lá, e o app dizia "Boa noite"; às nove da noite dizia
 * "Bom dia". Passava despercebido porque em qualquer máquina brasileira
 * sai certo — o mesmo jeito pelo qual o horário das missas já tinha
 * escapado uma vez.
 */
function greeting(): string {
  const hour = horaEmBrasilia();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

/**
 * O Evangelho do dia, que chega DEPOIS do resto da tela.
 *
 * `getPalavraDoDia` busca um feed do Vatican News — servidor de outra
 * gente, com até 6 segundos de espera. Posto junto das outras consultas,
 * ele segurava o Início inteiro: a tela mais aberta do app ficava em
 * "Carregando…" esperando um terceiro responder. Visto na tela.
 *
 * Atrás de `Suspense` com fallback nulo, a página pinta na hora e o cartão
 * entra quando (e se) o feed responder. Feed fora do ar deixa de ser um
 * problema do app e volta a ser o que sempre foi: um cartão a menos.
 */
async function EvangelhoDeHoje() {
  const palavra = await getPalavraDoDia();
  if (!palavra) return null;
  return (
    <section className="pt-[26px]">
      <PalavraDoDiaCard palavra={palavra} variante="compacto" />
    </section>
  );
}

export const metadata: Metadata = { title: "Início" };

export default async function HomePage() {
  const session = await getSessionContext();
  const firstName = session?.fullName.split(" ")[0] ?? "";

  if (!session?.membership) {
    return (
      <EmptyState
        icon={Church}
        title="Você ainda não pertence a uma comunidade"
        description="Escolha a sua paróquia para acompanhar a vida da comunidade."
      />
    );
  }

  const hoje = hojeEmBrasilia();
  const [parish, parocoRegistrado, nextCelebration, latestPost, latestAvisos, daComunidade, meusEncontros] =
    await Promise.all([
      getParish(session.membership.parishId),
      getParoco(session.membership.parishId),
      getNextCelebration(session.membership.parishId),
      getLatestPost(session.membership.parishId),
      listPublishedAvisos(session.membership.parishId, 1),
      // Sete dias: "esta semana" precisa caber numa semana, senão a lista
      // vira calendário e o convite a rezar perde a urgência.
      listarAniversariosDaComunidade(session.membership.parishId, new Date(), 7),
      proximosEncontrosDosMeusGrupos(session.membership.parishId, session.userId, hoje),
    ]);

  /*
   * A mensagem é de HOJE?
   *
   * Comparada em Brasília, não em UTC: o servidor da Vercel roda em UTC, e
   * às 21h de Brasília já é o dia seguinte lá. Sem isso, o app diria "a
   * última mensagem" para um vídeo publicado à noite — justo no horário em
   * que mais gente abre.
   */
  const palavraEhDeHoje = latestPost
    ? diaEmBrasilia(latestPost.publishedAt) === hoje
    : false;
  const latestAviso = latestAvisos[0] ?? null;
  const paroco = parish ? resolverParoco(parish, parocoRegistrado) : null;
  const assinatura = latestPost ? assinaturaDoPost(latestPost.priestProfile, paroco) : null;

  /*
   * As duas seções que disputam o alto da tela, montadas antes para
   * poderem trocar de lugar. A ordem sai logo abaixo, no JSX.
   */
  const palavraDoPadre =
    latestPost && assinatura ? (
      <section key="palavra" className="pt-[30px]">
        {/*
          O título segue o DIA, e não uma suposição sobre a frequência.

          Dizia "Uma mensagem para esta semana" — e o pároco publica todo
          dia: nove vídeos em nove dias, medido em produção. Quem abriu
          ontem era informado de que só haveria novidade na semana que
          vem, com o vídeo de hoje logo abaixo. O app tinha o hábito do
          padre nas mãos e o descrevia como semanal.

          Continua honesto se ele parar: sem publicação de hoje, o título
          volta a falar da última.
        */}
        <SectionTitle
          eyebrow="Palavra do Padre"
          title={palavraEhDeHoje ? "A mensagem de hoje" : "A última mensagem"}
          actionLabel="Ver todas"
          actionHref="/comunidade"
        />
        {/* Chegar à mensagem aqui conta como tê-la visto: a notificação dela
            leva à aba Palavra, e sem isto a bolinha ficaria acesa lá para
            quem já leu no Início. Ver `LidoAoVer`. */}
        <LidoAoVer caminho="/oracao">
        <article className="relative overflow-hidden rounded-lg border border-border bg-surface p-5 before:absolute before:inset-x-5 before:top-0 before:h-px before:bg-gradient-to-r before:from-gold before:to-transparent">
          <div className="flex items-center gap-3">
            <Retrato nome={assinatura.nome} fotoUrl={assinatura.fotoUrl} size="sm" />
            <div>
              <p className="text-[13px] font-medium text-foreground">{assinatura.nome}</p>
              <p className="text-[13px] text-muted">{formatDateTime(latestPost.publishedAt)}</p>
            </div>
          </div>
          {/* O título manda na prévia do Início pelo mesmo motivo que
              manda na notificação: foi escrito para nomear ESTA mensagem,
              e o resto serve por tabela. */}
          {latestPost.titulo && (
            <p className="mt-3 font-serif text-[19px] font-semibold leading-snug text-foreground">
              {latestPost.titulo}
            </p>
          )}
          <p
            className={`${latestPost.titulo ? "mt-1.5" : "mt-3"} font-serif text-[18px] leading-[1.62] text-foreground`}
          >
            {latestPost.mediaType === "texto"
              ? latestPost.contentText
              : POST_PREVIEW_LABEL[latestPost.mediaType]}
          </p>

          {/* A capa É o botão: tocar nela abre o vídeo aqui mesmo. Continua
              sem falar com o YouTube antes do toque — o que carrega é a
              capa, e o player só depois que alguém pede. */}
          {latestPost.mediaType === "video" && latestPost.mediaUrl && (
            <VideoDoPost url={latestPost.mediaUrl} titulo={assinatura.nome} />
          )}

          {/* Só áudio ganha botão: o vídeo toca na capa e o texto já está
              inteiro aqui. "Ver todas" no título leva às anteriores. */}
          <OuvirAudioDoPost mediaType={latestPost.mediaType} mediaUrl={latestPost.mediaUrl} />

        </article>
        </LidoAoVer>
      </section>
    ) : null;

  const evangelhoDoDia = (
    <Suspense key="evangelho" fallback={null}>
      <EvangelhoDeHoje />
    </Suspense>
  );


  const season = getLiturgicalSeason(new Date());

  return (
    <div className="flex flex-col">
      {/* Hero — portal e caminho dourado, a assinatura da marca. */}
      <BleedTop>
        <section className="relative overflow-hidden bg-wash px-[18px] pb-[26px] pt-[30px] text-white">
          <Arch className="pointer-events-none absolute inset-0 h-full w-full opacity-50" />
          {/* O mesmo círculo da Comunidade: a foto da paróquia identifica o
              lugar sem disputar espaço com o nome. */}
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
              <p className="text-[13px] tracking-[0.04em] text-white/70">
                {greeting()}, {firstName}
              </p>
              <h1 className="mt-1 font-serif text-[27px] font-medium leading-[1.12]">
                {session.membership.parishName}
              </h1>
            </div>
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
                  {nextCelebration.semHora
                    ? formatDateOnly(nextCelebration.startsAt)
                    : formatDateTime(nextCelebration.startsAt)}
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

      {/* Só aparece no celular, no navegador, para quem ainda não instalou
          — e fica ACIMA dos atalhos porque é o que faz a pessoa voltar
          amanhã. Recolhido, custa uma faixa; some quando o app é instalado. */}
      <InstalarNaTelaInicial />

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
        {/*
          Três colunas no celular, SEIS no computador.

          Com a tela larga e três colunas, cada atalho virava um quadrado de
          380px com um ícone pequeno no meio — muito vazio, e duas fileiras
          para o que cabe numa. Em seis, a fila fica única e a mão do olho
          percorre tudo de uma vez.

          O tamanho G continua mandando: a regra dele em globals.css tem
          especificidade maior e reduz para duas colunas, que é o que faz o
          rótulo caber quando a letra é grande.
        */}
        <div className="grade-de-atalhos grid grid-cols-3 gap-3 lg:grid-cols-6">
          {SHORTCUTS.map((shortcut) => {
            const Icon = shortcut.icon;
            return (
              <Link
                key={shortcut.href}
                href={shortcut.href}
                className="flex flex-col items-center gap-2 rounded-xl px-0.5 pb-3 pt-3 text-center transition-transform hover:-translate-y-px"
              >
                {/* Quadrado fluido com teto de 74px: cinco cabem numa linha
                    só mesmo na tela estreita, sem a quinta sobrar sozinha
                    numa segunda fileira. */}
                <span className="mx-auto grid aspect-square w-full max-w-[96px] place-items-center rounded-[26px] bg-primary text-white shadow-sm transition-colors dark:bg-primary-light">
                  <Icon className="h-[38px] w-[38px]" strokeWidth={1.5} aria-hidden />
                </span>
                <span className="text-[13px] font-medium leading-tight text-foreground">
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
      {/*
        A ordem de quem fala primeiro, decidida pelo dia.

        Tinha o Evangelho do dia fixo no alto, e a razão era ruim: pus a
        fonte automática acima do pároco para garantir novidade diária num
        dia em que ele não publicasse. Só que ele publica — nove vídeos em
        nove dias, medido em produção —, e a garantia teórica custava caro:
        um feed do Vatican News falando antes do pároco, na tela de entrada
        da comunidade dele. Os dois costumam ser o MESMO Evangelho, e o
        vídeo é o comentário dele sobre aquele texto.

        Então a voz da casa vem primeiro quando existe hoje. Sem publicação
        de hoje, o Evangelho sobe e ocupa o lugar — que era o caso que eu
        queria cobrir, e agora é o único em que ele manda.
      */}
      {(palavraEhDeHoje
        ? [palavraDoPadre, evangelhoDoDia]
        : [evangelhoDoDia, palavraDoPadre])}

      {/*
        O próximo encontro do grupo de que a pessoa faz parte — o de
        adolescentes, por exemplo. Vem antes de "Hoje" porque é compromisso
        DELA, e não notícia da comunidade; e some para quem não é de grupo
        nenhum, que é a maioria.
      */}
      {meusEncontros.map(({ grupo, encontro }) => (
        <section key={grupo.id} className="pt-[30px]">
          <SectionTitle
            eyebrow="Seu grupo"
            title={grupo.name}
            actionLabel="Cronograma"
            actionHref={`/comunidade/pastorais/${grupo.id}`}
          />
          <ProximoEncontro
            encontro={encontro}
            hoje={hoje}
            meetsWhen={grupo.meetsWhen}
            meetsWhere={grupo.meetsWhere}
          />
        </section>
      ))}

      {/* Hoje — o princípio "quero dar uma olhadinha". */}
      <section className="pt-[30px]">
        <SectionTitle eyebrow="Hoje" title="O que tem na comunidade" />
        <Card className="px-3.5 py-1.5">
          {latestAviso && (
            <RowLink
              href="/avisos"
              icon={Megaphone}
              title={latestAviso.title}
              subtitle={latestAviso.body}
            />
          )}
          <RowLink
            href="/eu/compromissos"
            icon={CalendarCheck}
            title="Meus compromissos"
            subtitle="Escalas, encontros e tarefas que você assumiu"
          />
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
      {/*
        Esta semana na comunidade — quem tem data para celebrar.

        Só aparece quando alguém consentiu (`compartilhaDatas`), e some
        inteira quando não há ninguém: uma seção vazia dizendo "ninguém faz
        aniversário" é ruído, e faz parecer que a comunidade está deserta.

        A IDADE não sai no aniversário; nos sacramentos, os anos completados
        saem — "10 anos de casamento" é a comemoração, "42 anos" é uma
        informação que ninguém pediu para publicar.
      */}
      {daComunidade.length > 0 && (
        <section className="pt-[30px]">
          <SectionTitle eyebrow="Esta semana" title="Na nossa comunidade" />
          <Card className="px-3.5 py-1.5">
            {daComunidade.map((a) => (
              <div
                key={`${a.pessoaId}-${a.tipo}-${a.quando.toISOString()}`}
                className="flex items-center gap-3 border-b border-border py-3 last:border-b-0"
              >
                <span className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-full bg-primary-tint text-primary">
                  <Cake className="h-[19px] w-[19px]" strokeWidth={1.5} aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-[14.5px] font-medium leading-tight text-foreground">
                    {a.nome}
                  </p>
                  <p className="mt-0.5 text-[13px] text-muted">
                    {NOME_DO_ANIVERSARIO[a.tipo]}
                    {a.tipo !== "nascimento" && a.anos ? ` · ${a.anos} anos` : ""} ·{" "}
                    {a.faltam === 0 ? "hoje" : formatDateOnly(a.quando)}
                  </p>
                </div>
              </div>
            ))}
          </Card>
          <p className="mt-2.5 text-[13px] leading-relaxed text-muted">
            Rezemos por eles. Para aparecer aqui no seu dia, marque a opção no{" "}
            <Link href="/eu/perfil" className="font-medium text-primary underline">
              seu perfil
            </Link>
            .
          </p>
        </section>
      )}

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
