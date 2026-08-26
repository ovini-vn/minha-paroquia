import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import { getSessionContext } from "@/server/auth/session";
import { RegistrarServiceWorker } from "@/components/layout/RegistrarServiceWorker";
import "./globals.css";
import { getLiturgicalSeason } from "@/lib/liturgical-season";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: "Minha Paróquia",
  description: "Caminhar · Pertencer · Servir",
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

  return (
    <html
      lang="pt-BR"
      data-color-scheme={colorScheme}
      data-font-scale={fontScale}
      // Faz os controles nativos (scrollbar, campos de data) acompanharem.
      style={{ colorScheme }}
      className={`${inter.variable} ${cormorant.variable}`}
    >
      <body className="font-sans antialiased">
        {children}
        <RegistrarServiceWorker />
      </body>
    </html>
  );
}
