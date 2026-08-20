import { Mark } from "@/components/brand/Mark";
import { Arch } from "@/components/brand/Arch";

/**
 * Porta de entrada do app (login, cadastro, convite, recuperação de senha).
 * É a primeira impressão da marca, então recebe o tratamento completo:
 * gradiente litúrgico, portal e a tríade da identidade.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-sunken">
      <div className="relative overflow-hidden bg-wash px-6 pb-16 pt-14 text-center text-white">
        <Arch className="pointer-events-none absolute inset-0 h-full w-full opacity-50" />
        <div className="relative flex flex-col items-center">
          <Mark className="h-12 w-12 text-white" />
          <p className="mt-4 font-serif text-[34px] font-medium leading-none">Minha Paróquia</p>
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
