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
  // Minha Caminhada, a Bíblia, Rezar e o Catecismo vivem sob Palavra. O ENDEREÇO continua
  // /oracao de propósito: notificações já gravadas apontam para ele, e
  // trocar a rota quebraria os avisos que estão no aparelho das pessoas.
  { href: "/oracao", label: "Palavra", icon: BookOpen, alsoMatches: ["/caminhada", "/biblia", "/rezar", "/catecismo"] },
  { href: "/servir", label: "Servir", icon: HeartHandshake },
  { href: "/eu", label: "Eu", icon: User },
];

/** Uma rota interna (ex.: /oracao/pedidos) mantém aceso o destino raiz. */
export function isNavItemActive(pathname: string, item: NavItem): boolean {
  const matches = [item.href, ...(item.alsoMatches ?? [])];
  return matches.some((base) => pathname === base || pathname.startsWith(`${base}/`));
}

/**
 * Sob qual destino da barra mora este caminho — para a bolinha da trilha.
 *
 * Quando uma dica chega, a barra ganha um ponto no destino que leva até a
 * funcionalidade. Ele existe para transformar a dica em CAMINHO: sem isso,
 * a pessoa lê "dá para registrar seu batismo", concorda, e não faz ideia de
 * onde fica.
 *
 * Reusa `isNavItemActive` de propósito. A pergunta "esta rota vive sob este
 * destino?" é a mesma que a barra já responde para se acender, e duas
 * respostas diferentes para a mesma pergunta é como o ponto apareceria num
 * destino e a tela abriria noutro.
 *
 * O padrão é o Início porque é lá que moram os atalhos de Ofertar, Contato
 * e Plano — telas que não vivem sob nenhum dos cinco destinos. Mandar para
 * o Início é verdade: é de lá que se chega a elas.
 */
export function destinoDoCaminho(linkPath: string): string {
  return NAV_ITEMS.find((item) => isNavItemActive(linkPath, item))?.href ?? "/inicio";
}
