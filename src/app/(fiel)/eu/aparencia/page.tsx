import type { Metadata } from "next";
import { requireSessionForPage } from "@/server/auth/guards";
import { getLiturgicalSeason, LITURGICAL_SEASONS, SEASON_NAMES } from "@/lib/liturgical-season";
import { Sun, Moon } from "lucide-react";
import {
  setThemePreferenceAction,
  setColorSchemeAction,
  setFontScaleAction,
} from "@/server/actions/appearance-actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PageHeader, Eyebrow } from "@/components/ui/Typography";

export const metadata: Metadata = { title: "Aparência" };

export default async function AppearancePage() {
  const session = await requireSessionForPage();
  const season = getLiturgicalSeason(new Date());
  const usingLiturgical = session.themePreference === "liturgical";

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Aparência"
        description="Tamanho da letra, cor da marca ou do Tempo Litúrgico, e tema claro ou escuro."
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
        <p className="mb-1 font-serif text-xl font-semibold text-foreground">Tamanho da letra</p>
        <p className="mb-3 text-[13px] leading-relaxed text-muted">
          Aumenta o app inteiro, não só o texto: os botões e os espaços crescem junto, para
          continuar fácil de acertar com o dedo.
        </p>
        <form action={setFontScaleAction} className="flex flex-wrap gap-2">
          {(
            [
              { value: "p", label: "P", desc: "Padrão", tamanho: "text-[13px]" },
              { value: "m", label: "M", desc: "Maior", tamanho: "text-[16px]" },
              { value: "g", label: "G", desc: "Grande", tamanho: "text-[19px]" },
            ] as const
          ).map((option) => {
            const atual = session.fontScale === option.value;
            return (
              <button
                key={option.value}
                type="submit"
                name="fontScale"
                value={option.value}
                aria-pressed={atual}
                aria-label={`Tamanho da letra: ${option.desc}`}
                className={
                  atual
                    ? "inline-flex min-w-[86px] flex-col items-center gap-0.5 rounded-xl border border-primary bg-primary px-4 py-3 text-white"
                    : "inline-flex min-w-[86px] flex-col items-center gap-0.5 rounded-xl border border-border-strong bg-surface px-4 py-3 text-foreground transition-colors hover:border-primary hover:text-primary"
                }
              >
                {/* A amostra mostra o tamanho em vez de descrever: quem tem
                    dificuldade de ler escolhe pelo que consegue enxergar. */}
                <span className={`${option.tamanho} font-serif font-semibold leading-none`}>
                  {option.label}
                </span>
                <span className="text-[11px] opacity-80">{option.desc}</span>
              </button>
            );
          })}
        </form>
      </Card>

      <Card>
        <p className="mb-1 font-serif text-xl font-semibold text-foreground">Claro ou escuro</p>
        <p className="mb-3 text-[13px] leading-relaxed text-muted">
          O app abre no tema claro. O escuro é escolha sua — não acompanha mais o sistema
          operacional sozinho.
        </p>
        <form action={setColorSchemeAction} className="flex flex-wrap gap-2">
          {(
            [
              { value: "light", label: "Claro", icon: Sun },
              { value: "dark", label: "Escuro", icon: Moon },
            ] as const
          ).map((option) => {
            const Icon = option.icon;
            const atual = session.colorScheme === option.value;
            return (
              <button
                key={option.value}
                type="submit"
                name="colorScheme"
                value={option.value}
                aria-pressed={atual}
                className={
                  atual
                    ? "inline-flex items-center gap-2 rounded-full border border-primary bg-primary px-4 py-2.5 text-sm font-semibold text-white"
                    : "inline-flex items-center gap-2 rounded-full border border-border-strong bg-surface px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
                }
              >
                <Icon className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                {option.label}
              </button>
            );
          })}
        </form>
      </Card>

      <Card>
        <p className="mb-3 font-serif text-xl font-semibold text-foreground">Cor do tema</p>
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
