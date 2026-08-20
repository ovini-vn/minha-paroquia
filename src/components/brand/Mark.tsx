import { cn } from "@/lib/cn";

/**
 * Marca do app: o arco (portal/pertencimento) com a cruz dourada no centro
 * — mesma linguagem do favicon (src/app/icon.svg) e do <Arch>.
 *
 * O arco herda a cor do texto do elemento pai (`currentColor`), então a
 * marca funciona tanto sobre marfim quanto sobre o gradiente litúrgico; só
 * a cruz é sempre dourada, porque o dourado é a "luz" fixa da identidade.
 */
export function Mark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn("text-primary", className)}
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
    >
      <path
        d="M20 46V28C20 18.6112 25.3726 11 32 11C38.6274 11 44 18.6112 44 28V46"
        stroke="currentColor"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      <line x1="14" y1="46" x2="50" y2="46" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" />
      <line
        x1="32"
        y1="20"
        x2="32"
        y2="38"
        stroke="rgb(var(--color-gold))"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      <line
        x1="25"
        y1="27"
        x2="39"
        y2="27"
        stroke="rgb(var(--color-gold))"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
