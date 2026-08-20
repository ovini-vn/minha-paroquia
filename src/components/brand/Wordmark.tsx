import { cn } from "@/lib/cn";
import { Symbol } from "./Symbol";

/**
 * Lockup completo: emblema + "MINHA PARÓQUIA".
 *
 * O texto é texto de verdade (Cormorant Garamond, a serif da identidade) e
 * não contorno vetorizado — assim continua nítido em qualquer tamanho,
 * legível por leitor de tela e coerente com a tipografia do resto do app.
 */
export function Wordmark({
  className,
  symbolClassName,
}: {
  className?: string;
  symbolClassName?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center", className)}>
      <Symbol className={cn("h-24 w-auto", symbolClassName)} />

      {/* "MINHA" entre dois filetes dourados com estrela, como no logo. */}
      <div className="mt-4 flex w-full items-center justify-center gap-2.5">
        <span className="rule-gold w-10 max-w-[15%]" />
        <span className="text-[13px] font-medium uppercase tracking-[0.42em] text-gold">
          Minha
        </span>
        <span className="rule-gold w-10 max-w-[15%]" />
      </div>

      <p className="mt-1 font-serif text-[40px] font-semibold uppercase leading-none tracking-[0.02em]">
        Paróquia
      </p>
    </div>
  );
}
