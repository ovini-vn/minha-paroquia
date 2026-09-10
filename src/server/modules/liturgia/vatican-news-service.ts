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
  /**
   * Leituras em parágrafos de texto puro. Nunca HTML.
   *
   * É a forma CRUA, de onde os blocos são montados. Fica exposta porque é
   * nela que a garantia de segurança é testada — nenhuma tag, nenhum
   * script sobrevive à extração —, e a garantia vale para os blocos por
   * consequência: eles não são outra leitura do feed, são estes mesmos
   * parágrafos agrupados. A tela usa `blocos`.
   */
  leituras: string[];
  /** As mesmas leituras, separadas em blocos legíveis. */
  blocos: BlocoDeLeitura[];
};

/**
 * Um pedaço da liturgia do dia: uma leitura, o Evangelho, ou a reflexão.
 *
 * Existe porque o feed manda 86 fragmentos soltos e a tela mostrava os 86
 * como parágrafos separados, com respiro entre cada um. "Para nós, porém,
 * existe um só Deus, o Pai," / "de quem vêm todos os seres" / "e para quem
 * nós existimos." — uma frase, três blocos afastados. Visto na tela.
 *
 * São VERSOS, não parágrafos: o lecionário quebra a linha no ritmo da
 * proclamação, para quem lê em voz alta na missa. Renderizados como linhas
 * de um mesmo bloco eles voltam a ser uma leitura; como parágrafos, viram
 * uma lista de frases sem sujeito.
 */
export type BlocoDeLeitura = {
  tipo: "leitura" | "evangelho" | "reflexao";
  /** O cabeçalho como o feed escreve. Vazio na reflexão, que não tem. */
  rotulo: string;
  /** "6,27-38", como vem do feed. */
  referencia: string | null;
  /** "Lucas 6,27-38" — só no Evangelho, para caber num título curto. */
  citacao: string | null;
  /** Versos, uma linha cada. Na reflexão, parágrafos de prosa. */
  linhas: string[];
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

/*
 * Como o feed anuncia cada peça, medido nos 15 dias que ele guarda.
 *
 * Há mais variação do que parece: "Leitura da Profecia de Miqueias",
 * "Leitura do Livro do Profeta Jeremias", "Início da Primeira Carta de São
 * Paulo aos Coríntios" (27/08) e, em dois dias, um rótulo solto —
 * "Primeira Leitura" — seguido do cabeçalho de verdade na linha seguinte.
 *
 * Nenhuma regra por prefixo de palavra: "Salmo" pareceria seguro e casaria
 * com "Salmon gerou Booz", que é um verso da genealogia de Mateus no dia
 * 08/09. Um cabeçalho falso no meio de uma leitura é pior que nenhum.
 */
const ABRE_LEITURA = /^(Leitura|In[íi]cio|Primeira Leitura|Segunda Leitura|Do Livro|Da Carta)(?=\s|$)/i;
const ABRE_EVANGELHO = /^Proclama[çc][ãa]o do Evangelho(?=\s|$)/i;

/** "8,1b-7.11-13", "5,1-4a", "20,7-9": capítulo, vírgula, versículo. */
const REFERENCIA = /^\d{1,3}\s*,\s*\d[\d\s.,\-abcde]*$/i;

/**
 * Onde o verso acaba e a prosa começa.
 *
 * O maior verso dos 15 dias tem 58 caracteres; o menor parágrafo de
 * reflexão tem 316. O corte cabe folgado no meio desse vão, e é o que
 * separa a leitura do comentário — que às vezes são QUATRO parágrafos, o
 * último deles só a assinatura "(Papa Francisco, Angelus de ...)". Uma
 * regra do tipo "a reflexão é o último parágrafo" cortaria errado nesse
 * dia, e cortou: foi assim que este limite apareceu.
 */
const PROSA = 140;

/**
 * Os parágrafos soltos do feed viram blocos legíveis.
 *
 * Falhar aqui é devolver menos, nunca quebrar: um feed em formato novo cai
 * num único bloco de leitura com tudo dentro, que continua sendo o texto
 * do dia — só sem os cabeçalhos.
 */
export function estruturarLeituras(paragrafos: string[]): BlocoDeLeitura[] {
  const blocos: BlocoDeLeitura[] = [];
  let atual: BlocoDeLeitura | null = null;

  const abrir = (tipo: BlocoDeLeitura["tipo"], rotulo: string): BlocoDeLeitura => {
    const bloco: BlocoDeLeitura = { tipo, rotulo, referencia: null, citacao: null, linhas: [] };
    blocos.push(bloco);
    return bloco;
  };

  for (const p of paragrafos) {
    const ehEvangelho = ABRE_EVANGELHO.test(p);

    if (ehEvangelho || ABRE_LEITURA.test(p)) {
      /*
       * "Primeira Leitura" sozinho é rótulo de seção, e o cabeçalho de
       * verdade vem na linha seguinte. Um bloco ainda sem versos é isso —
       * então o cabeçalho novo substitui o rótulo em vez de abrir outro
       * bloco, senão o dia 06/09 renderiza duas leituras onde há uma.
       */
      if (atual && atual.linhas.length === 0 && atual.referencia === null) {
        atual.rotulo = p;
        atual.tipo = ehEvangelho ? "evangelho" : atual.tipo;
        continue;
      }
      atual = abrir(ehEvangelho ? "evangelho" : "leitura", p);
      continue;
    }

    if (!atual) {
      atual = abrir("leitura", "");
    }

    // A referência vem logo depois do cabeçalho, e só ali.
    if (atual.referencia === null && atual.linhas.length === 0 && REFERENCIA.test(p)) {
      atual.referencia = p;
      continue;
    }

    // Prosa longa encerra a leitura: daqui para a frente é comentário.
    if (p.length >= PROSA) {
      if (atual.tipo !== "reflexao") atual = abrir("reflexao", "");
      atual.linhas.push(p);
      continue;
    }

    /*
     * Linha curta DEPOIS que a reflexão começou continua nela: é a
     * assinatura ("(Papa Francisco, Angelus de 26 de janeiro de 2025)"),
     * que tem 50 caracteres e voltaria a virar verso sem esta linha.
     */
    atual.linhas.push(p);
  }

  for (const bloco of blocos) {
    if (bloco.tipo !== "evangelho") continue;
    // "Proclamação do Evangelho de Jesus Cristo segundo Lucas" -> "Lucas".
    const evangelista = /segundo\s+(.+?)\s*$/i.exec(bloco.rotulo)?.[1];
    if (evangelista) {
      bloco.citacao = bloco.referencia ? `${evangelista} ${bloco.referencia}` : evangelista;
    }
  }

  return blocos.filter((b) => b.linhas.length > 0);
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
    const paragrafos = extrairParagrafos(descricaoBruta);

    return {
      titulo,
      link,
      audioUrl,
      duracao: extrair(bloco, "itunes:duration"),
      publicadoEm: publicadoEm && !Number.isNaN(publicadoEm.getTime()) ? publicadoEm : null,
      leituras: paragrafos,
      blocos: estruturarLeituras(paragrafos),
    };
  } catch {
    return null;
  }
}
