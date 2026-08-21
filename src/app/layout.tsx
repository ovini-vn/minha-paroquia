import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import { getSessionContext } from "@/server/auth/session";
import { RegistrarServiceWorker } from "@/components/layout/RegistrarServiceWorker";
import "./globals.css";

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

export const viewport: Viewport = {
  // Pinta a barra do navegador com o topo do gradiente do cabeçalho.
  themeColor: "#5b2890",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Claro é o padrão: quem não escolheu nada — e quem nem está autenticado —
  // vê o tema claro. O escuro só entra por escolha explícita, gravada em
  // User.colorScheme. Renderizado aqui no servidor, então a página já chega
  // com o tema certo e não pisca.
  const session = await getSessionContext();
  const colorScheme = session?.colorScheme ?? "light";

  return (
    <html
      lang="pt-BR"
      data-color-scheme={colorScheme}
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
