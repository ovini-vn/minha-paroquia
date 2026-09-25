"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Os documentos que a família vai juntando, marcados no próprio celular.
 *
 * Fica no aparelho e só nele: é uma lista de compras, não um registro da
 * paróquia — ninguém na secretaria precisa saber que a certidão já está na
 * gaveta. Se o armazenamento do navegador falhar, a lista continua
 * funcionando, só não lembra.
 */
export function ListaDeDocumentos({ chave, documentos }: { chave: string; documentos: string[] }) {
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const armazenamento = `documentos:${chave}`;

  useEffect(() => {
    try {
      const salvo = window.localStorage.getItem(armazenamento);
      if (salvo) setMarcados(new Set(JSON.parse(salvo) as string[]));
    } catch {
      // Sem armazenamento (aba anônima, bloqueio): segue sem lembrar.
    }
  }, [armazenamento]);

  const alternar = (doc: string) => {
    setMarcados((atual) => {
      const novo = new Set(atual);
      if (novo.has(doc)) novo.delete(doc);
      else novo.add(doc);
      try {
        window.localStorage.setItem(armazenamento, JSON.stringify([...novo]));
      } catch {
        // idem
      }
      return novo;
    });
  };

  const prontos = documentos.filter((d) => marcados.has(d)).length;

  return (
    <div>
      <p className="mb-2 text-[13px] text-muted" aria-live="polite">
        {prontos === documentos.length ? "Tudo reunido." : `${prontos} de ${documentos.length} reunidos`}
      </p>
      <ul className="flex flex-col gap-1">
        {documentos.map((doc) => {
          const feito = marcados.has(doc);
          return (
            <li key={doc}>
              <button
                type="button"
                role="checkbox"
                aria-checked={feito}
                onClick={() => alternar(doc)}
                className="alvo-de-toque flex w-full items-start gap-3 rounded-md px-1 py-2 text-left hover:bg-sunken"
              >
                <span
                  className={cn(
                    "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded border",
                    feito ? "border-primary bg-primary text-white" : "border-border-strong",
                  )}
                  aria-hidden
                >
                  {feito && <Check className="h-3.5 w-3.5" strokeWidth={2.5} />}
                </span>
                <span className={cn("text-[14.5px] leading-snug", feito ? "text-muted line-through" : "text-foreground")}>
                  {doc}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
