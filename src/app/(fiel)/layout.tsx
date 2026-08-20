import { requireSessionForPage } from "@/server/auth/guards";
import { countUnreadNotifications } from "@/server/modules/notifications/service";
import { getParish } from "@/server/modules/parishes/service";
import { getLiturgicalSeason } from "@/lib/liturgical-season";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { TabBar } from "@/components/layout/TabBar";

export default async function FielLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSessionForPage();
  const [unreadCount, parish] = await Promise.all([
    session.membership
      ? countUnreadNotifications(session.membership.parishId, session.userId)
      : Promise.resolve(0),
    session.membership ? getParish(session.membership.parishId) : Promise.resolve(null),
  ]);

  const season = getLiturgicalSeason(new Date());
  // "Usar cor do Tempo Litúrgico" (/eu/aparencia): o atributo troca a paleta
  // inteira via CSS (ver [data-season] em globals.css). Sem ele, fica a
  // atmosfera padrão da marca — nenhuma cor é calculada em JS.
  const seasonAttr = session.themePreference === "liturgical" ? season.season : undefined;

  const parishName = session.membership?.parishName ?? "Sem comunidade ativa";
  const cityLabel = parish?.city ? [parish.city, parish.state].filter(Boolean).join(" · ") : null;

  return (
    /*
     * Uma árvore só, responsiva — não duas versões do conteúdo escondidas
     * uma da outra.
     *
     * Celular: coluna de 440px, barra do app no topo, abas fixas embaixo.
     * Desktop (>= lg): cabeçalho horizontal de site ocupando a largura toda,
     * conteúdo em container de página e rodapé. É a coluna estreita com
     * trilha lateral que dava cara de aplicativo.
     */
    <div className="flex min-h-dvh flex-col bg-sunken lg:bg-background" data-season={seasonAttr}>
      <SiteHeader parishName={parishName} seasonName={season.name} unreadCount={unreadCount} />

      <div className="flex flex-1 justify-center lg:block">
        <main className="w-full max-w-[440px] flex-1 animate-enter bg-background px-[18px] pb-24 pt-6 shadow-lg lg:mx-auto lg:max-w-4xl lg:px-8 lg:pb-16 lg:pt-10 lg:shadow-none">
          {children}
        </main>
      </div>

      <SiteFooter
        parishName={parishName}
        city={cityLabel}
        address={parish?.address}
        phone={parish?.phone}
      />
      <TabBar />
    </div>
  );
}
