import { cn } from "@/lib/cn";

/**
 * Versão compacta do emblema, para tamanhos pequenos (favicon, rail, topo
 * do painel). Mantém só o que ainda se lê a ~24px: estrela, portal, cruz e
 * o caminho dourado — as sete figuras e as mãos do <Symbol> viram borrão
 * nesse tamanho, por isso ficam de fora de propósito.
 *
 * Igual ao <Symbol>: violeta herda `currentColor` (quem usa define a cor),
 * dourado é fixo.
 */
export function Mark({ className }: { className?: string }) {
  const gold = "rgb(var(--color-gold))";

  return (
    <svg
      viewBox="0 0 64 64"
      className={cn(className)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {/* Estrela */}
      <path d="M32 2 Q33.5 9.5 41 11 Q33.5 12.5 32 20 Q30.5 12.5 23 11 Q30.5 9.5 32 2 Z" fill={gold} />

      {/* Portal */}
      <path
        d="M11 58 V32 A21 21 0 0 1 53 32 V58"
        stroke="currentColor"
        strokeWidth="4.5"
        strokeLinecap="round"
      />

      {/* Cruz */}
      <path d="M30.4 22 h3.2 v7 h7 v3.2 h-7 v16 h-3.2 v-16 h-7 V29 h7 z" fill={gold} />

      {/* Caminho */}
      <path
        d="M29.5 48 C28.5 52 32 54 32.5 57.5 L38 57.5 C37 53.5 33 51.5 33.5 48 Z"
        fill={gold}
      />
    </svg>
  );
}
