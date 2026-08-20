import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

/**
 * Cancela o padding do <main> para um bloco sangrar até a borda da tela —
 * usado pelo hero e pelas capas, que precisam do gradiente encostando nas
 * laterais. Mantém o padding num só lugar (o layout) em vez de espalhar.
 */
export function Bleed({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("-mx-[18px]", className)}>{children}</div>;
}

/** Variante que também sobe até encostar na topbar. */
export function BleedTop({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("-mx-[18px] -mt-6", className)}>{children}</div>;
}
