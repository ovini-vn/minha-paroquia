/**
 * Um terço pequeno — cruz e contas — no traço dos outros ícones do app.
 * A biblioteca de ícones não tem terço, e um coração ou uma estrela no lugar
 * não diria o que o botão abre.
 */
export function IconeDoTerco({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <circle cx="12" cy="3.6" r="1.6" />
      <circle cx="17.2" cy="5.6" r="1.6" />
      <circle cx="19.4" cy="10.6" r="1.6" />
      <circle cx="6.8" cy="5.6" r="1.6" />
      <circle cx="4.6" cy="10.6" r="1.6" />
      <path d="M6 12.2C7.2 13.8 9.4 14.6 12 14.6S16.8 13.8 18 12.2" />
      <path d="M12 14.6V22M9.5 17.4H14.5" />
    </svg>
  );
}
