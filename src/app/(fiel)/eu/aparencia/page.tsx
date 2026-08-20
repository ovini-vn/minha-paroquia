import { requireSessionForPage } from "@/server/auth/guards";
import { getLiturgicalSeason, LITURGICAL_SEASONS, SEASON_NAMES } from "@/lib/liturgical-season";
import { setThemePreferenceAction } from "@/server/actions/appearance-actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PageHeader, Eyebrow } from "@/components/ui/Typography";

export default async function AppearancePage() {
  const session = await requireSessionForPage();
  const season = getLiturgicalSeason(new Date());
  const usingLiturgical = session.themePreference === "liturgical";

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Aparência"
        description="Escolha se o app usa sempre a cor da marca, ou se acompanha o Tempo Litúrgico do dia."
      />

      <Card>
        <div className="mb-3 flex items-center justify-between gap-3">
          <Eyebrow tone="accent">Tempo litúrgico de hoje</Eyebrow>
          <Badge tone="gold">{season.name}</Badge>
        </div>
        {/* Cada amostra carrega seu próprio data-season: a cor sai do CSS,
            nunca de um valor repetido aqui. */}
        <div className="flex flex-wrap gap-2">
          {LITURGICAL_SEASONS.map((code) => (
            <div
              key={code}
              data-season={code}
              className="flex items-center gap-2 rounded-full border border-border py-1.5 pl-1.5 pr-3"
            >
              <span className="h-5 w-5 rounded-full bg-primary" aria-hidden />
              <span
                className={
                  code === season.season
                    ? "text-xs font-semibold text-foreground"
                    : "text-xs text-muted"
                }
              >
                {SEASON_NAMES[code]}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <p className="mb-3 font-serif text-xl font-semibold text-foreground">Tema da aplicação</p>
        <form action={setThemePreferenceAction} className="flex flex-col gap-3">
          <label className="flex items-start gap-3 text-sm text-foreground">
            <input
              type="radio"
              name="themePreference"
              value="default"
              defaultChecked={!usingLiturgical}
              className="mt-1 accent-[rgb(var(--color-primary))]"
            />
            <span>
              <span className="font-medium">Tema padrão</span>
              <span className="block text-xs text-muted">Violeta e dourado, sempre a mesma cor.</span>
            </span>
          </label>
          <label className="flex items-start gap-3 text-sm text-foreground">
            <input
              type="radio"
              name="themePreference"
              value="liturgical"
              defaultChecked={usingLiturgical}
              className="mt-1 accent-[rgb(var(--color-primary))]"
            />
            <span>
              <span className="font-medium">Usar cor do Tempo Litúrgico</span>
              <span className="block text-xs text-muted">
                A atmosfera do app acompanha o calendário da Igreja — hoje seria {season.name}.
              </span>
            </span>
          </label>
          <Button type="submit" className="mt-1 self-start">
            Salvar
          </Button>
        </form>
      </Card>
    </div>
  );
}
