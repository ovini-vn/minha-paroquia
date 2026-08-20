import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

/**
 * Linha do tempo sobre o caminho dourado — o mesmo "caminho" do emblema,
 * agora como estrutura de leitura. Usado onde há uma jornada em ordem
 * cronológica (Minha Caminhada), não em listas comuns.
 */
export function Path({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "relative pl-7",
        "before:absolute before:bottom-1.5 before:left-[9px] before:top-1.5 before:w-[1.5px]",
        "before:bg-gradient-to-b before:from-gold before:via-gold/45 before:to-transparent",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Um marco do caminho. `filled` marca o que já aconteceu. */
export function PathItem({
  children,
  filled = false,
  className,
}: {
  children: ReactNode;
  filled?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative pb-5 last:pb-0",
        "before:absolute before:-left-[24px] before:top-[5px] before:h-[9px] before:w-[9px]",
        "before:rounded-full before:border-[1.5px] before:border-gold",
        filled ? "before:bg-gold" : "before:bg-background",
        className,
      )}
    >
      {children}
    </div>
  );
}
