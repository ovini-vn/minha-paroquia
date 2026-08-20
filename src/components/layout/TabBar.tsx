"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Footprints, Church, HeartHandshake, User } from "lucide-react";
import { cn } from "@/lib/cn";

const TABS = [
  { href: "/inicio", label: "Início", icon: Home },
  { href: "/caminhada", label: "Caminhada", icon: Footprints },
  { href: "/comunidade", label: "Comunidade", icon: Church },
  { href: "/servir", label: "Servir", icon: HeartHandshake },
  { href: "/eu", label: "Eu", icon: User },
] as const;

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-surface/95 backdrop-blur">
      <ul className="mx-auto flex max-w-lg justify-between px-2 py-2">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          const Icon = tab.icon;
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-xs transition-colors",
                  active ? "text-primary" : "text-muted",
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2 : 1.5} aria-hidden />
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
