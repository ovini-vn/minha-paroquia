import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Next, Cormorant_Garamond, Inter, Lexend } from "next/font/google";
import { getSessionContext } from "@/server/auth/session";
import { RegistrarServiceWorker } from "@/components/layout/RegistrarServiceWorker";
import "./globals.css";
import { getLiturgicalSeason } from "@/lib/liturgical-season";
import { appBaseUrl } from "@/lib/url";

const inter = Inter({ subsets: ["latin"], variable: "--fonte-inter" });

/*
 * As duas letras alternativas, escolhidas em /eu/aparencia.
 *
 * `preload: false` nas duas é o detalhe que importa: o padrão do next/font é
 * pré-carregar toda família declarada, e isso faria TODO MUNDO baixar três
 * fontes para usar uma. Sem o preload, o navegador só busca a que a página
 * de fato pinta — quem ficar na Inter não paga nada pelas outras existirem.
 *
 * A Atkinson Hyperlegible Next vem do Braille Institute e é desenhada para
 * baixa visão: I maiúsculo, l minúsculo e 1 são três desenhos distintos, e
 * as aberturas do c, e, a e s ficam abertas em vez de fechar. Medida a
 * 100px, ela é 7% mais estreita que a Inter e tem altura-x 9% menor — por
 * isso o CSS compensa o corpo dela, senão trocar deixaria o texto
 * opticamente MENOR, que é o contrário do que quem troca está pedindo.
 *
 * A Lexend é mais larga e espaçada, feita para fluência: ajuda quem se
 * perde na linha mais do que quem não enxerga a letra.
 */
const atkinson = Atkinson_Hyperlegible_Next({
  subsets: ["latin"],
  variable: "--fonte-atkinson",
  preload: false,
  // O Next não tem as métricas desta família para gerar a fonte de reserva
  // ajustada, e avisa a cada build. Declarar `false` diz que a ausência é
  // conhecida, em vez de deixar um aviso que todo mundo aprende a ignorar.
  // O efeito prático é só o instante antes de a fonte chegar.
  adjustFontFallback: false,
});
const lexend = Lexend({ subsets: ["latin"], variable: "--fonte-lexend", preload: false });
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--fonte-cormorant",
});

export const metadata: Metadata = {
  /*
   * `template` faz cada tela compor o próprio título com o nome do app:
   * "Agenda · Minha Paróquia". Antes as 73 telas herdavam "Minha Paróquia"
   * e ficavam indistinguíveis na aba do navegador, no histórico e para quem
   * usa leitor de tela — que anuncia o título ao trocar de página.
   *
   * `default` vale para quem não define nada.
   */
  title: {
    default: "Minha Paróquia",
    template: "%s · Minha Paróquia",
  },
  description: "Caminhar · Pertencer · Servir",
  /*
   * Prévia do link quando alguém compartilha.
   *
   * É a forma como este app se espalha: a paróquia manda o endereço no
   * grupo do WhatsApp. Sem estas etiquetas a prévia sai só com o endereço
   * cru — medido em 29/08, não havia NENHUMA etiqueta Open Graph.
   *
   * Vale registrar o que a medição também mostrou, para ninguém "consertar"
   * o que está certo: o Next transmite os metadados DEPOIS do </head> para
   * navegador comum, e o Lighthouse acusa "sem meta description" por causa
   * disso. Mas ele bloqueia e devolve dentro do <head> para robô que não
   * executa JavaScript — conferido com os agentes do Facebook e do WhatsApp,
   * que recebem certo. O Googlebot recebe transmitido de propósito, porque
   * executa JavaScript e espera.
   *
   * `metadataBase` existe porque `images` precisa de endereço absoluto:
   * sem ela o Next monta o caminho relativo e a prévia vem sem figura.
   */
  metadataBase: new URL(appBaseUrl()),
  openGraph: {
    type: "website",
    siteName: "Minha Paróquia",
    locale: "pt_BR",
    title: "Minha Paróquia",
    description: "A vida da sua comunidade durante a semana.",
    images: [{ url: "/icons/icon-512.png", width: 512, height: 512, alt: "Minha Paróquia" }],
  },
  twitter: {
    card: "summary",
    title: "Minha Paróquia",
    description: "A vida da sua comunidade durante a semana.",
  },
  // O <link rel="manifest"> sai daqui automaticamente, de src/app/manifest.ts.
  appleWebApp: {
    // O iPhone ignora o `display: standalone` do manifest em versões mais
    // antigas e olha esta marcação. Sem ela, o atalho na Tela de Início
    // abre o Safari com barra de endereço em vez de abrir como app — e é
    // justamente o modo app que destrava a notificação no iPhone.
    capable: true,
    // Nome embaixo do ícone no iPhone (o short_name do manifest é do Android).
    title: "Paróquia",
    statusBarStyle: "default",
  },
  other: {
    // O Next emite só `mobile-web-app-capable`, o nome novo e padronizado.
    // O Safari mais antigo (incluindo o iOS 16.4 que estreou a notificação
    // web) só entende o nome com prefixo `apple-`. Declaro os dois: sem
    // este, o atalho no iPhone abre com barra de endereço e o aviso nunca
    // chega.
    "apple-mobile-web-app-capable": "yes",
  },
};

/**
 * Topo do gradiente de cada tempo litúrgico — os mesmos valores de --wash
 * em globals.css. Precisam estar aqui em JS porque a barra de status do
 * celular é pintada por uma meta tag, e meta tag não lê custom property.
 */
const COR_DO_TEMPO: Record<string, string> = {
  tempo_comum: "#3f6b52",
  advento: "#5b2890",
  natal: "#a8862f",
  quaresma: "#4e2277",
  triduo_pascal: "#3b3540",
  pascoa: "#b08e33",
  pentecostes: "#8a2b2b",
};

/** Atmosfera padrão da marca, para quem não escolheu a cor litúrgica. */
const COR_PADRAO = "#5b2890";

/**
 * Pinta a barra de status do celular com o topo do gradiente do cabeçalho.
 *
 * Instalado na tela inicial, essa faixa é a moldura do aplicativo: fixá-la
 * no violeta deixava a Quaresma roxa, o Tempo Comum verde e a barra sempre
 * violeta — três cores brigando no mesmo topo de tela.
 *
 * Segue a mesma regra da interface: só muda para quem escolheu "cor do
 * Tempo Litúrgico" em /eu/aparência.
 */
export async function generateViewport(): Promise<Viewport> {
  const session = await getSessionContext();
  if (session?.themePreference !== "liturgical") return { themeColor: COR_PADRAO };

  const { season } = getLiturgicalSeason(new Date());
  return { themeColor: COR_DO_TEMPO[season] ?? COR_PADRAO };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Claro é o padrão: quem não escolheu nada — e quem nem está autenticado —
  // vê o tema claro. O escuro só entra por escolha explícita, gravada em
  // User.colorScheme. Renderizado aqui no servidor, então a página já chega
  // com o tema certo e não pisca.
  const session = await getSessionContext();
  const colorScheme = session?.colorScheme ?? "light";
  // Renderizado no servidor, como o tema: a página já chega no tamanho
  // certo, sem a letra crescer depois que a pessoa começou a ler.
  const fontScale = session?.fontScale ?? "p";
  // A família da letra, mesmo raciocínio: quem não escolheu — e quem não
  // está autenticado — recebe a Inter, que é a letra da identidade.
  const fontFamily = session?.fontFamily ?? "inter";

  return (
    <html
      lang="pt-BR"
      data-color-scheme={colorScheme}
      data-font-scale={fontScale}
      data-font-family={fontFamily}
      // Faz os controles nativos (scrollbar, campos de data) acompanharem.
      style={{ colorScheme }}
      className={`${inter.variable} ${atkinson.variable} ${lexend.variable} ${cormorant.variable}`}
    >
      <body className="font-sans antialiased">
        {/*
          Primeiro elemento focalizável da página, e invisível até receber
          foco. Quem navega por teclado ou leitor de tela chegava percorrendo
          o cabeçalho e a navegação inteira antes do conteúdo, em TODA
          troca de tela.

          O destino tem tabIndex={-1} nos layouts: sem isso o navegador move
          a rolagem mas não move o foco, e o teclado continua de onde estava.
        */}
        <a
          href="#conteudo"
          className="sr-only rounded-lg bg-primary px-4 py-2.5 text-[14px] font-semibold text-white dark:bg-primary-light focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50"
        >
          Ir para o conteúdo
        </a>
        {children}
        <RegistrarServiceWorker />
      </body>
    </html>
  );
}
