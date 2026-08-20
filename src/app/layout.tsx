import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import { getSessionContext } from "@/server/auth/session";
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
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
