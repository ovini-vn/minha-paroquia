/**
 * Abrir o APP da rede social, e não uma aba dentro do nosso.
 *
 * Instalado como PWA, um link comum abre num navegador embutido: a pessoa
 * cai numa versão deslogada do Instagram e teria que entrar de novo só para
 * seguir a paróquia. O caminho para o app nativo é um esquema próprio, que
 * o navegador sozinho nunca usa.
 */

export type Rede = "instagram" | "facebook";
export type Plataforma = "android" | "ios" | "outra";

/** O @ da página, que é o que os esquemas nativos pedem. */
export function usuarioDe(url: string): string | null {
  try {
    const caminho = new URL(url).pathname.replace(/^\/+|\/+$/g, "");
    const primeiro = caminho.split("/")[0] ?? "";
    return /^[A-Za-z0-9._-]{1,40}$/.test(primeiro) ? primeiro : null;
  } catch {
    return null;
  }
}

const PACOTE_ANDROID: Record<Rede, string> = {
  instagram: "com.instagram.android",
  facebook: "com.facebook.katana",
};

export type DestinoNativo =
  /** O Android resolve sozinho: sem o app instalado, ele mesmo vai para a web. */
  | { tipo: "intent"; href: string }
  /** O iOS não tem rede de segurança — quem chama precisa cuidar do plano B. */
  | { tipo: "esquema"; href: string }
  /** Sem caminho nativo confiável: segue o link normal. */
  | null;

/**
 * Para onde mandar o toque, por plataforma.
 *
 * O Facebook no iOS fica de fora de propósito: o esquema dele pede o ID
 * numérico da página, que não dá para deduzir do endereço, e chutar renderia
 * um alerta de "não foi possível abrir a página" — pior que o navegador.
 */
export function destinoNativo(rede: Rede, url: string, plataforma: Plataforma): DestinoNativo {
  const usuario = usuarioDe(url);
  if (!usuario || plataforma === "outra") return null;

  if (plataforma === "android") {
    const alvo = rede === "instagram" ? `instagram.com/_u/${usuario}` : `facebook.com/${usuario}`;
    return {
      tipo: "intent",
      href:
        `intent://${alvo}#Intent;package=${PACOTE_ANDROID[rede]};scheme=https;` +
        `S.browser_fallback_url=${encodeURIComponent(url)};end`,
    };
  }

  if (rede !== "instagram") return null;
  return { tipo: "esquema", href: `instagram://user?username=${usuario}` };
}

export function plataformaDoNavegador(userAgent: string): Plataforma {
  if (/Android/i.test(userAgent)) return "android";
  if (/iPad|iPhone|iPod/i.test(userAgent)) return "ios";
  return "outra";
}
