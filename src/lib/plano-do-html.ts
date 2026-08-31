/**
 * Lê um plano pastoral publicado como página HTML.
 *
 * Existe como módulo, e não dentro do importador, porque é a parte com
 * regra de verdade — e regra sem teste foi onde os erros deste importador
 * se esconderam até agora.
 */

export type SecaoLida = { rotulo: string | null; titulo: string; corpo: string };
export type PlanoLido = { titulo: string; introducao: string | null; secoes: SecaoLida[] };

/**
 * Tira as tags, virando parágrafo onde a marcação virava bloco.
 *
 * O item de lista já entra com o marcador "•": ele sobrevive à limpeza de
 * espaços que vem depois, porque não é espaço. Uma versão anterior usava um
 * caractere sentinela trocado por "•" no fim — máquina a mais para o mesmo
 * resultado, e mais um lugar onde um escape pode se perder.
 */
export function comoTexto(html: string): string {
  return html
    /*
     * Negrito que ABRE um bloco é título embutido, não ênfase.
     *
     * A fonte escreve `<div><b>1. Grupos Bíblicos</b>Por isso as missas...`,
     * e sem isto o título gruda na frase: "MissãoPor isso as missas". A
     * regra é estrutural de propósito — vale só quando o negrito é a
     * primeira coisa do bloco. Negrito no meio de uma frase continua sendo
     * ênfase, e quebrar ali partiria a frase em duas.
     */
    .replace(/(<(?:div|p|li)[^>]*>)\s*<(b|strong)>([\s\S]*?)<\/\2>/g, "$1$3\n\n")
    .replace(/<li[^>]*>/g, "\n• ")
    .replace(/<\/(p|li|div|h[1-6]|section)>/g, "\n\n")
    .replace(/<br\s*\/?>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .split("\n")
    .map((linha) => linha.replace(/\s+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Lê o plano a partir da HIERARQUIA de títulos, e não de uma lista de
 * blocos decorada deste arquivo.
 *
 * Cada `h2` abre uma seção; os `h3` e `summary` dentro dela viram seções
 * próprias, com o `h2` como tarja. É o que faz "1 · Comunhão" aparecer sob
 * "Os cinco eixos da Arquidiocese" e cada prioridade ganhar sua entrada no
 * índice de quem lê.
 *
 * Isso importa porque o plano MUDA de arquidiocese para arquidiocese — o
 * mesmo motivo pelo qual o itinerário da catequese é digitável. Um leitor
 * preso a "objetivo, prioridades, cinco eixos" só serviria a Londrina; um
 * preso à hierarquia serve a qualquer documento com títulos.
 *
 * O corte é feito NOS TÍTULOS, em ordem: cada pedaço vai do fim de um
 * título ao começo do próximo. Assim não é preciso entender o aninhamento
 * das divs, que é justamente onde uma expressão regular sempre erra.
 *
 * O que sai daqui é ponto de partida, não verdade final — a paróquia edita
 * tudo depois na tela do painel.
 */
export function lerPlanoDoHtml(html: string): PlanoLido {
  const de = html.indexOf('id="view-plano"');
  const ate = html.indexOf('id="view-glossario"');
  if (de < 0) throw new Error("Não achei a seção do plano pastoral no arquivo.");
  const bloco = html.slice(de, ate > de ? ate : html.length);

  const titulo = comoTexto(/<h1[^>]*>([\s\S]*?)<\/h1>/.exec(bloco)?.[1] ?? "") || "Plano pastoral";
  const introducao =
    comoTexto(/<p class="lead"[^>]*>([\s\S]*?)<\/p>/.exec(bloco)?.[1] ?? "") || null;

  const titulos = [...bloco.matchAll(/<(h2|h3|summary)[^>]*>([\s\S]*?)<\/\1>/g)];

  const secoes: SecaoLida[] = [];
  let tarja: string | null = null;

  /*
   * A palavra dos padres fecha o documento impresso, mas no app ela já é um
   * recado no mural — que é onde um recado dos padres mora. Trazê-la
   * também para o plano poria o mesmo texto em duas telas, e a pessoa que
   * lesse as duas acharia que uma delas está desatualizada.
   */
  const NO_MURAL = /^palavra dos padres$/i;

  for (let i = 0; i < titulos.length; i++) {
    const atual = titulos[i];
    if (!atual) continue;
    const proximo = titulos[i + 1];
    const nome = comoTexto(atual[2] ?? "");
    if (!nome || NO_MURAL.test(nome)) continue;

    const inicio = (atual.index ?? 0) + atual[0].length;
    const fim = proximo?.index ?? bloco.length;
    const corpo = comoTexto(bloco.slice(inicio, fim));

    if (atual[1] === "h2") {
      /*
       * Um h2 sem texto próprio é só o guarda-chuva dos filhos: vira tarja
       * deles, em vez de uma seção vazia na tela de quem lê.
       */
      tarja = nome;
      if (corpo) secoes.push({ rotulo: null, titulo: nome, corpo });
      continue;
    }

    if (!corpo) continue;
    secoes.push({ rotulo: tarja, titulo: nome, corpo });
  }

  if (secoes.length === 0) throw new Error("O plano veio sem nenhuma seção.");
  return { titulo, introducao, secoes };
}
