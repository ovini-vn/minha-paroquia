import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Symbol } from "@/components/brand/Symbol";
import { getSessionContext } from "@/server/auth/session";
import { podeAlcancar } from "@/server/auth/guards";
import { atributoDoTempo } from "@/lib/liturgical-season";
import { PainelNav } from "@/components/layout/PainelNav";
import { ITENS_DO_PAINEL } from "@/components/layout/painel-items";

/**
 * O painel usa a MESMA atmosfera do app.
 *
 * Antes não usava: quem escolheu "cor do Tempo Litúrgico" via o app verde
 * no Tempo Comum e o painel violeta, e a cor trocava ao entrar na gestão —
 * sem ninguém ter pedido. O painel não é outro produto; é a mesma paróquia
 * vista por quem cuida dela.
 *
 * A regra do atributo vem de `atributoDoTempo`, compartilhada com o layout
 * do fiel. Foi por ela NÃO estar num lugar só que as duas divergiram.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionContext();

  /*
   * A barra mostra só o que esta pessoa pode abrir.
   *
   * O filtro é o MESMO do índice — as duas listas saem de
   * `ITENS_DO_PAINEL`. Um destino oferecido e recusado ao clicar é pior do
   * que destino nenhum: manda a pessoa procurar defeito onde há regra.
   */
  const itensDoPainel = session
    ? ITENS_DO_PAINEL.filter((item) => !item.permissao || podeAlcancar(session, item.permissao))
    : [];

  return (
    <div className="min-h-dvh bg-sunken" data-season={atributoDoTempo(session?.themePreference)}>
      <header className="sticky top-0 z-40 bg-wash px-5 py-3.5 text-white after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-gold after:to-transparent after:opacity-80">
        <div className="mx-auto flex max-w-3xl items-center gap-3 lg:max-w-6xl">
          <Symbol className="h-9 w-auto shrink-0 text-white" />
          {/*
            O título é o caminho de volta ao índice.

            De uma tela de dentro só havia "Voltar ao app" — que sai da
            gestão inteira. Quem queria outra área do painel não tinha para
            onde ir senão pelo navegador.
          */}
          <Link href="/painel" className="min-w-0 flex-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold">
            <p className="truncate font-serif text-[19px] font-semibold leading-tight">
              Painel da Paróquia
            </p>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-eyebrow text-gold-soft">
              Gestão da comunidade
            </p>
          </Link>
          <Link
            href="/inicio"
            className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-medium transition-colors hover:bg-white/15"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} aria-hidden />
            Voltar ao app
          </Link>
        </div>
      </header>
      {/*
        Mesma largura do app no computador.

        O painel ficava em 768px enquanto o app do fiel usa 1152px — a
        mesma paróquia com duas medidas, e a gestão espremida numa fita
        justamente onde há mais tabela e mais lista para ler.
      */}
      <div className="mx-auto flex max-w-3xl gap-8 px-5 py-6 lg:max-w-6xl lg:px-8 lg:py-9">
        {/* Irmã do conteúdo, e não dentro dele: `main` é a tela, a barra é
            navegação — e o salto "pular para o conteúdo" precisa cair
            depois dela, não em cima dela. */}
        <PainelNav permitidos={itensDoPainel.map((item) => item.href)} />
        <main id="conteudo" tabIndex={-1} className="min-w-0 flex-1 animate-enter">
          {children}
        </main>
      </div>
    </div>
  );
}
