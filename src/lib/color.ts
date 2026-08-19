/**
 * "#RRGGBB" -> "R G B" (componentes separados por espaço). Necessário
 * porque os tokens em tailwind.config.ts usam o formato
 * `rgb(var(--x) / <alpha-value>)` — o único jeito de opacidade (`bg-x/50`)
 * funcionar com cor vinda de CSS custom property (ver globals.css).
 */
export function hexToRgbTriple(hex: string): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `${r} ${g} ${b}`;
}
