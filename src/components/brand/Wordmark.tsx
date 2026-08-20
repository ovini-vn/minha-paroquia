import { cn } from "@/lib/cn";
import {
  LOCKUP_VIEWBOX,
  EMBLEM_VIOLET_PATH,
  EMBLEM_GOLD_PATH,
  MINHA_GOLD_PATH,
  PAROQUIA_VIOLET_PATH,
} from "./logo-paths";

/**
 * Lockup completo: emblema + "MINHA PARÓQUIA", no traçado oficial.
 *
 * O texto é contorno vetorial (não fonte), então não depende de nenhuma
 * fonte instalada e serve também para impressão. Como não é texto de
 * verdade, o SVG leva `role="img"` + `<title>` para leitores de tela.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <svg
      viewBox={LOCKUP_VIEWBOX}
      className={cn(className)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Minha Paróquia"
    >
      <title>Minha Paróquia</title>
      <path d={EMBLEM_VIOLET_PATH} fill="currentColor" />
      <path d={EMBLEM_GOLD_PATH} fill="rgb(var(--color-gold))" />
      <path d={MINHA_GOLD_PATH} fill="rgb(var(--color-gold))" />
      <path d={PAROQUIA_VIOLET_PATH} fill="currentColor" />
    </svg>
  );
}
