"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { BlocoDeLeitura } from "@/server/modules/liturgia/vatican-news-service";

/** Quantas linhas do Evangelho ficam à vista sem ninguém tocar em nada. */
const LINHAS_A_VISTA = 4;

/**
 * Versos de uma leitura.
 *
 * LINHAS de um mesmo bloco, não parágrafos. O lecionário quebra a linha no
 * ritmo de quem proclama em voz alta — "Para nós, porém, existe um só Deus,
 * o Pai," / "de quem vêm todos os seres" / "e para quem nós existimos." é
 * UMA frase. Renderizada como três parágrafos afastados, vira uma lista de
 * fragmentos sem sujeito; era assim que estava, e dava para ver na tela.
 */
function Versos({ linhas }: { linhas: string[] }) {
  return (
    <p className="text-[14.5px] leading-relaxed text-foreground">
      {linhas.map((linha, i) => (
        <span key={i} className="block">
          {linha}
        </span>
      ))}
    </p>
  );
}

/**
 * A reflexão que fecha a liturgia do dia — prosa, e não verso.
 *
 * Aqui cada item É um parágrafo de verdade, e leva o respiro entre eles.
 * Costuma ser um Angelus do Papa, às vezes com a assinatura numa linha
 * curta no fim.
 */
function Reflexao({ linhas }: { linhas: string[] }) {
  return (
    <div className="flex flex-col gap-2.5">
      {linhas.map((paragrafo, i) => (
        <p key={i} className="text-[14px] leading-relaxed text-muted">
          {paragrafo}
        </p>
      ))}
    </div>
  );
}

function Bloco({ bloco }: { bloco: BlocoDeLeitura }) {
  if (bloco.tipo === "reflexao") {
    return (
      <section className="border-t border-border pt-3">
        <p className="mb-2 text-[11.5px] font-medium uppercase tracking-[0.08em] text-muted">
          Para rezar hoje
        </p>
        <Reflexao linhas={bloco.linhas} />
      </section>
    );
  }

  return (
    <section>
      {bloco.rotulo && (
        <p className="text-[13px] font-medium leading-snug text-primary">{bloco.rotulo}</p>
      )}
      {bloco.referencia && (
        <p className="mb-1.5 text-[13px] text-muted">{bloco.referencia}</p>
      )}
      <Versos linhas={bloco.linhas} />
    </section>
  );
}

/**
 * A liturgia do dia, com o Evangelho respirando desde o começo.
 *
 * Antes, TUDO ficava atrás de um toque em "Ler as leituras de hoje" — e a
 * tela dizia "Evangelho de hoje" sem mostrar uma palavra do Evangelho.
 * Quem abre o app às seis da manhã não caça: ou o texto está ali, ou não
 * foi lido.
 *
 * Então as primeiras linhas do Evangelho ficam à vista, com a citação em
 * cima, e o toque abre o resto — as outras leituras, o Evangelho inteiro e
 * a reflexão. O respiro é o mínimo que faz alguém começar a ler; abrir por
 * padrão empurraria quatro mil caracteres para cima de quem veio ver a
 * missa de domingo.
 */
export function LeiturasDoDia({ blocos }: { blocos: BlocoDeLeitura[] }) {
  const [aberto, setAberto] = useState(false);

  if (blocos.length === 0) return null;

  const evangelho = blocos.find((b) => b.tipo === "evangelho") ?? blocos[0]!;
  const primeiras = evangelho.linhas.slice(0, LINHAS_A_VISTA);
  const temMais = blocos.length > 1 || evangelho.linhas.length > primeiras.length;

  return (
    <div className="mt-3 border-t border-border pt-3">
      {aberto ? (
        <div className="flex flex-col gap-4">
          {blocos.map((bloco, i) => (
            <Bloco key={i} bloco={bloco} />
          ))}
        </div>
      ) : (
        <div>
          {evangelho.citacao && (
            <p className="mb-1.5 text-[12.5px] font-medium uppercase tracking-[0.06em] text-primary">
              {evangelho.citacao}
            </p>
          )}
          <Versos linhas={primeiras} />
        </div>
      )}

      {temMais && (
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          aria-expanded={aberto}
          className="alvo-de-toque mt-2.5 flex w-full items-center gap-2 text-left text-[13.5px] font-medium text-primary transition-colors hover:text-primary-hover"
        >
          {aberto ? "Fechar as leituras" : "Ler as leituras de hoje"}
          <ChevronDown
            className={`ml-auto h-4 w-4 shrink-0 transition-transform ${aberto ? "rotate-180" : ""}`}
            strokeWidth={1.5}
            aria-hidden
          />
        </button>
      )}
    </div>
  );
}
