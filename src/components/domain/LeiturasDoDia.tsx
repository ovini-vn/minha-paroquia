"use client";

import { useState } from "react";
import { ChevronDown, BookOpen } from "lucide-react";

/**
 * As leituras do dia, para quem prefere ler a ouvir.
 *
 * Vem fechado: a maioria abre a aba para o áudio, e despejar duas páginas
 * de texto empurraria o resto da tela para baixo para todo mundo. Quem
 * quer ler, toca.
 *
 * Recebe PARÁGRAFOS DE TEXTO PURO, nunca HTML — a extração acontece no
 * servidor (vatican-news-service). Renderizar como texto é o que impede
 * conteúdo de terceiro de virar script dentro do app.
 */
export function LeiturasDoDia({ leituras }: { leituras: string[] }) {
  const [aberto, setAberto] = useState(false);

  if (leituras.length === 0) return null;

  return (
    <div className="mt-3 border-t border-border pt-3">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        className="flex w-full items-center gap-2 text-left text-[13.5px] font-medium text-primary transition-colors hover:text-primary-hover"
      >
        <BookOpen className="h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden />
        {aberto ? "Fechar as leituras" : "Ler as leituras de hoje"}
        <ChevronDown
          className={`ml-auto h-4 w-4 shrink-0 transition-transform ${aberto ? "rotate-180" : ""}`}
          strokeWidth={1.5}
          aria-hidden
        />
      </button>

      {aberto && (
        <div className="mt-3 flex flex-col gap-2.5">
          {leituras.map((paragrafo, i) => (
            <p key={i} className="text-[14.5px] leading-relaxed text-foreground">
              {paragrafo}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
