/**
 * Arco/portal com o caminho dourado — desenho de assinatura da marca.
 * Fica atrás de superfícies com o gradiente litúrgico (hero, capa), sempre
 * decorativo: nunca carrega informação, por isso `aria-hidden`.
 */
export function Arch({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 400 240"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      aria-hidden
    >
      {/* Dois arcos concêntricos — o portal da igreja, abstraído. */}
      <path d="M60 240V120a140 140 0 0 1 280 0v120" stroke="rgb(255 255 255 / 0.16)" strokeWidth="1" />
      <path d="M110 240V132a90 90 0 0 1 180 0v108" stroke="rgb(255 255 255 / 0.10)" strokeWidth="1" />
      {/* O caminho dourado atravessando o portal. */}
      <path
        d="M-20 214c90 0 120-46 210-46s150-40 230-40"
        stroke="rgb(var(--color-gold))"
        strokeWidth="1.2"
        strokeOpacity="0.55"
      />
      {/* A luz no alto do arco. */}
      <circle cx="200" cy="72" r="2.6" fill="rgb(var(--color-gold))" fillOpacity="0.8" />
    </svg>
  );
}
