/**
 * Um pedacinho de Markdown, o suficiente para um memorial histórico.
 *
 * O texto da história da paróquia é longo e tem estrutura — títulos, uma
 * linha do tempo, listas de nomes, fontes consultadas. Guardar tudo como
 * um bloco de texto corrido perderia essa estrutura; trazer uma biblioteca
 * de Markdown inteira traria junto tabelas, HTML embutido e um vetor de
 * injeção que nada aqui precisa.
 *
 * Então reconhecemos só o que o documento usa: título, parágrafo, lista,
 * divisor, negrito e endereços de internet. Qualquer outra marcação
 * aparece como o texto que é — nunca como HTML.
 */

export type Trecho = {
  texto: string;
  /** `**assim**` */
  forte?: boolean;
  /** Endereço reconhecido no meio do texto, para virar link. */
  href?: string;
};

export type Bloco =
  | { tipo: "titulo"; nivel: 1 | 2; trechos: Trecho[] }
  /** Linhas seguidas, sem linha em branco entre elas: um parágrafo só. */
  | { tipo: "paragrafo"; linhas: Trecho[][] }
  | { tipo: "lista"; itens: Trecho[][] }
  | { tipo: "divisor" };

const URL_SOLTA = /(https?:\/\/[^\s<>"']+[^\s<>"'.,;:)\]])/g;

/** Quebra em pedaços com e sem negrito, achando endereços pelo caminho. */
export function analisarLinha(linha: string): Trecho[] {
  const trechos: Trecho[] = [];

  const comLinks = (texto: string, forte: boolean) => {
    if (!texto) return;
    let ultimo = 0;
    for (const achado of texto.matchAll(URL_SOLTA)) {
      const inicio = achado.index ?? 0;
      if (inicio > ultimo) trechos.push({ texto: texto.slice(ultimo, inicio), ...(forte && { forte }) });
      trechos.push({ texto: achado[0], href: achado[0], ...(forte && { forte }) });
      ultimo = inicio + achado[0].length;
    }
    if (ultimo < texto.length) trechos.push({ texto: texto.slice(ultimo), ...(forte && { forte }) });
  };

  // Partes pares estão fora do `**`, ímpares dentro.
  const partes = linha.split("**");
  partes.forEach((parte, indice) => comLinks(parte, indice % 2 === 1));

  return trechos;
}

export function analisarTexto(texto: string): Bloco[] {
  const blocos: Bloco[] = [];
  let paragrafo: Trecho[][] = [];
  let lista: Trecho[][] = [];

  const fechaParagrafo = () => {
    if (paragrafo.length > 0) blocos.push({ tipo: "paragrafo", linhas: paragrafo });
    paragrafo = [];
  };
  const fechaLista = () => {
    if (lista.length > 0) blocos.push({ tipo: "lista", itens: lista });
    lista = [];
  };
  const fechaTudo = () => {
    fechaParagrafo();
    fechaLista();
  };

  for (const bruta of texto.replace(/\r\n/g, "\n").split("\n")) {
    const linha = bruta.trim();

    if (linha === "") {
      fechaTudo();
      continue;
    }

    if (/^-{3,}$/.test(linha) || /^\*{3,}$/.test(linha)) {
      fechaTudo();
      blocos.push({ tipo: "divisor" });
      continue;
    }

    const titulo = /^(#{1,6})\s+(.*)$/.exec(linha);
    if (titulo) {
      fechaTudo();
      // Mais de dois níveis não ajudam a ler numa tela de celular.
      blocos.push({
        tipo: "titulo",
        nivel: titulo[1]!.length === 1 ? 1 : 2,
        trechos: analisarLinha(titulo[2]!),
      });
      continue;
    }

    const item = /^[-*]\s+(.*)$/.exec(linha);
    if (item) {
      fechaParagrafo();
      lista.push(analisarLinha(item[1]!));
      continue;
    }

    fechaLista();
    paragrafo.push(analisarLinha(linha));
  }

  fechaTudo();
  return blocos;
}
