import { cn } from "@/lib/cn";
import type { HTMLAttributes } from "react";

/**
 * Superfície elevada, leve — borda sutil e sombra quase imperceptível, nunca
 * "card branco com sombra pesada" (briefing de identidade, seção 7).
 */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-lg border border-border bg-surface p-[18px]", className)}
      {...props}
    />
  );
}
