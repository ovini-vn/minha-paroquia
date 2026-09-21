import { Eye } from "lucide-react";
import { sairDoFocoAction } from "@/server/actions/diocese-actions";

/**
 * A tarja de quem está olhando outra paróquia pela plataforma.
 *
 * Existe para que ninguém administre a paróquia errada sem perceber. É o
 * mesmo risco que o app já trata no resto: a tela diz sempre de quem é o
 * dado que está na frente da pessoa.
 *
 * Fica no topo do painel E do app do fiel, porque o foco vale para os dois
 * — quem prepara uma paróquia precisa ver como ela ficou para quem chega.
 */
export function TarjaDoFoco({ parishName }: { parishName: string }) {
  return (
    <div className="bg-gold/20 px-5 py-2 text-[#5d4710] dark:bg-gold/15 dark:text-gold">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-2 gap-y-1 text-[13px] lg:max-w-6xl">
        <Eye className="h-4 w-4 shrink-0" strokeWidth={1.7} aria-hidden />
        <span>
          Você está vendo a <strong className="font-semibold">{parishName}</strong> pela administração
          da plataforma. Seu vínculo continua na sua paróquia.
        </span>
        <form action={sairDoFocoAction} className="ml-auto">
          <button
            type="submit"
            className="alvo-de-toque rounded-full border border-current/40 px-3 py-1 text-[12.5px] font-semibold transition-colors hover:bg-white/30"
          >
            Sair desta paróquia
          </button>
        </form>
      </div>
    </div>
  );
}
