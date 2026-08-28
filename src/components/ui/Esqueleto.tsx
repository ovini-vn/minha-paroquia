/**
 * Bloco cinza que ocupa o lugar do conteúdo enquanto ele vem.
 *
 * Preferido a um "carregando…" centralizado porque não desloca a página:
 * o conteúdo real aparece onde o bloco já estava, em vez de empurrar tudo
 * para baixo no instante em que chega.
 *
 * `animate-pulse` do Tailwind respeita `prefers-reduced-motion` no próprio
 * navegador do usuário.
 */
export function Esqueleto({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-sunken ${className}`} aria-hidden />;
}
