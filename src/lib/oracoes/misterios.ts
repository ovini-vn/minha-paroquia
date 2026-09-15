/**
 * Os mistérios do Rosário.
 *
 * Quatro conjuntos de cinco. Os Luminosos entraram em 2002, com São João
 * Paulo II (Rosarium Virginis Mariae), e é dele também a distribuição pelos
 * dias da semana que o terço usa para escolher os mistérios de hoje.
 *
 * `biblia` aponta para o capítulo na Bíblia do próprio app. O endereço é por
 * capítulo porque o leitor abre capítulos; o versículo vai escrito na
 * referência, para quem quiser procurar.
 */

export type ConjuntoDeMisterios = "gozosos" | "luminosos" | "dolorosos" | "gloriosos";

export type Misterio = {
  /** "A anunciação do Anjo a Nossa Senhora" */
  titulo: string;
  /** Uma frase para pensar enquanto se reza a dezena. */
  contemplar: string;
  referencia: string;
  biblia: { livro: string; capitulo: number };
};

export const NOMES_DOS_CONJUNTOS: Record<ConjuntoDeMisterios, string> = {
  gozosos: "Mistérios Gozosos",
  luminosos: "Mistérios Luminosos",
  dolorosos: "Mistérios Dolorosos",
  gloriosos: "Mistérios Gloriosos",
};

/** "1º Mistério Gozoso" — o singular de cada conjunto. */
export const SINGULAR_DOS_CONJUNTOS: Record<ConjuntoDeMisterios, string> = {
  gozosos: "Gozoso",
  luminosos: "Luminoso",
  dolorosos: "Doloroso",
  gloriosos: "Glorioso",
};

/** A ordem do Rosário completo. */
export const ORDEM_DO_ROSARIO: ConjuntoDeMisterios[] = ["gozosos", "luminosos", "dolorosos", "gloriosos"];

export const MISTERIOS: Record<ConjuntoDeMisterios, Misterio[]> = {
  gozosos: [
    {
      titulo: "A anunciação do Anjo a Nossa Senhora",
      contemplar: "Maria ouve o anjo e diz sim a Deus, mesmo sem entender tudo.",
      referencia: "Lucas 1,26-38",
      biblia: { livro: "lucas", capitulo: 1 },
    },
    {
      titulo: "A visita de Nossa Senhora a sua prima Isabel",
      contemplar: "Grávida, Maria sai de casa às pressas para servir quem precisa.",
      referencia: "Lucas 1,39-56",
      biblia: { livro: "lucas", capitulo: 1 },
    },
    {
      titulo: "O nascimento de Jesus em Belém",
      contemplar: "Deus nasce pobre, num lugar onde não havia espaço para Ele.",
      referencia: "Lucas 2,1-20",
      biblia: { livro: "lucas", capitulo: 2 },
    },
    {
      titulo: "A apresentação do Menino Jesus no Templo",
      contemplar: "Maria e José entregam o Filho a Deus, e Simeão reconhece a salvação.",
      referencia: "Lucas 2,22-40",
      biblia: { livro: "lucas", capitulo: 2 },
    },
    {
      titulo: "O encontro do Menino Jesus no Templo",
      contemplar: "Depois de três dias de busca, Maria e José encontram Jesus na casa do Pai.",
      referencia: "Lucas 2,41-52",
      biblia: { livro: "lucas", capitulo: 2 },
    },
  ],
  luminosos: [
    {
      titulo: "O batismo de Jesus no rio Jordão",
      contemplar: "O céu se abre e o Pai diz: este é o meu Filho amado.",
      referencia: "Mateus 3,13-17",
      biblia: { livro: "mateus", capitulo: 3 },
    },
    {
      titulo: "Jesus nas bodas de Caná",
      contemplar: "Maria percebe o que falta e diz: fazei tudo o que Ele vos disser.",
      referencia: "João 2,1-12",
      biblia: { livro: "joao", capitulo: 2 },
    },
    {
      titulo: "O anúncio do Reino de Deus e o convite à conversão",
      contemplar: "O tempo se cumpriu: Jesus chama a mudar de vida e crer no Evangelho.",
      referencia: "Marcos 1,14-15",
      biblia: { livro: "marcos", capitulo: 1 },
    },
    {
      titulo: "A transfiguração de Jesus",
      contemplar: "No monte, os discípulos veem a glória de Jesus antes da cruz.",
      referencia: "Mateus 17,1-8",
      biblia: { livro: "mateus", capitulo: 17 },
    },
    {
      titulo: "A instituição da Eucaristia",
      contemplar: "Na última ceia, Jesus se dá inteiro no pão e no vinho.",
      referencia: "Mateus 26,26-29",
      biblia: { livro: "mateus", capitulo: 26 },
    },
  ],
  dolorosos: [
    {
      titulo: "A agonia de Jesus no Horto das Oliveiras",
      contemplar: "Com medo e angústia, Jesus reza: seja feita a vossa vontade.",
      referencia: "Lucas 22,39-46",
      biblia: { livro: "lucas", capitulo: 22 },
    },
    {
      titulo: "A flagelação de Jesus",
      contemplar: "Jesus sofre calado as feridas que eram nossas.",
      referencia: "João 19,1",
      biblia: { livro: "joao", capitulo: 19 },
    },
    {
      titulo: "A coroação de espinhos",
      contemplar: "Zombam do Rei do universo, e Ele responde com mansidão.",
      referencia: "Mateus 27,27-31",
      biblia: { livro: "mateus", capitulo: 27 },
    },
    {
      titulo: "Jesus carrega a cruz até o Calvário",
      contemplar: "Cansado, Jesus segue adiante — e aceita a ajuda de Simão.",
      referencia: "João 19,17",
      biblia: { livro: "joao", capitulo: 19 },
    },
    {
      titulo: "A crucifixão e morte de Jesus",
      contemplar: "Na cruz, Jesus perdoa e entrega a vida nas mãos do Pai.",
      referencia: "Lucas 23,33-46",
      biblia: { livro: "lucas", capitulo: 23 },
    },
  ],
  gloriosos: [
    {
      titulo: "A ressurreição de Jesus",
      contemplar: "O túmulo está vazio: a morte não tem a última palavra.",
      referencia: "Mateus 28,1-10",
      biblia: { livro: "mateus", capitulo: 28 },
    },
    {
      titulo: "A ascensão de Jesus ao céu",
      contemplar: "Jesus volta ao Pai e deixa conosco a missão de anunciá-Lo.",
      referencia: "Atos 1,6-11",
      biblia: { livro: "atos", capitulo: 1 },
    },
    {
      titulo: "A vinda do Espírito Santo sobre Maria e os apóstolos",
      contemplar: "Reunidos em oração com Maria, os discípulos recebem o fogo do Espírito.",
      referencia: "Atos 2,1-13",
      biblia: { livro: "atos", capitulo: 2 },
    },
    {
      titulo: "A assunção de Nossa Senhora ao céu",
      contemplar: "Maria é levada ao céu de corpo e alma: é para lá que caminhamos.",
      referencia: "Lucas 1,46-55",
      biblia: { livro: "lucas", capitulo: 1 },
    },
    {
      titulo: "A coroação de Nossa Senhora como Rainha do céu e da terra",
      contemplar: "A serva do Senhor é coroada, e continua sendo nossa Mãe.",
      referencia: "Apocalipse 12,1",
      biblia: { livro: "apocalipse", capitulo: 12 },
    },
  ],
};

/**
 * Os mistérios de cada dia da semana (0 = domingo), como propôs João Paulo II.
 */
const POR_DIA_DA_SEMANA: ConjuntoDeMisterios[] = [
  "gloriosos", // domingo
  "gozosos", // segunda
  "dolorosos", // terça
  "gloriosos", // quarta
  "luminosos", // quinta
  "dolorosos", // sexta
  "gozosos", // sábado
];

export function misteriosDoDia(diaDaSemana: number): ConjuntoDeMisterios {
  return POR_DIA_DA_SEMANA[diaDaSemana] ?? "gozosos";
}

export function ehConjunto(valor: string | undefined | null): valor is ConjuntoDeMisterios {
  return valor === "gozosos" || valor === "luminosos" || valor === "dolorosos" || valor === "gloriosos";
}

export function enderecoDaBiblia(m: Pick<Misterio, "biblia">): string {
  return `/biblia/${m.biblia.livro}/${m.biblia.capitulo}`;
}
