"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const TABS = [
  { href: "/inicio", label: "Início", icon: "🏠" },
  { href: "/caminhada", label: "Caminhada", icon: "🙏" },
  { href: "/comunidade", label: "Comunidade", icon: "⛪" },
  { href: "/servir", label: "Servir", icon: "❤️" },
  { href: "/eu", label: "Eu", icon: "👤" },
] as const;

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-terracotta-100 bg-cream-50/95 backdrop-blur">
      <ul className="mx-auto flex max-w-lg justify-between px-2 py-2">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-xs transition-colors",
                  active ? "text-terracotta-700" : "text-ink-700/60",
                )}
              >
                <span className="text-xl" aria-hidden>
                  {tab.icon}
                </span>
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
