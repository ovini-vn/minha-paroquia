import { Fragment } from "react";
import { analisarTexto, type Trecho } from "@/lib/texto-rico";

/**
 * Exibe um texto longo com a estrutura que ele já tinha.
 *
 * Nada aqui vira HTML: o parser devolve pedaços de texto e o React os
 * escapa. Marcação desconhecida aparece como o texto que é.
 */

function Trechos({ trechos }: { trechos: Trecho[] }) {
  return (
    <>
      {trechos.map((t, i) => {
        if (t.href) {
          return (
            <a
              key={i}
              href={t.href}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all text-primary underline underline-offset-2"
            >
              {t.texto}
            </a>
          );
        }
        return t.forte ? (
          <strong key={i} className="font-semibold text-foreground">
            {t.texto}
          </strong>
        ) : (
          <Fragment key={i}>{t.texto}</Fragment>
        );
      })}
    </>
  );
}

export function TextoRico({ texto }: { texto: string }) {
  const blocos = analisarTexto(texto);

  return (
    <div className="flex flex-col">
      {blocos.map((bloco, i) => {
        if (bloco.tipo === "divisor") {
          return <hr key={i} className="my-5 border-t border-border" />;
        }

        if (bloco.tipo === "titulo") {
          return bloco.nivel === 1 ? (
            <h2
              key={i}
              className="mb-2 mt-7 font-serif text-[21px] font-semibold leading-tight text-foreground first:mt-0"
            >
              <Trechos trechos={bloco.trechos} />
            </h2>
          ) : (
            <h3
              key={i}
              className="mb-1.5 mt-5 font-serif text-[16.5px] font-semibold leading-snug text-foreground first:mt-0"
            >
              <Trechos trechos={bloco.trechos} />
            </h3>
          );
        }

        if (bloco.tipo === "lista") {
          return (
            <ul key={i} className="my-1.5 flex flex-col gap-1 pl-1">
              {bloco.itens.map((item, j) => (
                <li key={j} className="flex gap-2 text-[14.5px] leading-relaxed text-muted">
                  <span className="select-none text-gold" aria-hidden>
                    ·
                  </span>
                  <span>
                    <Trechos trechos={item} />
                  </span>
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={i} className="my-1.5 text-[14.5px] leading-relaxed text-muted">
            {bloco.linhas.map((linha, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                <Trechos trechos={linha} />
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
