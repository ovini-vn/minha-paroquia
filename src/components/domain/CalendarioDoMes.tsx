import type { CategoriaDaAgenda } from "@prisma/client";
import { CATEGORIAS } from "@/lib/agenda-categorias";

export type DiaDoCalendario = {
  /** "2026-09-04" */
  chave: string;
  dia: number;
  categorias: CategoriaDaAgenda[];
  quantos: number;
};

/**
 * A grade do mês, com um ponto colorido por compromisso.
 *
 * PONTOS, e não o nome do compromisso dentro da célula: numa tela de 375px
 * cada dia tem cerca de 48px de largura, e um título ali sairia com duas
 * letras por linha. O ponto responde à pergunta que a grade responde bem —
 * "tem coisa neste dia, e de que tipo?" —, e o nome fica na lista abaixo,
 * onde há largura para ele.
 *
 * Cada dia é um link para a sua âncora na lista. É o que liga as duas
 * visões: a grade mostra a forma do mês, a lista mostra o conteúdo, e um
 * toque vai de uma à outra.
 */
export function CalendarioDoMes({
  ano,
  mes,
  dias,
}: {
  ano: number;
  /** 1 a 12. */
  mes: number;
  dias: DiaDoCalendario[];
}) {
  const porChave = new Map(dias.map((d) => [d.chave, d]));

  // Segunda a domingo, como se lê um calendário de parede no Brasil? Não:
  // domingo primeiro, que é como a Igreja conta a semana — e como todo
  // calendário paroquial impresso é diagramado.
  const primeiro = new Date(Date.UTC(ano, mes - 1, 1));
  const vazios = primeiro.getUTCDay();
  const totalDeDias = new Date(Date.UTC(ano, mes, 0)).getUTCDate();

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {["D", "S", "T", "Q", "Q", "S", "S"].map((letra, i) => (
          <span
            key={i}
            className="pb-1 text-[11px] font-semibold uppercase tracking-eyebrow text-muted"
          >
            {letra}
          </span>
        ))}

        {Array.from({ length: vazios }, (_, i) => (
          <span key={`vazio-${i}`} aria-hidden />
        ))}

        {Array.from({ length: totalDeDias }, (_, i) => {
          const dia = i + 1;
          const chave = `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
          const doDia = porChave.get(chave);

          const miolo = (
            <>
              <span className="text-[13px] leading-none text-foreground">{dia}</span>
              <span className="flex h-[7px] items-center justify-center gap-[3px]">
                {/*
                  Até três pontos. Um dia com oito compromissos viraria uma
                  faixa de cor sem informação; três já dizem "tem bastante, e
                  de tipos diferentes", e o número exato está na lista.
                */}
                {(doDia?.categorias ?? []).slice(0, 3).map((cat, j) => (
                  <span
                    key={j}
                    className="h-[5px] w-[5px] rounded-full"
                    style={{ backgroundColor: `rgb(var(--cat-${CATEGORIAS[cat].token}))` }}
                  />
                ))}
              </span>
            </>
          );

          return doDia ? (
            <a
              key={dia}
              href={`#dia-${chave}`}
              aria-label={`${dia}: ${doDia.quantos} ${doDia.quantos === 1 ? "compromisso" : "compromissos"}`}
              className="flex aspect-square flex-col items-center justify-center gap-1 rounded-md border border-border bg-surface transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {miolo}
            </a>
          ) : (
            <span
              key={dia}
              className="flex aspect-square flex-col items-center justify-center gap-1 rounded-md text-muted"
            >
              {miolo}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/** A legenda: sem ela a cor é enfeite. */
export function LegendaDaAgenda({ categorias }: { categorias: CategoriaDaAgenda[] }) {
  if (categorias.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-x-3.5 gap-y-1.5">
      {categorias.map((cat) => (
        <li key={cat} className="flex items-center gap-1.5">
          <span
            className="h-[7px] w-[7px] shrink-0 rounded-full"
            style={{ backgroundColor: `rgb(var(--cat-${CATEGORIAS[cat].token}))` }}
            aria-hidden
          />
          <span className="text-[12px] text-muted">{CATEGORIAS[cat].rotulo}</span>
        </li>
      ))}
    </ul>
  );
}
