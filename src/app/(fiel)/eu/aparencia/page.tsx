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
        <h1 className="font-serif text-xl text-ink-900">Aparência</h1>
        <p className="mt-1 text-sm text-ink-700">
          Escolha se o app usa sempre a mesma cor, ou se acompanha o Tempo Litúrgico do dia.
        </p>
      </div>

      <Card>
        <p className="mb-1 text-xs uppercase tracking-wide text-terracotta-600">Tempo litúrgico de hoje</p>
        <div className="flex items-center gap-3">
          <span
            className="h-8 w-8 shrink-0 rounded-full border border-terracotta-100"
            style={{ backgroundColor: season.primaryColor }}
            aria-hidden
          />
          <div>
            <p className="font-serif text-lg text-ink-900">{season.name}</p>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="text-xs text-ink-700">Cor principal</span>
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: season.primaryColor }} aria-hidden />
              <span className="text-xs text-ink-700">Destaque</span>
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: season.accentColor }} aria-hidden />
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <p className="mb-3 font-serif text-lg text-ink-900">Tema da aplicação</p>
        <form action={setThemePreferenceAction} className="flex flex-col gap-3">
          <label className="flex items-start gap-3 text-sm text-ink-900">
            <input
              type="radio"
              name="themePreference"
              value="default"
              defaultChecked={!usingLiturgical}
              className="mt-1"
            />
            <span>
              <span className="font-medium">Tema padrão</span>
              <span className="block text-xs text-ink-700">Violeta e dourado, sempre a mesma cor.</span>
            </span>
          </label>
          <label className="flex items-start gap-3 text-sm text-ink-900">
            <input
              type="radio"
              name="themePreference"
              value="liturgical"
              defaultChecked={usingLiturgical}
              className="mt-1"
            />
            <span>
              <span className="font-medium">Usar cor do Tempo Litúrgico</span>
              <span className="block text-xs text-ink-700">
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
