import Link from "next/link";
import { Symbol } from "@/components/brand/Symbol";
import { NAV_ITEMS } from "./nav-items";

/**
 * Rodapé — só no desktop. No celular o rodapé da tela é a TabBar fixa, e
 * um segundo rodapé ali embaixo só empurraria conteúdo para trás dela.
 *
 * Rodapé é parte do que faz algo parecer site: fecha a página em vez de
 * deixar o conteúdo simplesmente terminar.
 */
export function SiteFooter({
  parishName,
  city,
  address,
  phone,
}: {
  parishName: string;
  city?: string | null;
  address?: string | null;
  phone?: string | null;
}) {
  const contato = [address, phone].filter(Boolean).join(" · ");

  return (
    <footer className="mt-16 hidden border-t border-border bg-surface lg:block">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-8 py-10 sm:grid-cols-[1.5fr_1fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <Symbol className="h-9 w-auto text-primary" />
            <div>
              <p className="font-serif text-lg font-semibold leading-none text-foreground">
                Minha Paróquia
              </p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-gold">
                Caminhar · Pertencer · Servir
              </p>
            </div>
          </div>
          <p className="mt-4 text-[13.5px] font-medium text-foreground">{parishName}</p>
          {city && <p className="text-[12.5px] text-muted">{city}</p>}
          {contato && <p className="mt-0.5 text-[12.5px] text-muted">{contato}</p>}
        </div>

        <nav aria-label="Rodapé">
          <p className="mb-3 text-[10.5px] font-semibold uppercase tracking-eyebrow text-muted">
            Navegar
          </p>
          <ul className="flex flex-col gap-2">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-[13.5px] text-muted transition-colors hover:text-primary"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="rule-gold" />
      <p className="mx-auto w-full max-w-6xl px-8 py-5 text-xs text-muted">
        Minha Paróquia — um lugar digital da sua comunidade.
      </p>
    </footer>
  );
}
