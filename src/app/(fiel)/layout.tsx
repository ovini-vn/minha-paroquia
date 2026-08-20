import { requireSessionForPage } from "@/server/auth/guards";
import { countUnreadNotifications } from "@/server/modules/notifications/service";
import { getParish } from "@/server/modules/parishes/service";
import { getLiturgicalSeason } from "@/lib/liturgical-season";
import { Topbar } from "@/components/layout/Topbar";
import { TabBar } from "@/components/layout/TabBar";
import { Rail } from "@/components/layout/Rail";

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
    <div className="flex min-h-dvh justify-center bg-sunken" data-season={seasonAttr}>
      <Rail parishName={parishName} city={cityLabel} />

      <div className="flex min-h-dvh w-full max-w-[440px] flex-col bg-background shadow-lg lg:max-w-[600px] lg:shadow-none">
        <Topbar parishName={parishName} seasonName={season.name} unreadCount={unreadCount} />
        {/* O padding vive aqui e não nas telas; quem precisa sangrar até a
            borda (hero, capa) usa <Bleed>. */}
        <main className="flex-1 animate-enter px-[18px] pb-24 pt-6 lg:pb-10">{children}</main>
      </div>

      <TabBar />
    </div>
  );
}
