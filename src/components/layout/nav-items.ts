import { Home, Church, BookOpen, HeartHandshake, User, type LucideIcon } from "lucide-react";

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
 * A ordem espelha a tríade da marca: Palavra = caminhar, Comunidade =
 * pertencer, Servir = servir. Início e Eu são a moldura.
 */
export const NAV_ITEMS: NavItem[] = [
  { href: "/inicio", label: "Início", icon: Home, alsoMatches: ["/agenda"] },
  { href: "/comunidade", label: "Comunidade", icon: Church },
  // Minha Caminhada e a Bíblia vivem sob Palavra. O ENDEREÇO continua
  // /oracao de propósito: notificações já gravadas apontam para ele, e
  // trocar a rota quebraria os avisos que estão no aparelho das pessoas.
  { href: "/oracao", label: "Palavra", icon: BookOpen, alsoMatches: ["/caminhada", "/biblia"] },
  { href: "/servir", label: "Servir", icon: HeartHandshake },
  { href: "/eu", label: "Eu", icon: User },
];

/** Uma rota interna (ex.: /oracao/pedidos) mantém aceso o destino raiz. */
export function isNavItemActive(pathname: string, item: NavItem): boolean {
  const matches = [item.href, ...(item.alsoMatches ?? [])];
  return matches.some((base) => pathname === base || pathname.startsWith(`${base}/`));
}
