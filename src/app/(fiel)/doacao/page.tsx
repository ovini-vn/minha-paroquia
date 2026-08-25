import { HandCoins, HeartHandshake, Sparkles } from "lucide-react";
import { getSessionContext } from "@/server/auth/session";
import { getParish } from "@/server/modules/parishes/service";
import {
  getDonationSettings,
  listPurposesForFiel,
  listInitiativesForFiel,
} from "@/server/modules/doacao/service";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/Button";
import { PageHeader, Eyebrow } from "@/components/ui/Typography";
import { BotaoCopiar } from "@/components/ui/BotaoCopiar";
import { iconeDeDoacao, CATEGORIAS_DE_INICIATIVA, destinoDoDizimo } from "@/lib/doacao";
import { formatarChavePix, formatarCnpj, ehTipoDeChavePix, TIPOS_DE_CHAVE_PIX } from "@/lib/pix";
import { formatDateOnly } from "@/lib/date";

/**
 * Doação — por que doar, antes de como doar.
 *
 * A chave PIX é a última coisa da tela de propósito. Quem chega aqui já
 * sabe que quer ajudar; o que falta é ver onde o dinheiro chega. Uma tela
 * que abre com dados bancários pede sem contar para quê.
 *
 * Doação não é dízimo: doação é contribuição espontânea para o que está
 * acontecendo agora; dízimo é compromisso contínuo, acompanhado pela
 * pastoral. Por isso o dízimo aparece no fim, como convite — nunca como
 * mais uma forma de pagar.
 */
export default async function DoacaoPage() {
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
  const [parish, settings, finalidades, iniciativas] = await Promise.all([
    getParish(parishId),
    getDonationSettings(parishId),
    listPurposesForFiel(parishId),
    listInitiativesForFiel(parishId),
  ]);
  if (!parish) return null;

  const tipoDaChave =
    settings?.pixKeyType && ehTipoDeChavePix(settings.pixKeyType) ? settings.pixKeyType : null;
  const chaveFormatada =
    settings?.pixKey && tipoDaChave ? formatarChavePix(tipoDaChave, settings.pixKey) : null;
  const rotuloDoTipo = TIPOS_DE_CHAVE_PIX.find((t) => t.id === tipoDaChave)?.rotulo ?? null;

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
    <div className="flex flex-col">
      <PageHeader
        title="Doação"
        description="Sua doação ajuda a manter nossa comunidade viva e a levar esperança a quem precisa."
      />

      {/* Nada cadastrado ainda: uma frase honesta, em vez de seções vazias. */}
      {finalidades.length === 0 && iniciativas.length === 0 && !chaveFormatada && (
        <EmptyState
          icon={HandCoins}
          title="A paróquia ainda não abriu as doações"
          description="Assim que a secretaria cadastrar a chave PIX e as necessidades da comunidade, elas aparecem aqui."
        />
      )}

      {finalidades.length > 0 && (
        <section>
          <Eyebrow tone="accent" className="mb-3">
            Sua doação ajuda
          </Eyebrow>
          {/* Três colunas em qualquer tela. No celular cada card tem cerca
              de 105px, então o conteúdo se empilha na vertical — ícone em
              cima, texto embaixo — em vez de dividir essa largura entre
              ícone e frase, o que sobraria pouco para os dois. */}
          <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
            {finalidades.map((f) => {
              const Icone = iconeDeDoacao(f.icon);
              return (
                <Card
                  key={f.id}
                  className="flex flex-col items-center gap-2 px-2.5 py-4 text-center sm:px-4"
                >
                  <span className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-full bg-primary-tint text-primary">
                    <Icone className="h-[21px] w-[21px]" strokeWidth={1.5} aria-hidden />
                  </span>
                  <p className="text-[12.5px] font-semibold leading-tight text-foreground sm:text-[14.5px]">
                    {f.title}
                  </p>
                  <p className="text-[11px] leading-snug text-muted sm:text-[13px] sm:leading-relaxed">
                    {f.description}
                  </p>
                </Card>
              );
            })}
          </div>
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
                      {quando && <p className="mt-0.5 text-[12px] text-muted">{quando}</p>}
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
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {chaveFormatada && (
        <section className="pt-7">
          <Eyebrow tone="accent" className="mb-1">
            Faça sua doação
          </Eyebrow>
          <p className="mb-3 text-[13px] text-muted">
            Sua contribuição faz parte da missão da nossa comunidade.
          </p>

          <Card>
            <p className="font-serif text-[17px] font-semibold leading-tight text-foreground">
              {parish.name}
            </p>
            {parish.cnpj && (
              <p className="mt-0.5 text-[12.5px] text-muted">CNPJ {formatarCnpj(parish.cnpj)}</p>
            )}

            <div className="mt-4 border-t border-border pt-4">
              <p className="text-[11px] font-semibold uppercase tracking-eyebrow text-muted">
                Chave PIX{rotuloDoTipo ? ` · ${rotuloDoTipo}` : ""}
              </p>
              <p className="mt-1 break-all font-mono text-[15px] text-foreground">
                {chaveFormatada}
              </p>
              <BotaoCopiar
                valor={settings!.pixKey!}
                rotulo="Copiar chave PIX"
                rotuloCopiado="Chave copiada!"
                className="mt-3"
              />
            </div>

            {settings?.pixPayload && (
              <div className="mt-4 border-t border-border pt-4">
                <p className="text-[11px] font-semibold uppercase tracking-eyebrow text-muted">
                  PIX Copia e Cola
                </p>
                <p className="mt-2 max-h-24 overflow-y-auto break-all rounded-lg border border-border bg-sunken p-3 font-mono text-[11.5px] leading-relaxed text-muted">
                  {settings.pixPayload}
                </p>
                <BotaoCopiar
                  valor={settings.pixPayload}
                  rotulo="Copiar código PIX"
                  rotuloCopiado="PIX copiado!"
                  className="mt-3"
                />
              </div>
            )}
          </Card>

          <p className="mt-2.5 text-[12px] leading-relaxed text-muted">
            Confira os dados no aplicativo do seu banco antes de confirmar. A paróquia nunca pede
            doação por mensagem particular.
          </p>
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

      <div className="rule-gold my-7" />
    </div>
  );
}
