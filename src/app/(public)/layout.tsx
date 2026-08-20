import { Wordmark } from "@/components/brand/Wordmark";
import { Arch } from "@/components/brand/Arch";

/**
 * Porta de entrada do app (login, cadastro, convite, recuperação de senha).
 * É a primeira impressão da marca, então recebe o lockup completo sobre o
 * gradiente litúrgico.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-sunken">
      <div className="relative overflow-hidden bg-wash px-6 pb-16 pt-10 text-center text-white">
        <Arch className="pointer-events-none absolute inset-0 h-full w-full opacity-40" />
        <div className="relative">
          <Wordmark className="text-white" symbolClassName="h-28" />
          <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-gold-soft">
            Caminhar · Pertencer · Servir
          </p>
        </div>
      </div>

      <div className="relative z-[2] -mt-10 flex flex-1 justify-center px-4 pb-10">
        <div className="w-full max-w-sm animate-enter">{children}</div>
      </div>
    </div>
  );
}
