"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import { Mark } from "@/components/brand/Mark";
import { NAV_ITEMS, isNavItemActive } from "./nav-items";

/**
 * Navegação lateral do desktop. Existe para que a versão grande não seja
 * só "o app de celular esticado" (briefing, seção 16) — no mobile some e
 * a TabBar assume.
 */
export function Rail({ parishName, city }: { parishName: string; city?: string | null }) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-dvh w-[264px] shrink-0 flex-col border-r border-border bg-surface px-[18px] py-6 lg:flex">
      <div className="flex items-center gap-3 px-2 pb-6">
        <Mark className="h-7 w-7 shrink-0" />
        <div>
          <p className="font-serif text-[19px] font-semibold leading-tight text-foreground">Minha Paróquia</p>
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-gold">
            Caminhar · Pertencer · Servir
          </p>
        </div>
      </div>

      <nav className="flex flex-col gap-0.5">
        {NAV_ITEMS.map((item) => {
          const active = isNavItemActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
                active
                  ? "bg-primary-tint font-semibold text-primary shadow-[inset_2px_0_0_rgb(var(--color-gold))]"
                  : "font-medium text-muted hover:bg-primary-tint hover:text-primary",
              )}
            >
              <Icon className="h-[19px] w-[19px]" strokeWidth={1.5} aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-border pt-4">
        <Link
          href="/eu/aparencia"
          className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-primary-tint hover:text-primary"
        >
          <Sparkles className="h-[19px] w-[19px]" strokeWidth={1.5} aria-hidden />
          Aparência
        </Link>
        <p className="px-3 pt-3 text-xs leading-snug text-muted">
          {parishName}
          {city && (
            <>
              <br />
              {city}
            </>
          )}
        </p>
      </div>
    </aside>
  );
}
