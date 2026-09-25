import Link from "next/link";
import { Check, ChevronRight } from "lucide-react";
import type { ItemDaImplantacao } from "@/server/modules/implantacao/service";
import { cn } from "@/lib/cn";

/**
 * "O que falta configurar", no alto do painel de uma paróquia nova.
 *
 * Some sozinha quando tudo está feito: numa paróquia pronta, uma lista
 * toda marcada seria só ruído no caminho de quem veio publicar um aviso.
 */
export function ListaDaImplantacao({ itens }: { itens: ItemDaImplantacao[] }) {
  const feitos = itens.filter((i) => i.feito).length;
  if (feitos === itens.length) return null;

  return (
    <section className="rounded-lg border border-gold/45 bg-gradient-to-b from-gold/[0.07] to-transparent p-[18px]">
      <p className="text-[11px] font-semibold uppercase tracking-eyebrow text-[#8a6b24] dark:text-gold">
        Para a paróquia ganhar vida · {feitos} de {itens.length}
      </p>
      <p className="mt-1.5 font-serif text-[21px] font-semibold leading-tight text-foreground">
        O que falta configurar
      </p>
      <ul className="mt-3 flex flex-col">
        {itens.map((item) => (
          <li key={item.chave} className="border-b border-gold/25 last:border-b-0">
            <Link
              href={item.href}
              className="alvo-de-toque flex items-center gap-3 py-2.5 transition-colors hover:text-primary"
            >
              <span
                className={cn(
                  "grid h-6 w-6 shrink-0 place-items-center rounded-full border",
                  item.feito ? "border-success bg-success text-white" : "border-border-strong",
                )}
                aria-hidden
              >
                {item.feito && <Check className="h-3.5 w-3.5" strokeWidth={2.5} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn("block text-[14.5px] font-medium", item.feito ? "text-muted line-through" : "text-foreground")}>
                  {item.titulo}
                  <span className="sr-only">{item.feito ? " — feito" : " — pendente"}</span>
                </span>
                {!item.feito && <span className="block text-[12.5px] text-muted">{item.porQue}</span>}
              </span>
              {!item.feito && <ChevronRight className="h-4 w-4 shrink-0 text-border-strong" strokeWidth={1.5} aria-hidden />}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
