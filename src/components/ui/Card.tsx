import { cn } from "@/lib/cn";
import type { HTMLAttributes } from "react";

/**
 * Superfície elevada, leve — borda sutil e sombra quase imperceptível, nunca
 * "card branco com sombra pesada" (briefing de identidade, seção 7).
 *
 * A sombra é `shadow-sm`, que em `tailwind.config.ts` aponta para o token
 * `--shadow-1` — 2px a 4% de opacidade no claro, o suficiente para o cartão
 * descolar do fundo marfim sem virar caixa flutuante. Ela estava só no
 * comentário até 29/08: o texto prometia sombra e a classe não existia.
 *
 * O token importa por causa do modo escuro. Sombra escrita à mão desaparece
 * sobre fundo escuro; `--shadow-1` é redefinido lá e continua separando as
 * camadas.
 */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-lg border border-border bg-surface p-[18px] shadow-sm", className)}
      {...props}
    />
  );
}
