/**
 * Marca do app: um arco (portal/vitral, "pertencimento") com uma cruz
 * discreta em luz dourada dentro ("Cristo no centro") — mesma linguagem do
 * favicon (src/app/icon.svg), só sem o fundo, pra usar sobre qualquer tela.
 * Não duplicar esse desenho em outro lugar — só ajustar `className`.
 */
export function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden xmlns="http://www.w3.org/2000/svg">
      <path
        d="M20 46V28C20 18.6112 25.3726 11 32 11C38.6274 11 44 18.6112 44 28V46"
        stroke="currentColor"
        strokeWidth="3.4"
        fill="none"
        strokeLinecap="round"
        className="text-primary"
      />
      <line x1="32" y1="20" x2="32" y2="38" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" className="text-accent" />
      <line x1="25" y1="27" x2="39" y2="27" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" className="text-accent" />
      <line x1="14" y1="46" x2="50" y2="46" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" className="text-primary" />
    </svg>
  );
}
