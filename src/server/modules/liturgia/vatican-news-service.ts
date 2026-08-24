import "server-only";

/**
 * "Palavra do dia" do Vatican News — o Evangelho do dia em áudio.
 *
 * LIMITE DELIBERADO: o feed traz o texto completo das leituras, e ele vem
 * marcado "© Dicasterium pro Communicatione". Guardamos e exibimos apenas
 * TÍTULO, DATA, ÁUDIO e LINK, com crédito — que é exatamente o uso para o
 * qual um feed RSS com <enclosure> é publicado. O texto das leituras não é
 * copiado para dentro do app, pela mesma razão que as traduções da Bíblia
 * não foram: não temos os direitos.
 *
 * O áudio é servido direto pelo media.vaticannews.va — não reidratamos nem
 * reempacotamos o arquivo.
 */

const FEED_URL = "https://www.vaticannews.va/pt/palavra-do-dia.rss.xml";
export const SANTO_DO_DIA_URL = "https://www.vaticannews.va/pt/santo-do-dia.html";

export type PalavraDoDia = {
  titulo: string;
  /** Página oficial no Vatican News. */
  link: string;
  audioUrl: string;
  /** "00:05:25" como vem do feed, ou null. */
  duracao: string | null;
  publicadoEm: Date | null;
};

/** Tira CDATA e entidades básicas de um pedaço de texto do feed. */
function limpar(bruto: string): string {
  return bruto
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function extrair(bloco: string, tag: string): string | null {
  const m = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`).exec(bloco);
  return m ? limpar(m[1]!) : null;
}

/**
 * Busca o item mais recente do feed.
 *
 * Devolve null em QUALQUER falha — rede fora, feed mudou de formato, item
 * sem áudio. Esta é uma seção a mais numa tela que já tem conteúdo próprio:
 * derrubar a página de Oração porque o Vaticano está fora do ar seria
 * trocar um problema pequeno por um grande.
 */
export async function getPalavraDoDia(): Promise<PalavraDoDia | null> {
  try {
    const resposta = await fetch(FEED_URL, {
      headers: { "user-agent": "MinhaParoquia/1.0 (+https://minha-paroquia.vercel.app)" },
      // Uma busca por hora, no máximo, por instância. O feed muda uma vez
      // ao dia; bater nele a cada visita seria abusar de um serviço alheio.
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(6000),
    });
    if (!resposta.ok) return null;

    const xml = await resposta.text();
    const primeiro = /<item>([\s\S]*?)<\/item>/.exec(xml);
    if (!primeiro) return null;

    const bloco = primeiro[1]!;
    const titulo = extrair(bloco, "title");
    const link = extrair(bloco, "guid");
    const audioUrl = /<enclosure[^>]*url="([^"]+)"/.exec(bloco)?.[1] ?? null;
    if (!titulo || !link || !audioUrl) return null;

    // Só aceita o que é servido pelo próprio Vaticano: o feed é externo, e
    // uma URL de áudio é entregue ao navegador de quem abre a página.
    if (!/^https:\/\/media\.vaticannews\.va\//.test(audioUrl)) return null;
    if (!/^https:\/\/www\.vaticannews\.va\//.test(link)) return null;

    const pubDate = extrair(bloco, "pubDate");
    const publicadoEm = pubDate ? new Date(pubDate) : null;

    return {
      titulo,
      link,
      audioUrl,
      duracao: extrair(bloco, "itunes:duration"),
      publicadoEm: publicadoEm && !Number.isNaN(publicadoEm.getTime()) ? publicadoEm : null,
    };
  } catch {
    return null;
  }
}
