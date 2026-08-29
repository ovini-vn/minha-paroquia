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
        <div className="relative flex flex-col items-center">
          <Wordmark className="h-40 w-auto text-white" />
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-gold-soft">
            Caminhar · Pertencer · Servir
          </p>
        </div>
      </div>

      <main
        id="conteudo"
        tabIndex={-1}
        className="relative z-[2] -mt-10 flex flex-1 justify-center px-4 pb-10 outline-none"
      >
        <div className="w-full max-w-sm animate-enter">{children}</div>
      </main>

      {/*
        Rodapé da área pública. Resolve duas coisas de uma vez: dá acesso à
        política de privacidade a quem AINDA NÃO tem conta — antes ela só
        aparecia dentro do formulário de login —, e fecha o vazio que sobrava
        embaixo do cartão nas telas largas.
      */}
      <footer className="px-6 pb-8 text-center">
        {/*
          "Como funciona" antes da política, de propósito: quem chega por um
          link compartilhado quer saber no que está entrando, e a tela de
          entrada só comporta uma linha sobre isso.

          São âncoras, e não <Link>: as duas páginas ficam FORA deste grupo de
          rotas, com layout próprio. Navegar por dentro do roteador traria o
          cabeçalho da marca junto, e a política ganharia o lockup completo em
          cima do texto jurídico.
        */}
        <p className="flex items-center justify-center gap-2.5 text-[12px] leading-relaxed text-muted">
          <a href="/como-funciona" className="underline underline-offset-2 hover:text-primary">
            Como funciona
          </a>
          <span aria-hidden className="text-gold">
            ·
          </span>
          <a href="/privacidade" className="underline underline-offset-2 hover:text-primary">
            Política de Privacidade
          </a>
        </p>
        <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-muted">
          Minha Paróquia
        </p>
      </footer>
    </div>
  );
}
