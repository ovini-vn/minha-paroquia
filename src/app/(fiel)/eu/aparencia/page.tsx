import { requireSessionForPage } from "@/server/auth/guards";
import { getLiturgicalSeason } from "@/lib/liturgical-season";
import { setThemePreferenceAction } from "@/server/actions/appearance-actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default async function AppearancePage() {
  const session = await requireSessionForPage();
  const season = getLiturgicalSeason(new Date());
  const usingLiturgical = session.themePreference === "liturgical";

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-serif text-xl text-foreground">Aparência</h1>
        <p className="mt-1 text-sm text-muted">
          Escolha se o app usa sempre a mesma cor, ou se acompanha o Tempo Litúrgico do dia.
        </p>
      </div>

      <Card>
        <p className="mb-1 text-xs uppercase tracking-wide text-primary">Tempo litúrgico de hoje</p>
        <div className="flex items-center gap-3">
          <span
            className="h-8 w-8 shrink-0 rounded-full border border-border"
            style={{ backgroundColor: season.primaryColor }}
            aria-hidden
          />
          <div>
            <p className="font-serif text-lg text-foreground">{season.name}</p>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="text-xs text-muted">Cor principal</span>
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: season.primaryColor }} aria-hidden />
              <span className="text-xs text-muted">Destaque</span>
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: season.accentColor }} aria-hidden />
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <p className="mb-3 font-serif text-lg text-foreground">Tema da aplicação</p>
        <form action={setThemePreferenceAction} className="flex flex-col gap-3">
          <label className="flex items-start gap-3 text-sm text-foreground">
            <input
              type="radio"
              name="themePreference"
              value="default"
              defaultChecked={!usingLiturgical}
              className="mt-1"
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
              className="mt-1"
            />
            <span>
              <span className="font-medium">Usar cor do Tempo Litúrgico</span>
              <span className="block text-xs text-muted">
                A cor de destaque do app muda automaticamente ao longo do ano — hoje seria {season.name}.
              </span>
            </span>
          </label>
          <Button type="submit" className="self-start">
            Salvar
          </Button>
        </form>
      </Card>
    </div>
  );
}
