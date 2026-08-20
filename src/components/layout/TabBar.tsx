"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { NAV_ITEMS, isNavItemActive } from "./nav-items";

/** Navegação mobile. No desktop dá lugar ao Rail lateral. */
export function TabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 mx-auto grid max-w-[440px] grid-cols-5 border-t border-border bg-surface/95 px-1 pb-[calc(0.375rem+env(safe-area-inset-bottom))] pt-1.5 backdrop-blur lg:hidden"
      aria-label="Navegação principal"
    >
      {NAV_ITEMS.map((item) => {
        const active = isNavItemActive(pathname, item);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex flex-col items-center gap-[3px] rounded-md px-0.5 pb-[5px] pt-[7px] text-[10px] tracking-[0.04em] transition-colors",
              active ? "font-semibold text-primary" : "font-medium text-muted",
            )}
          >
            {/* Traço dourado no topo do destino ativo — a "luz" da marca. */}
            {active && (
              <span className="absolute top-0 h-0.5 w-[18px] rounded-sm bg-gold" aria-hidden />
            )}
            <Icon className="h-[21px] w-[21px]" strokeWidth={active ? 2 : 1.5} aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
