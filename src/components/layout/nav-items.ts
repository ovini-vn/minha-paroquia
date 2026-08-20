import { Home, Church, HandHeart, HeartHandshake, User, type LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Rotas que também acendem este destino (seções que vivem sob ele). */
  alsoMatches?: string[];
};

/**
 * Destinos principais — compartilhados pela TabBar (mobile) e pelo Rail
 * (desktop), para que as duas navegações nunca saiam de sincronia.
 *
 * A ordem espelha a tríade da marca: Oração = caminhar, Comunidade =
 * pertencer, Servir = servir. Início e Eu são a moldura.
 */
export const NAV_ITEMS: NavItem[] = [
  { href: "/inicio", label: "Início", icon: Home, alsoMatches: ["/agenda"] },
  { href: "/comunidade", label: "Comunidade", icon: Church },
  // Minha Caminhada vive sob Oração: é o registro da vida espiritual.
  { href: "/oracao", label: "Oração", icon: HandHeart, alsoMatches: ["/caminhada"] },
  { href: "/servir", label: "Servir", icon: HeartHandshake },
  { href: "/eu", label: "Eu", icon: User },
];

/** Uma rota interna (ex.: /oracao/pedidos) mantém aceso o destino raiz. */
export function isNavItemActive(pathname: string, item: NavItem): boolean {
  const matches = [item.href, ...(item.alsoMatches ?? [])];
  return matches.some((base) => pathname === base || pathname.startsWith(`${base}/`));
}
