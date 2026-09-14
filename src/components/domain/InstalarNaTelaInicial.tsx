"use client";

import { useEffect, useState } from "react";
import { EllipsisVertical, Share, Smartphone, SquarePlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

/**
 * "Deixe o app na tela do celular" — o cartão do Início para quem ainda
 * abre o app pelo navegador.
 *
 * É o que decide se a pessoa volta amanhã. Ela chega por um link no
 * WhatsApp, usa, fecha — e no dia seguinte o link está vinte mensagens
 * acima. Instalado, o app vira um ícone ao lado dos outros.
 *
 * No iPhone pesa ainda mais: o Safari NUNCA oferece instalar sozinho, e sem
 * instalar o iPhone não recebe notificação nenhuma. Antes deste cartão, o
 * único lugar do app que falava disso era uma mensagem de erro, depois de
 * a pessoa tentar ligar os avisos.
 *
 * Três casos, e só três:
 *
 * - ANDROID COM CONVITE: o Chrome entregou o `beforeinstallprompt` (guardado
 *   pelo script do layout raiz). Um botão, um toque, e o próprio Chrome
 *   pergunta. Não há passo a passo para ler.
 * - ANDROID SEM CONVITE: Samsung Internet, o navegador de dentro do
 *   WhatsApp, ou o Chrome ainda sem decidir. Passos pelo menu ⋮.
 * - IPHONE: passos pelo botão Compartilhar, que é o único caminho.
 *
 * Computador não vê nada: instalar ali não resolve o problema de ninguém.
 * Quem já abre pelo ícone também não — o app sabe que está instalado.
 */

type ConviteDeInstalacao = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

declare global {
  interface Window {
    __conviteDeInstalacao?: ConviteDeInstalacao | null;
    __appInstalado?: boolean;
  }
}

type Plataforma = "iphone" | "android";

const CHAVE_DISPENSADO = "instalar-app:dispensado-em";

/*
 * "Agora não" vale por 30 dias, e não para sempre.
 *
 * Quem dispensou pode ter tocado sem querer, ou só não era a hora. Voltar
 * todo dia seria insistência; nunca mais, seria desistir da pessoa que
 * mais precisa do ícone.
 */
const DIAS_DISPENSADO = 30;

function detectarPlataforma(): Plataforma | null {
  const ua = navigator.userAgent;
  // O iPad se apresenta como Mac desde o iPadOS 13; o toque denuncia.
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) {
    return "iphone";
  }
  if (/Android/i.test(ua)) return "android";
  return null;
}

function jaEstaInstalado(): boolean {
  return (
    window.__appInstalado === true ||
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    // O Safari do iPhone não entende `display-mode`; tem o próprio sinal.
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function foiDispensadoHaPouco(): boolean {
  try {
    const quando = Number(localStorage.getItem(CHAVE_DISPENSADO));
    return quando > 0 && Date.now() - quando < DIAS_DISPENSADO * 86_400_000;
  } catch {
    // Navegação privada ou armazenamento bloqueado: mostrar é o erro menor.
    return false;
  }
}

export function InstalarNaTelaInicial() {
  /*
   * Nada é decidido no servidor, que não sabe qual é o aparelho nem se o
   * app está instalado. Até montar, o cartão não existe — e o HTML do
   * servidor e o primeiro desenho do navegador ficam iguais.
   */
  const [plataforma, setPlataforma] = useState<Plataforma | null>(null);
  const [visivel, setVisivel] = useState(false);
  const [convite, setConvite] = useState<ConviteDeInstalacao | null>(null);
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    const qual = detectarPlataforma();
    if (!qual || jaEstaInstalado() || foiDispensadoHaPouco()) return;

    setPlataforma(qual);
    setVisivel(true);
    setConvite(window.__conviteDeInstalacao ?? null);

    // O convite pode chegar depois da montagem, e o `appinstalled` também.
    const atualizar = () => {
      if (window.__appInstalado) setVisivel(false);
      setConvite(window.__conviteDeInstalacao ?? null);
    };
    window.addEventListener("convite-de-instalacao", atualizar);
    return () => window.removeEventListener("convite-de-instalacao", atualizar);
  }, []);

  if (!visivel || !plataforma) return null;

  function dispensar() {
    try {
      localStorage.setItem(CHAVE_DISPENSADO, String(Date.now()));
    } catch {
      // Sem armazenamento, "Agora não" vale até a próxima abertura.
    }
    setVisivel(false);
  }

  async function instalar() {
    if (!convite) return;
    await convite.prompt();
    const { outcome } = await convite.userChoice;
    // O convite só serve uma vez, aceito ou não.
    window.__conviteDeInstalacao = null;
    setConvite(null);
    if (outcome === "accepted") setVisivel(false);
  }

  return (
    <Card className="mt-[18px] border-gold/45 bg-gradient-to-b from-gold/[0.07] to-transparent lg:hidden">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-gold/15 text-[#8a6b24] dark:text-gold">
          <Smartphone className="h-[18px] w-[18px]" strokeWidth={1.5} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14.5px] font-medium text-foreground">Deixe o app na tela do celular</p>
          <p className="mt-1 text-[13px] leading-relaxed text-muted">
            Assim ele abre com um toque, sem precisar procurar o link na conversa.
          </p>

          {/*
            Os passos ficam recolhidos: abertos, empurrariam os atalhos para
            fora da primeira tela todo dia até a pessoa instalar. O botão diz
            quantos passos são — convida mais que "saiba mais" — e é curto
            para caber ao lado de "Agora não" num celular de 360px.

            "Agora não" fica NA MESMA LINHA enquanto o cartão está fechado, e
            desce para o fim quando os passos abrem: ninguém precisa rolar
            por cima das instruções para dispensar.
          */}
          {aberto && (
            <div id="passos-de-instalacao" className="mt-3">
              {plataforma === "iphone" ? <PassosDoIphone /> : <PassosDoAndroid />}
            </div>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-x-5">
            {convite ? (
              <Button type="button" size="sm" onClick={instalar} className="my-1">
                <SquarePlus className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                Colocar na tela inicial
              </Button>
            ) : (
              !aberto && (
                <button
                  type="button"
                  onClick={() => setAberto(true)}
                  aria-expanded={false}
                  className="min-h-11 text-[14px] font-semibold text-primary"
                >
                  Ver os 3 passos
                </button>
              )
            )}
            <button
              type="button"
              onClick={dispensar}
              className="min-h-11 text-[13px] font-medium text-muted underline-offset-2 hover:underline"
            >
              Agora não
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}

/*
 * Cada passo mostra o DESENHO do botão que a pessoa vai procurar. Quem não
 * sabe o nome "Compartilhar" reconhece o quadrado com a seta.
 *
 * Os nomes entre aspas são os que aparecem no aparelho em português, letra
 * por letra — é por eles que a pessoa procura na lista.
 */
const ICONE_NO_TEXTO = "mx-0.5 inline h-[17px] w-[17px] -translate-y-px align-middle text-foreground";

function Passo({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span
        className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary-tint text-[13px] font-semibold text-primary"
        aria-hidden
      >
        {n}
      </span>
      <span className="text-[14px] leading-relaxed text-foreground">{children}</span>
    </li>
  );
}

function PassosDoIphone() {
  return (
    <>
      <ol className="mt-1 flex flex-col gap-2.5">
        <Passo n={1}>
          Toque em <strong>Compartilhar</strong>
          <Share className={ICONE_NO_TEXTO} strokeWidth={1.75} aria-hidden /> — na barra do Safari,
          ou dentro do botão <strong>•••</strong>.
        </Passo>
        <Passo n={2}>
          Escolha <strong>“Adicionar à Tela de Início”</strong>
          <SquarePlus className={ICONE_NO_TEXTO} strokeWidth={1.75} aria-hidden />. Se não
          aparecer, role a lista para baixo.
        </Passo>
        <Passo n={3}>
          Toque em <strong>“Adicionar”</strong>. O ícone <strong>Paróquia</strong> aparece junto dos
          outros aplicativos.
        </Passo>
      </ol>
      {/* Navegador de dentro de outro app (Instagram, Facebook) não tem a
          opção. Em vez de detectar cada um, a saída serve para todos. */}
      <p className="mt-3 text-[13px] leading-relaxed text-muted">
        Não achou a opção? Abra este endereço no Safari e tente de novo.
      </p>
    </>
  );
}

function PassosDoAndroid() {
  return (
    <>
      <ol className="mt-1 flex flex-col gap-2.5">
        <Passo n={1}>
          Toque nos três pontinhos
          <EllipsisVertical className={ICONE_NO_TEXTO} strokeWidth={1.75} aria-hidden />, no canto
          de cima da tela.
        </Passo>
        <Passo n={2}>
          Escolha <strong>“Adicionar à tela inicial”</strong> ou <strong>“Instalar app”</strong>.
        </Passo>
        <Passo n={3}>
          Confirme. O ícone <strong>Paróquia</strong> aparece junto dos outros aplicativos.
        </Passo>
      </ol>
      {/* O link aberto pelo WhatsApp costuma abrir numa janela do Chrome
          embutida, cujo menu não tem a opção — só "Abrir no Chrome". */}
      <p className="mt-3 text-[13px] leading-relaxed text-muted">
        Abriu pelo WhatsApp e não achou a opção? Toque antes em <strong>“Abrir no Chrome”</strong>.
      </p>
    </>
  );
}
