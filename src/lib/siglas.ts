/**
 * Siglas escritas por extenso.
 *
 * O calendário impresso da paróquia vinha com um glossário — uma tela para
 * explicar o que "GBR" quer dizer. A decisão foi outra: não fazer o
 * glossário e escrever os nomes por extenso onde eles aparecem. Quem lê
 * "Grupos Bíblicos de Reflexão" na agenda não precisa de tela nenhuma; quem
 * lê "GBR" precisa sair da agenda para entender o que está no seu próprio
 * calendário.
 *
 * Quase todas as equivalências saem do PRÓPRIO arquivo da paróquia — do
 * glossário dele ou do texto que já traz a expansão entre parênteses.
 * Nenhuma foi adivinhada: "CPC" e "CAEP" aparecem uma vez só, dentro de
 * "(CPP/CPC/CAEP)", e a fonte nunca diz o que são, então ficaram de fora
 * até o pároco dizer os nomes. Chutar como se chamam os conselhos de uma
 * paróquia é o palpite que fica bonito na tela e errado na vida.
 */

type Sigla = {
  nome: string;
  /**
   * Gênero e número do NOME, não da sigla.
   *
   * Existe por causa de "o COMIPA": a sigla é masculina no uso corrente, e o
   * nome por extenso é feminino. Trocar só a palavra deixaria "o Comissão
   * Missionária Paroquial" no texto que a paróquia publica.
   */
  genero: "m" | "f";
  numero: "s" | "p";
};

export const SIGLAS: Record<string, Sigla> = {
  GBR: { nome: "Grupos Bíblicos de Reflexão", genero: "m", numero: "p" },
  IAM: { nome: "Infância e Adolescência Missionária", genero: "f", numero: "s" },
  CPP: { nome: "Conselho Pastoral Paroquial", genero: "m", numero: "s" },
  COMIPA: { nome: "Comissão Missionária Paroquial", genero: "f", numero: "s" },
  MESC: { nome: "Ministros Extraordinários da Sagrada Comunhão", genero: "m", numero: "p" },
  IVC: { nome: "Iniciação à Vida Cristã", genero: "f", numero: "s" },
  PPI: { nome: "Pastoral da Pessoa Idosa", genero: "f", numero: "s" },
  HU: { nome: "Hospital Universitário", genero: "m", numero: "s" },
  // Estas duas não estão no glossário do arquivo nem são expandidas em
  // lugar nenhum do texto: vieram do pároco, perguntado em 31/08/2026.
  CPC: { nome: "Conselho Pastoral Comunitário", genero: "m", numero: "s" },
  CAEP: { nome: "Conselho de Assuntos Econômicos Paroquial", genero: "m", numero: "s" },
};

/**
 * O artigo definido e as contrações dele, por forma.
 *
 * A chave é a preposição — nenhuma, "de", "em", "a", "por" — e o valor traz
 * as quatro flexões. Assim "do CPP" continua "do" e "o COMIPA" vira "a",
 * sem precisar de gramática nenhuma além da concordância.
 */
const ARTIGOS: Record<string, { ms: string; fs: string; mp: string; fp: string }> = {
  "": { ms: "o", fs: "a", mp: "os", fp: "as" },
  de: { ms: "do", fs: "da", mp: "dos", fp: "das" },
  em: { ms: "no", fs: "na", mp: "nos", fp: "nas" },
  a: { ms: "ao", fs: "à", mp: "aos", fp: "às" },
  por: { ms: "pelo", fs: "pela", mp: "pelos", fp: "pelas" },
};

/** De "dos" para {preposição: "de"} — o caminho inverso da tabela acima. */
const FORMA_DO_ARTIGO = new Map<string, string>();
for (const [preposicao, formas] of Object.entries(ARTIGOS)) {
  for (const forma of Object.values(formas)) FORMA_DO_ARTIGO.set(forma, preposicao);
}

function concordar(artigo: string, sigla: Sigla): string {
  const preposicao = FORMA_DO_ARTIGO.get(artigo.toLowerCase());
  if (preposicao === undefined) return artigo;

  const flexao = `${sigla.genero}${sigla.numero}` as "ms" | "fs" | "mp" | "fp";
  const certo = ARTIGOS[preposicao]![flexao];

  // Preserva a maiúscula de início de frase: "Do CPP" continua "Do".
  return artigo[0] === artigo[0]?.toUpperCase() ? certo[0]!.toUpperCase() + certo.slice(1) : certo;
}

/**
 * Troca as siglas pelo nome por extenso, acertando o artigo antes delas.
 *
 * Quatro casos, e cada um existe porque o texto da paróquia tem os quatro:
 *
 * 1. "IVC (Iniciação à Vida Cristã)" vira "Iniciação à Vida Cristã". Sem
 *    isto sairia o nome repetido dentro dos próprios parênteses.
 *
 * 2. "Conselho Pastoral Paroquial (CPP)" fica COMO ESTÁ. Já está por
 *    extenso, e a sigla ali é o apelido pelo qual as pessoas chamam a
 *    coisa — tirá-la não ajudaria ninguém a entender mais.
 *
 * 3. "os GBRs" vira "os Grupos Bíblicos de Reflexão", e "o COMIPA" vira "a
 *    Comissão Missionária Paroquial". O plural da sigla some porque o nome
 *    já é plural; o artigo passa a concordar com o nome.
 *
 * 4. "(CPP/CPC/CAEP)" vira "(Conselho Pastoral Paroquial, Conselho Pastoral
 *    Comunitário e Conselho de Assuntos Econômicos Paroquial)" — lista com
 *    vírgulas, não com barras, que é como se lê em português. E só quando
 *    TODOS os membros são conhecidos: uma lista meio traduzida não se lê nem
 *    como sigla nem como nome.
 */
export function porExtenso(texto: string): string {
  let saida = texto;

  /*
   * O caso 2 é resolvido tirando-o do caminho: cada "Nome (SIGLA)" vira um
   * marcador antes das trocas e volta ao fim.
   *
   * A alternativa seria uma exceção dentro da própria substituição, e ela
   * precisa saber o que veio ANTES do trecho — o que uma expressão regular
   * com grupo opcional não responde de forma confiável. Proteger e
   * restaurar é mais longo de ler e não tem esse canto escuro.
   */
  const guardados: string[] = [];
  for (const [sigla, dados] of Object.entries(SIGLAS)) {
    saida = saida.replace(
      new RegExp(`${escapar(dados.nome)}\\s*\\(\\s*${sigla}\\s*\\)`, "g"),
      (trecho) => {
        guardados.push(trecho);
        return `[[intacto-${guardados.length - 1}]]`;
      },
    );
  }

  /*
   * A enumeração compacta vira enumeração de verdade.
   *
   * A fonte escreve "os estatutos (CPP/CPC/CAEP)". Trocar as barras por
   * nomes daria "(Conselho Pastoral Paroquial/Conselho Pastoral
   * Comunitário/Conselho de Assuntos Econômicos Paroquial)", que se lê pior
   * do que a sigla. Como lista — vírgulas e um "e" no fim — se lê como
   * português.
   *
   * Só quando TODOS os membros são conhecidos: os lookarounds de barra
   * garantem que uma lista com uma sigla que não sabemos expandir fique
   * inteira como está, em vez de sair meio traduzida.
   */
  const alternativa = Object.keys(SIGLAS).join("|");
  saida = saida.replace(
    new RegExp(`(?<!/)\\b((?:${alternativa})(?:/(?:${alternativa}))+)\\b(?!/)`, "g"),
    (lista) => {
      const nomes = lista.split("/").map((s) => SIGLAS[s]!.nome);
      const ultimo = nomes.pop()!;
      return `${nomes.join(", ")} e ${ultimo}`;
    },
  );

  for (const [sigla, dados] of Object.entries(SIGLAS)) {
    /*
     * 1. A sigla seguida da própria expansão vira só a SIGLA — e não o nome.
     *
     * Parece um passo a mais e não é: reduzindo tudo à sigla, a troca do
     * passo 3 é a única que escreve o nome, e é a única que precisa saber
     * concordar o artigo. Escrever o nome aqui produzia "Articular o
     * Comissão Missionária Paroquial", porque este passo não olha o que vem
     * antes.
     *
     * A fonte escreve a expansão de duas formas, e as duas caem aqui:
     * "COMIPA (Comissão Missionária Paroquial)" e "COMIPA, a Comissão
     * Missionária Paroquial". A segunda, sem isto, duplicava o nome inteiro.
     */
    const nome = escapar(dados.nome);
    saida = saida.replace(
      new RegExp(`\\b${sigla}\\s*\\(\\s*${nome}\\s*\\)`, "gi"),
      sigla,
    );
    saida = saida.replace(new RegExp(`\\b${sigla},\\s*(?:o|a|os|as)\\s+${nome}\\b`, "gi"), sigla);

    // 3. A sigla solta, com o artigo antes dela quando há um.
    saida = saida.replace(
      new RegExp(`(?<!/)(?:\\b(\\w+)\\s+)?\\b${sigla}s?\\b(?!/)`, "g"),
      (_inteiro, antes: string | undefined) => {
        if (!antes) return dados.nome;
        if (!FORMA_DO_ARTIGO.has(antes.toLowerCase())) return `${antes} ${dados.nome}`;
        return `${concordar(antes, dados)} ${dados.nome}`;
      },
    );
  }

  return saida.replace(/\[\[intacto-(\d+)\]\]/g, (_t, i: string) => guardados[Number(i)] ?? "");
}

function escapar(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
