/**
 * Duas mãos em oração — o botão que passa para a próxima conta.
 *
 * Desenhado aqui porque a biblioteca de ícones do app não tem esse gesto.
 * Segue o mesmo traço dos outros ícones (linha, pontas arredondadas), para
 * não parecer figurinha colada no meio da interface.
 *
 * A primeira versão era só a silhueta das palmas unidas, com os punhos
 * retos embaixo, e lida pequena parecia a ponta de uma caneta. O que faz o
 * gesto ser reconhecido são os ANTEBRAÇOS abrindo em V e os polegares —
 * é assim que o 🙏 se lê de longe.
 */
export function MaosEmOracao({ className, strokeWidth = 1.5 }: { className?: string; strokeWidth?: number }) {
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
      {/* as duas mãos, das pontas dos dedos aos punhos */}
      <path d="M12 2.4C10.5 3.1 9.5 5.2 9.1 7.3L7.9 11.9C7.5 13.5 7.7 14.9 8.6 16.1L9.4 17" />
      <path d="M12 2.4C13.5 3.1 14.5 5.2 14.9 7.3L16.1 11.9C16.5 13.5 16.3 14.9 15.4 16.1L14.6 17" />
      <path d="M12 2.4V17" />
      {/* polegares, deitados sobre as palmas — curvados para o centro, e não
          para fora: para fora pareciam uma âncora */}
      <path d="M8.6 13.6C9.3 12.2 10.5 11.3 12 11" />
      <path d="M15.4 13.6C14.7 12.2 13.5 11.3 12 11" />
      {/* antebraços abrindo em V, com a manga */}
      <path d="M9.4 17L5.6 21.4" />
      <path d="M12 17L8.8 21.6" />
      <path d="M5.6 21.4L8.8 21.6" />
      <path d="M14.6 17L18.4 21.4" />
      <path d="M12 17L15.2 21.6" />
      <path d="M18.4 21.4L15.2 21.6" />
    </svg>
  );
}
