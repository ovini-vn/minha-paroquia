import "server-only";

/**
 * "Palavra do dia" do Vatican News — o Evangelho do dia em áudio.
 *
 * O feed traz título, áudio e o texto das leituras. Tudo vem marcado
 * "© Dicasterium pro Communicatione — todos os direitos reservados": ter
 * RSS não é licença de uso, e exibir o texto é decisão de risco do dono do
 * app, tomada com consciência disso. O crédito é explícito e o link leva à
 * fonte, que é o mínimo devido.
 *
 * O texto é convertido para PARÁGRAFOS DE TEXTO PURO antes de sair daqui.
 * O HTML do feed nunca chega à página: é conteúdo de terceiro, e injetá-lo
 * direto seria abrir a porta para script alheio dentro do app.
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
  /** Leituras em parágrafos de texto puro. Nunca HTML. */
  leituras: string[];
};

/**
 * HTML do feed -> parágrafos de texto puro.
 *
 * Não é um sanitizador de HTML: é uma extração. Toda tag é descartada, e o
 * que sobra é texto. Isso torna impossível qualquer script ou atributo do
 * feed alcançar a página, sem depender de eu ter previsto cada vetor.
 */
function extrairParagrafos(html: string): string[] {
  return html
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    // script/style saem COM o conteúdo. Só descartar as tags deixaria o
    // corpo delas virar "texto" no meio das leituras — não é falha de
    // segurança (o React escapa), mas apareceria lixo para o fiel ler.
    .replace(/<\s*(script|style)[\s\S]*?<\/\s*\1\s*>/gi, " ")
    // <br> e </p> viram quebra antes de as tags sumirem, senão o texto
    // inteiro colaria numa linha só.
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\/\s*(p|div|h[1-6])\s*>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    // Entidades nomeadas de letra acentuada. Sem isto, "S&atilde;o Jo&atilde;o"
    // vira "S o Jo o": o feed escapa TODO acento, e trocar entidade
    // desconhecida por espaço apagaria o português inteiro.
    .replace(/&([a-zA-Z]+)(acute|grave|circ|tilde|uml|cedil|ring|slash);/g, (todo, letra, marca) => {
      const mapa: Record<string, string> = {
        acute: "́",
        grave: "̀",
        circ: "̂",
        tilde: "̃",
        uml: "̈",
        cedil: "̧",
        ring: "̊",
      };
      const combinante = mapa[marca];
      if (!combinante || letra.length !== 1) return todo;
      return (letra + combinante).normalize("NFC");
    })
    // Numéricas, decimais e hexadecimais.
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    // O que sobrou não é entidade conhecida; sai para não virar ruído.
    .replace(/&[a-zA-Z]+\d*;/g, " ")
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l.length > 0);
}

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

    const descricaoBruta = /<description>([\s\S]*?)<\/description>/.exec(bloco)?.[1] ?? "";

    return {
      titulo,
      link,
      audioUrl,
      duracao: extrair(bloco, "itunes:duration"),
      publicadoEm: publicadoEm && !Number.isNaN(publicadoEm.getTime()) ? publicadoEm : null,
      leituras: extrairParagrafos(descricaoBruta),
    };
  } catch {
    return null;
  }
}
