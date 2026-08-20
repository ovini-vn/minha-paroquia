"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import { Symbol } from "@/components/brand/Symbol";
import { NAV_ITEMS, isNavItemActive } from "./nav-items";

/**
 * Cabeçalho único, responsivo — não são dois componentes com o mesmo
 * conteúdo duplicado no DOM.
 *
 * No celular: a barra do app, com o nome da paróquia e o tempo litúrgico.
 * No desktop (>= lg): vira cabeçalho de SITE — marca à esquerda, navegação
 * horizontal no meio, ações à direita. É o que tira a cara de aplicativo:
 * a navegação sai das abas fixas de baixo e sobe para o topo, em linha.
 */
export function SiteHeader({
  parishName,
  seasonName,
  unreadCount = 0,
}: {
  parishName: string;
  seasonName: string;
  unreadCount?: number;
}) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 bg-wash text-white after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-gold after:to-transparent after:opacity-80">
      <div className="mx-auto flex w-full max-w-[440px] items-center gap-3 px-[18px] pb-3 pt-3.5 lg:max-w-6xl lg:gap-6 lg:px-8 lg:py-4">
        {/* Marca — some no celular (lá o nome da paróquia é o protagonista). */}
        <Link
          href="/inicio"
          className="hidden shrink-0 items-center gap-2.5 lg:flex"
          aria-label="Minha Paróquia — início"
        >
          <Symbol className="h-9 w-auto text-white" />
          <span className="font-serif text-[19px] font-semibold leading-none">Minha Paróquia</span>
        </Link>

        {/* Celular: aparência. Desktop: entra no menu de ações à direita. */}
        <Link
          href="/eu/aparencia"
          className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-full transition-colors hover:bg-white/15 lg:hidden"
          aria-label="Aparência e tempo litúrgico"
        >
          <Sparkles className="h-5 w-5" strokeWidth={1.5} aria-hidden />
        </Link>

        <div className="min-w-0 flex-1 lg:hidden">
          <p className="truncate font-serif text-[19px] font-semibold leading-tight">{parishName}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-eyebrow text-gold-soft">
            <span className="h-[5px] w-[5px] rounded-full bg-gold" aria-hidden />
            {seasonName}
          </p>
        </div>

        {/* Navegação horizontal — só no desktop; no celular é a TabBar. */}
        <nav className="hidden flex-1 items-center gap-1 lg:flex" aria-label="Navegação principal">
          {NAV_ITEMS.map((item) => {
            const active = isNavItemActive(pathname, item);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative rounded-full px-3.5 py-2 text-sm transition-colors",
                  active ? "bg-white/15 font-semibold" : "font-medium text-white/80 hover:bg-white/10",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden min-w-0 items-center gap-3 lg:flex">
          <div className="min-w-0 text-right">
            <p className="truncate text-[13px] font-medium leading-tight">{parishName}</p>
            <p className="mt-0.5 flex items-center justify-end gap-1.5 text-[10px] font-semibold uppercase tracking-eyebrow text-gold-soft">
              <span className="h-[5px] w-[5px] rounded-full bg-gold" aria-hidden />
              {seasonName}
            </p>
          </div>
          <Link
            href="/eu/aparencia"
            className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-full transition-colors hover:bg-white/15"
            aria-label="Aparência e tempo litúrgico"
          >
            <Sparkles className="h-5 w-5" strokeWidth={1.5} aria-hidden />
          </Link>
        </div>

        <Link
          href="/eu/notificacoes"
          className="relative grid h-[38px] w-[38px] shrink-0 place-items-center rounded-full transition-colors hover:bg-white/15"
          aria-label="Notificações"
        >
          <Bell className="h-5 w-5" strokeWidth={1.5} aria-hidden />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-gold px-1 text-[10px] font-semibold leading-none text-[#3a2a05]">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
