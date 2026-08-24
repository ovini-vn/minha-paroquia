import { getLiturgicalSeason } from "@/lib/liturgical-season";

/**
 * Sem cabeçalho, sem abas, sem rodapé.
 *
 * As boas-vindas são o único lugar do app onde a navegação atrapalha: a
 * pessoa acabou de chegar e não sabe o que as abas significam — oferecer
 * saída antes de explicar entrada é o que faz alguém sumir na primeira
 * tela.
 */
export default function BemVindoLayout({ children }: { children: React.ReactNode }) {
  const season = getLiturgicalSeason(new Date());

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col bg-background" data-season={season.season}>
      {children}
    </div>
  );
}
