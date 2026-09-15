import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  HandCoins,
  HandHeart,
  HeartHandshake,
  Sparkles,
} from "lucide-react";
import { getSessionContext } from "@/server/auth/session";
import { getParish } from "@/server/modules/parishes/service";
import {
  getDonationSettings,
  listPurposesForFiel,
  listInitiativesForFiel,
} from "@/server/modules/doacao/service";
import {
  expirarPixAntigos,
  listarFinalidades,
  listarMinhasContribuicoes,
  listarPixEmAberto,
} from "@/server/modules/contribuicao/service";
import { nomeDaFinalidade } from "@/server/modules/contribuicao/schema";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/Button";
import { PageHeader, Eyebrow } from "@/components/ui/Typography";
import { iconeDeDoacao, CATEGORIAS_DE_INICIATIVA, destinoDoDizimo } from "@/lib/doacao";
import { formatarChavePix, ehTipoDeChavePix } from "@/lib/pix";
import { formatDateOnly } from "@/lib/date";
import { emReais } from "@/lib/dinheiro";
import { EscolherFinalidade } from "./_components/EscolherFinalidade";

/**
 * Ofertar — por que ofertar, antes de como ofertar.
 *
 * A chave PIX é a última coisa da tela de propósito. Quem chega aqui já
 * sabe que quer ajudar; o que falta é ver onde o dinheiro chega. Uma tela
 * que abre com dados bancários pede sem contar para quê.
 *
 * "Oferta" e não "doação": doação é o que se dá a uma instituição, de fora
 * para dentro; oferta é o que a comunidade põe em comum, e não existe
 * oferta devida. É também a palavra da própria missa — o ofertório —, o que
 * poupa a tela de ensinar vocabulário novo a quem já é daqui.
 *
 * Oferta não é dízimo: a oferta é espontânea, para o que está acontecendo
 * agora; o dízimo é compromisso contínuo, acompanhado pela pastoral. Por
 * isso o dízimo aparece no fim, como convite — nunca como mais uma forma de
 * pagar.
 *
 * UMA TELA SÓ. Eram duas: esta, que o Início chama de "Ofertar", mostrava
 * os cartões e mandava para /contribuir, que Eu chamava de "Minha oferta" e
 * mostrava as mesmas finalidades de novo, num formulário. Duas portas, dois
 * nomes, a mesma lista duas vezes — e quem chegava por Eu nunca via os
 * cartões que a secretaria escreveu. Agora o formulário, os códigos e o
 * histórico moram aqui, logo abaixo do porquê; /contribuir só redireciona.
 */
export const metadata: Metadata = { title: "Ofertar" };

export default async function DoacaoPage({
  searchParams,
}: {
  /** `?para=<finalidade>` — quem tocou num cartão ou iniciativa chega com ela marcada. */
  searchParams: Promise<{ para?: string }>;
}) {
  const { para } = await searchParams;
  const session = await getSessionContext();
  if (!session?.membership) {
    return (
      <EmptyState
        icon={HandCoins}
        title="Você ainda não pertence a uma comunidade"
        description="Escolha a sua paróquia para conhecer as necessidades dela."
      />
    );
  }

  const parishId = session.membership.parishId;
  await expirarPixAntigos(parishId);
  const [parish, settings, finalidades, iniciativas, destinos, emAberto, historico] =
    await Promise.all([
      getParish(parishId),
      getDonationSettings(parishId),
      listPurposesForFiel(parishId),
      listInitiativesForFiel(parishId),
      listarFinalidades(parishId),
      listarPixEmAberto(parishId, session.userId),
      listarMinhasContribuicoes(parishId, session.userId),
    ]);
  if (!parish) return null;

  const tipoDaChave =
    settings?.pixKeyType && ehTipoDeChavePix(settings.pixKeyType) ? settings.pixKeyType : null;
  const chaveFormatada =
    settings?.pixKey && tipoDaChave ? formatarChavePix(tipoDaChave, settings.pixKey) : null;

  const dizimo = settings?.dizimoAtivo
    ? destinoDoDizimo(settings.dizimoCtaTipo, settings.dizimoCtaValor, parish.name)
    : null;

  const periodo = (inicio: Date | null, fim: Date | null) => {
    if (inicio && fim) return `${formatDateOnly(inicio)} a ${formatDateOnly(fim)}`;
    if (inicio) return `Desde ${formatDateOnly(inicio)}`;
    if (fim) return `Até ${formatDateOnly(fim)}`;
    return null;
  };

  return (
    <div className="flex flex-col lg:max-w-[42rem]">
      <PageHeader
        title="Ofertar"
        description="Sua oferta mantém nossa comunidade viva e leva esperança a quem precisa."
      />

      {/* Nada cadastrado ainda: uma frase honesta, em vez de seções vazias. */}
      {finalidades.length === 0 && iniciativas.length === 0 && !chaveFormatada && (
        <EmptyState
          icon={HandCoins}
          title="A paróquia ainda não abriu as ofertas"
          description="Assim que a secretaria cadastrar a chave PIX e as necessidades da comunidade, elas aparecem aqui."
        />
      )}

      {finalidades.length > 0 && (
        <section>
          <Eyebrow tone="accent" className="mb-3">
            Sua oferta ajuda
          </Eyebrow>
          {/* Duas colunas no celular, três a partir de 640px. O conteúdo se
              empilha na vertical — ícone em cima, texto embaixo — em vez de
              dividir a largura do card entre ícone e frase.

              Eram três colunas também no celular: cards de 105px, a frase
              em linhas de uma ou duas palavras e o quarto card sozinho numa
              fileira. Com o piso de 13px (ver Typography.tsx) até "Quero
              ajudar" quebrava. Em duas, quatro finalidades fecham duas
              fileiras cheias. */}
          <div className="grade-finalidades grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2.5">
            {finalidades.map((f) => {
              const Icone = iconeDeDoacao(f.icon);

              /*
               * O conteúdo é montado uma vez e embrulhado conforme o caso.
               *
               * No celular o cartão tem cerca de 105px: um link escrito ao
               * pé ficaria com duas letras por linha e um alvo de toque
               * menor que o dedo. Quando há finalidade ligada, o CARTÃO
               * INTEIRO é o caminho; sem ela, continua sendo o texto que
               * sempre foi.
               */
              const conteudo = (
                <>
                  <span className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-full bg-primary-tint text-primary">
                    <Icone className="h-[21px] w-[21px]" strokeWidth={1.5} aria-hidden />
                  </span>
                  {/* Título e texto num bloco só: no tamanho G o card vira
                      linha, e sem agrupar eles ficariam lado a lado com o
                      ícone, cada um espremido num terço da largura. */}
                  <div className="texto-finalidade flex min-w-0 flex-col gap-2">
                    <p className="text-[13px] font-semibold leading-tight text-foreground sm:text-[14.5px]">
                      {f.title}
                    </p>
                    <p className="text-[13px] leading-snug text-muted sm:text-[13px] sm:leading-relaxed">
                      {f.description}
                    </p>
                    {f.finalidadeId && (
                      <span className="text-[13px] font-semibold text-primary sm:text-[13px]">
                        Quero ajudar
                      </span>
                    )}
                  </div>
                </>
              );

              const dentro =
                "flex flex-col items-center gap-2 px-2.5 py-4 text-center sm:px-4";

              return f.finalidadeId ? (
                <Card
                  key={f.id}
                  className="card-finalidade p-0 transition-colors hover:border-primary focus-within:border-primary"
                >
                  <Link
                    href={`/doacao?para=${f.finalidadeId}#gerar-codigo`}
                    className={`${dentro} rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
                  >
                    {conteudo}
                  </Link>
                </Card>
              ) : (
                <Card key={f.id} className={`card-finalidade ${dentro}`}>
                  {conteudo}
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/*
        A ordem diz o que a paróquia pensa sobre contribuir.

        Primeiro o porquê — os cartões de "Sua oferta ajuda". Depois o
        caminho de quem já quer participar, e logo abaixo dele o que a
        pessoa já ofertou. Depois o dízimo, que é pertencimento contínuo e
        não campanha. E só então as iniciativas, que são o que está
        acontecendo agora.

        Pedido pontual por último de propósito: campanha antes de
        vínculo é a ordem de quem arrecada, não a de quem convida.
      */}
      {/*
        O caminho principal da tela, e o único botão CHEIO dela: "Gerar meu
        código PIX", dentro do formulário. O do dízimo é de contorno
        dourado. Quem chega rolando encontra uma coisa só para tocar.

        O destaque é do BOTÃO, não do cartão: o fundo continua o mesmo das
        outras superfícies. Tingir o cartão brigaria com o convite ao
        dízimo, que vem logo abaixo em dourado, e a tela passaria a ter dois
        pedidos gritando ao mesmo tempo.

        O TÍTULO NÃO PERGUNTA MAIS SOBRE IDENTIFICAÇÃO, e a razão é que a
        pergunta era falsa. Todo Pix gerado aqui nasce com identificador e
        preso a quem o gerou — não existe o caminho anônimo que a pergunta
        oferecia. Quem não escolhe finalidade não fica anônimo: fica como
        oferta espontânea, que é uma escolha, e a paróquia aplica onde for
        mais necessário. Oferecer uma opção que não existe é pior do que não
        falar no assunto.

        No lugar da pergunta técnica, PERTENCIMENTO. Quem abre esta tela não
        quer contratar um serviço de identificação: quer fazer parte do que
        a paróquia está construindo. É a mesma diferença entre "seu depósito
        foi registrado" e "esta obra também é sua".

        A frase do valor fica, e é a única que precisa continuar dizendo o
        que NÃO acontece: o app não sugere quantia nenhuma. Numa tela sobre
        pertencer, o silêncio sobre o valor seria lido como expectativa.
      */}
      {chaveFormatada && (
        <section id="gerar-codigo" className="scroll-mt-24 pt-7">
          <Card className="border-primary/40">
            <div className="flex items-center gap-3">
              <span className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-md bg-primary-tint text-primary">
                <HandHeart className="h-[19px] w-[19px]" strokeWidth={1.5} aria-hidden />
              </span>
              <p className="font-serif text-[18px] font-semibold leading-tight text-foreground">
                Faça parte das obras da nossa paróquia
              </p>
            </div>

            <p className="mb-4 mt-3 text-[13.5px] leading-relaxed text-muted">
              Escolha onde a sua oferta vai ajudar. O valor é sempre seu: o app não sugere quantia
              nenhuma.
            </p>

            {/*
              O FORMULÁRIO MORA AQUI, e não atrás de um botão.

              Era um "Quero fazer parte" que abria outra tela com as mesmas
              finalidades dos cartões de cima. Agora tocar num cartão marca a
              finalidade aqui mesmo, e a tela rola até este cartão.

              A `key` é o que faz a marcação seguir o toque: sem ela, o
              componente guardaria a escolha anterior ao trocar só o endereço.
            */}
            {destinos.length === 0 ? (
              <p className="text-[13px] leading-relaxed text-muted">
                A paróquia ainda está definindo para onde as ofertas podem ir. Assim que ela
                cadastrar, você escolhe aqui.
              </p>
            ) : (
              <EscolherFinalidade
                key={para ?? "nenhuma"}
                finalidadeInicial={para ?? null}
                comDescricao={finalidades.length === 0}
                finalidades={destinos.map((f) => ({
                  id: f.id,
                  nome: f.nome,
                  descricao: f.descricao,
                  icone: f.icone,
                }))}
              />
            )}

            {/* O "como funciona" que tinha cartão próprio na outra tela cabe
                aqui em duas frases — é o que alguém precisa saber antes de
                tocar no botão, não depois. */}
            <p className="mt-4 border-t border-border pt-3 text-[13px] leading-relaxed text-muted">
              Copie o código e cole no aplicativo do seu banco. Não precisa enviar comprovante: a
              oferta aparece em Minhas ofertas quando a paróquia a registrar. O dinheiro vai direto
              para a conta da paróquia.
            </p>
          </Card>
        </section>
      )}

      {/*
        Minhas ofertas — o destino de Eu, com a âncora sempre presente.

        Aparece para quem pode ofertar pelo app, mesmo sem nada ainda: o item
        de Eu aponta para cá, e uma âncora que só existe depois da primeira
        oferta deixaria quem nunca ofertou no topo da tela, sem entender.
      */}
      {(chaveFormatada || historico.length > 0 || emAberto.length > 0) && (
        <section id="minhas-ofertas" className="scroll-mt-24 pt-7">
          <Eyebrow tone="accent" className="mb-3">
            Minhas ofertas
          </Eyebrow>

          {emAberto.length > 0 && (
            <Card className="mb-3">
              <p className="mb-2 text-[13px] font-medium text-foreground">Códigos que você gerou</p>
              <div className="flex flex-col gap-2">
                {emAberto.map((pix) => (
                  <LinkButton
                    key={pix.id}
                    href={`/contribuir/${pix.id}`}
                    variant="ghost"
                    size="sm"
                    className="!justify-start"
                  >
                    {nomeDaFinalidade(pix.finalidade)}
                    {pix.centavos ? ` · ${emReais(pix.centavos)}` : ""}
                  </LinkButton>
                ))}
              </div>
              <p className="mt-3 text-[13px] leading-relaxed text-muted">
                Um código gerado não compromete você a nada. Se não usar, ele simplesmente deixa de
                aparecer aqui.
              </p>
            </Card>
          )}

          {historico.length === 0 ? (
            <p className="text-[13px] leading-relaxed text-muted">
              Você ainda não tem ofertas registradas pelo app.
            </p>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                {historico.map((c) => (
                  <Card key={c.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="text-[14.5px] font-medium text-foreground">
                        {nomeDaFinalidade(c.finalidade)}
                      </p>
                      <p className="text-[13px] text-muted">{formatDateOnly(c.recebidaEm)}</p>
                    </div>
                    <p className="shrink-0 font-mono text-[15px] font-semibold text-foreground">
                      {emReais(c.centavos)}
                    </p>
                  </Card>
                ))}
              </div>
              {/*
                Nada de txid, identificador ou "conciliado" aqui. Para quem
                ofertou, a pergunta é se a paróquia recebeu — e uma oferta
                só aparece nesta lista depois que recebeu.
              */}
              <p className="mt-3 text-[13px] leading-relaxed text-muted">
                A lista mostra o que a paróquia já registrou como recebido. Ofertas em dinheiro ou
                envelope aparecem quando a secretaria as lança.
              </p>
            </>
          )}
        </section>
      )}

      {settings?.dizimoAtivo && (
        <section className="pt-7">
          {/* Dízimo é outra coisa: compromisso contínuo, acompanhado pela
              pastoral. Aparece como convite, com tratamento próprio. */}
          <Card className="relative overflow-hidden before:absolute before:inset-x-5 before:top-0 before:h-px before:bg-gradient-to-r before:from-gold before:to-transparent">
            <div className="flex items-center gap-3">
              <span className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-md bg-gold/15 text-[#7c5f16] dark:text-gold">
                <Sparkles className="h-[19px] w-[19px]" strokeWidth={1.5} aria-hidden />
              </span>
              <p className="font-serif text-[18px] font-semibold leading-tight text-foreground">
                {settings.dizimoTitulo || "Seja dizimista da nossa comunidade"}
              </p>
            </div>

            <p className="mt-3 font-serif text-[16px] leading-relaxed text-foreground">
              {settings.dizimoTexto ||
                "O dízimo é uma expressão de gratidão a Deus e de compromisso com a missão da nossa comunidade. Ao se tornar dizimista, você ajuda nossa paróquia a continuar evangelizando, acolhendo e cuidando de quem precisa."}
            </p>

            {dizimo && (
              <LinkButton
                href={dizimo.href}
                variant="gold"
                className="mt-4 w-full"
                {...(dizimo.externo ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              >
                <HeartHandshake className="h-[17px] w-[17px]" strokeWidth={1.5} aria-hidden />
                {settings.dizimoCtaLabel || "Quero ser dizimista"}
              </LinkButton>
            )}
          </Card>
        </section>
      )}

      {iniciativas.length > 0 && (
        <section className="pt-7">
          <Eyebrow tone="accent" className="mb-1">
            O que estamos realizando
          </Eyebrow>
          <p className="mb-3 text-[13px] text-muted">
            Veja onde nossa comunidade está colocando sua fé em ação.
          </p>
          <div className="flex flex-col gap-2.5">
            {iniciativas.map((i) => {
              const Icone = iconeDeDoacao(i.icon);
              const quando = periodo(i.startsOn, i.endsOn);
              return (
                <Card key={i.id}>
                  <div className="flex gap-3">
                    <span className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-md bg-gold/15 text-[#7c5f16] dark:text-gold">
                      <Icone className="h-[19px] w-[19px]" strokeWidth={1.5} aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[14.5px] font-medium text-foreground">{i.title}</p>
                        <Badge tone="muted">{CATEGORIAS_DE_INICIATIVA[i.category]}</Badge>
                      </div>
                      {quando && <p className="mt-0.5 text-[13px] text-muted">{quando}</p>}
                    </div>
                  </div>

                  <p className="mt-2.5 whitespace-pre-line text-[13.5px] leading-relaxed text-muted">
                    {i.description}
                  </p>

                  {/* Texto antes da imagem: quem está sem rede para carregar
                      figura continua sabendo o que a paróquia está fazendo. */}
                  {i.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={i.imageUrl}
                      alt=""
                      loading="lazy"
                      className="mt-2.5 w-full rounded-lg border border-border object-cover"
                    />
                  )}

                  {/*
                    Um LINK, e não um botão.
                    
                    A seção conta o que a paróquia está fazendo; o convite a
                    ajudar é consequência de ter entendido, não um apelo
                    competindo com o texto. Um botão em cada cartão
                    transformaria a página numa sequência de pedidos, que é
                    exatamente o que a ferramenta não deve ser.
                  */}
                  {i.finalidadeId && (
                    <Link
                      href={`/doacao?para=${i.finalidadeId}#gerar-codigo`}
                      className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      Quero ajudar nisto
                      <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden />
                    </Link>
                  )}
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/*
        Não há chave PIX solta nesta tela, e é de propósito.
        
        `chaveFormatada` só faz de porteiro: sem chave cadastrada não há como
        ofertar, e o convite some. A chave em si nunca é exibida — copiá-la
        daqui geraria um Pix sem identificador, que cairia na conta sem dizer
        de quem é nem para quê, e alguém teria de adivinhar na conciliação.
        Todo caminho desta tela passa por um código gerado com identificador.
      */}

      <div className="rule-gold my-7" />
    </div>
  );
}
