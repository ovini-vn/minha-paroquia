import { cn } from "@/lib/cn";
import { EMBLEM_VIEWBOX, EMBLEM_VIOLET_PATH, EMBLEM_GOLD_PATH } from "./logo-paths";

/**
 * Emblema do MINHA PARÓQUIA — o traçado oficial da marca.
 *
 * Os cinco conceitos, de cima para baixo: a estrela (luz), o portal
 * (pertencimento), a cruz (Cristo), as figuras reunidas (comunidade) e as
 * mãos com o caminho dourado (serviço e caminhada).
 *
 * O violeta usa `currentColor`: quem usa PRECISA definir a cor
 * (`text-primary` sobre marfim, `text-white` sobre o gradiente litúrgico).
 * Só o dourado é fixo — é a "luz" imutável da identidade.
 */
export function Symbol({ className }: { className?: string }) {
  return (
    <svg
      viewBox={EMBLEM_VIEWBOX}
      className={cn(className)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path d={EMBLEM_VIOLET_PATH} fill="currentColor" />
      <path d={EMBLEM_GOLD_PATH} fill="rgb(var(--color-gold))" />
    </svg>
  );
}
