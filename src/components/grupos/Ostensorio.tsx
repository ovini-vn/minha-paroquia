/**
 * O ostensório — para o retiro da Eucaristia, a adoração.
 *
 * Desenhado aqui porque a biblioteca de ícones do app não tem nada da
 * Eucaristia. Segue o traço dos outros ícones (linha, pontas arredondadas),
 * como as mãos em oração do terço (ver MaosEmOracao).
 *
 * O que faz o ostensório ser lido pequeno são os RAIOS em volta da hóstia:
 * sem eles, o círculo sobre a haste vira um pirulito. A cruz no alto
 * desempata com um relógio de parede.
 */
export function Ostensorio({
  className,
  strokeWidth = 1.5,
}: {
  className?: string;
  strokeWidth?: number;
  /** Aceito para caber onde vão os ícones da biblioteca; o desenho é sempre decorativo. */
  "aria-hidden"?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {/* a cruz no alto */}
      <path d="M12 1.2V3.6" />
      <path d="M10.9 2.3H13.1" />
      {/* a hóstia */}
      <circle cx="12" cy="9" r="2.6" />
      {/* os raios */}
      <path d="M12 4.6V5.4" />
      <path d="M12 12.6V13.4" />
      <path d="M7.6 9H8.4" />
      <path d="M15.6 9H16.4" />
      <path d="M8.9 5.9L9.5 6.5" />
      <path d="M14.5 11.5L15.1 12.1" />
      <path d="M15.1 5.9L14.5 6.5" />
      <path d="M9.5 11.5L8.9 12.1" />
      {/* a haste, o nó e a base */}
      <path d="M12 13.4V19" />
      <path d="M10.8 16.2H13.2" />
      <path d="M8.2 21.6C8.6 20 10 19 12 19C14 19 15.4 20 15.8 21.6Z" />
    </svg>
  );
}
