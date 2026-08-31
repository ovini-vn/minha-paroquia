import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Symbol } from "@/components/brand/Symbol";
import { getSessionContext } from "@/server/auth/session";
import { atributoDoTempo } from "@/lib/liturgical-season";

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

  return (
    <div className="min-h-dvh bg-sunken" data-season={atributoDoTempo(session?.themePreference)}>
      <header className="sticky top-0 z-40 bg-wash px-5 py-3.5 text-white after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-gold after:to-transparent after:opacity-80">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <Symbol className="h-9 w-auto shrink-0 text-white" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-serif text-[19px] font-semibold leading-tight">
              Painel da Paróquia
            </p>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-eyebrow text-gold-soft">
              Gestão da comunidade
            </p>
          </div>
          <Link
            href="/inicio"
            className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-medium transition-colors hover:bg-white/15"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} aria-hidden />
            Voltar ao app
          </Link>
        </div>
      </header>
      <main id="conteudo" tabIndex={-1} className="mx-auto max-w-3xl animate-enter px-5 py-6">{children}</main>
    </div>
  );
}
