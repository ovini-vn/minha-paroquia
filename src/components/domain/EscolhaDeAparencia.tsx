"use client";

import { useTransition } from "react";
import { Sparkles, Palette } from "lucide-react";
import type { FontScale, ThemePreference } from "@prisma/client";
import { setFontScaleAction, setThemePreferenceAction } from "@/server/actions/appearance-actions";

/**
 * Escolher tamanho de letra e cor, dentro do onboarding.
 *
 * Vem cedo de propósito: quem precisa de letra grande precisa dela para ler
 * o resto das boas-vindas, não depois. Cada toque grava na hora e a tela
 * inteira muda junto — a pessoa vê o efeito no que está lendo, em vez de
 * escolher no escuro.
 */
const TAMANHOS = [
  { value: "p", label: "P", desc: "Padrão", classe: "text-[15px]" },
  { value: "m", label: "M", desc: "Maior", classe: "text-[19px]" },
  { value: "g", label: "G", desc: "Grande", classe: "text-[23px]" },
] as const;

export function EscolhaDeAparencia({
  fontScale,
  themePreference,
  nomeDoTempo,
}: {
  fontScale: FontScale;
  themePreference: ThemePreference;
  /** "Tempo Comum", "Advento"… para a escolha não ser abstrata. */
  nomeDoTempo: string;
}) {
  const [pendente, startTransition] = useTransition();

  function trocarTamanho(valor: string) {
    const dados = new FormData();
    dados.set("fontScale", valor);
    startTransition(() => setFontScaleAction(dados));
  }

  function trocarTema(valor: string) {
    const dados = new FormData();
    dados.set("themePreference", valor);
    startTransition(() => setThemePreferenceAction(dados));
  }

  return (
    <div className="flex flex-col gap-6" aria-busy={pendente}>
      <div>
        <p className="text-[14px] font-semibold text-foreground">Tamanho da letra</p>
        <p className="mt-1 text-[13.5px] leading-relaxed text-muted">
          Aumenta o app inteiro, não só o texto. Toque e veja como fica.
        </p>
        <div className="mt-3 flex gap-2">
          {TAMANHOS.map((t) => {
            const atual = fontScale === t.value;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => trocarTamanho(t.value)}
                aria-pressed={atual}
                aria-label={`Tamanho da letra: ${t.desc}`}
                className={
                  atual
                    ? "flex flex-1 flex-col items-center gap-1 rounded-xl border-2 border-primary bg-primary-tint py-3 text-primary"
                    : "flex flex-1 flex-col items-center gap-1 rounded-xl border border-border-strong bg-surface py-3 text-foreground transition-colors hover:border-primary"
                }
              >
                <span className={`${t.classe} font-serif font-semibold leading-none`}>{t.label}</span>
                <span className="text-[11.5px] opacity-80">{t.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-[14px] font-semibold text-foreground">Cor do app</p>
        <p className="mt-1 text-[13.5px] leading-relaxed text-muted">
          A cor da marca o ano inteiro, ou a cor do tempo litúrgico — hoje, {nomeDoTempo}.
        </p>
        <div className="mt-3 flex gap-2">
          {(
            [
              { value: "default", label: "Cor da marca", icon: Palette },
              { value: "liturgical", label: "Tempo Litúrgico", icon: Sparkles },
            ] as const
          ).map((opcao) => {
            const Icone = opcao.icon;
            const atual = themePreference === opcao.value;
            return (
              <button
                key={opcao.value}
                type="button"
                onClick={() => trocarTema(opcao.value)}
                aria-pressed={atual}
                className={
                  atual
                    ? "flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-primary bg-primary-tint px-3 py-3 text-[13px] font-semibold text-primary"
                    : "flex flex-1 items-center justify-center gap-2 rounded-xl border border-border-strong bg-surface px-3 py-3 text-[13px] font-semibold text-foreground transition-colors hover:border-primary"
                }
              >
                <Icone className="h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden />
                {opcao.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
