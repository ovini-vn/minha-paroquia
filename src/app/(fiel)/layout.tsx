import { requireSessionForPage } from "@/server/auth/guards";
import { countUnreadNotifications } from "@/server/modules/notifications/service";
import { getLiturgicalSeason } from "@/lib/liturgical-season";
import { hexToRgbTriple } from "@/lib/color";
import { ParishHeader } from "@/components/layout/ParishHeader";
import { TabBar } from "@/components/layout/TabBar";

export default async function FielLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSessionForPage();
  const unreadCount = session.membership
    ? await countUnreadNotifications(session.membership.parishId, session.userId)
    : 0;

  // "Usar cor do Tempo Litúrgico" (/eu/aparencia): só sobrescreve os tokens
  // de destaque via `style` inline — src/lib/liturgical-season.ts é a
  // única fonte das cores, nunca duplicadas em CSS (ver globals.css).
  const themeStyle =
    session.themePreference === "liturgical"
      ? (() => {
          const season = getLiturgicalSeason(new Date());
          return {
            "--color-primary": hexToRgbTriple(season.primaryColor),
            "--color-primary-hover": hexToRgbTriple(season.primaryHoverColor),
            "--color-primary-light": hexToRgbTriple(season.primaryLightColor),
            "--color-accent": hexToRgbTriple(season.accentColor),
          } as React.CSSProperties;
        })()
      : undefined;

  return (
    <div className="min-h-dvh bg-cream-100 pb-20" style={themeStyle} data-theme-preference={session.themePreference}>
      <ParishHeader parishName={session.membership?.parishName ?? "Sem comunidade ativa"} unreadCount={unreadCount} />
      <main className="mx-auto max-w-lg px-4 py-6">{children}</main>
      <TabBar />
    </div>
  );
}
