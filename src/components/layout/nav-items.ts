import { Home, Church, HandHeart, HeartHandshake, User, type LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

/**
 * Destinos principais — compartilhados pela TabBar (mobile) e pelo Rail
 * (desktop), para que as duas navegações nunca saiam de sincronia.
 */
export const NAV_ITEMS: NavItem[] = [
  { href: "/inicio", label: "Início", icon: Home },
  { href: "/comunidade", label: "Comunidade", icon: Church },
  { href: "/caminhada", label: "Caminhada", icon: HandHeart },
  { href: "/servir", label: "Servir", icon: HeartHandshake },
  { href: "/eu", label: "Eu", icon: User },
];

/** Uma rota interna (ex.: /comunidade/oracao) mantém aceso o destino raiz. */
export function isNavItemActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
