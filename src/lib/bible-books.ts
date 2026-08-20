/**
 * Cânon católico (73 livros) com a contagem de capítulos de cada um.
 *
 * ATENÇÃO: este módulo está intencionalmente SEM USO no momento. A tela de
 * Bíblia foi retirada do app enquanto a paróquia não tiver licença de uma
 * das traduções — não faz sentido expor um leitor que não pode mostrar
 * texto. O mapeamento do cânon fica aqui pronto para quando a licença
 * existir; não apagar por parecer código morto.
 *
 * Nomes de livros e número de capítulos são FATOS de estrutura, não texto
 * protegido — por isso podem viver aqui. O TEXTO de cada versículo é que
 * vem de traduções licenciadas (Ave Maria, CNBB, Edição Pastoral, Bíblia de
 * Jerusalém) e não pode ser reproduzido sem licença.
 *
 * A ordem e a divisão seguem o cânon católico, incluindo os sete
 * deuterocanônicos (Tobias, Judite, Sabedoria, Eclesiástico, Baruc, 1 e 2
 * Macabeus) — ausentes das edições protestantes.
 */

export type Testament = "antigo" | "novo";

export type BibleBook = {
  slug: string;
  name: string;
  abbrev: string;
  chapters: number;
  testament: Testament;
  group: string;
};

export const BIBLE_BOOKS: BibleBook[] = [
  // Pentateuco
  { slug: "genesis", name: "Gênesis", abbrev: "Gn", chapters: 50, testament: "antigo", group: "Pentateuco" },
  { slug: "exodo", name: "Êxodo", abbrev: "Ex", chapters: 40, testament: "antigo", group: "Pentateuco" },
  { slug: "levitico", name: "Levítico", abbrev: "Lv", chapters: 27, testament: "antigo", group: "Pentateuco" },
  { slug: "numeros", name: "Números", abbrev: "Nm", chapters: 36, testament: "antigo", group: "Pentateuco" },
  { slug: "deuteronomio", name: "Deuteronômio", abbrev: "Dt", chapters: 34, testament: "antigo", group: "Pentateuco" },

  // Livros históricos
  { slug: "josue", name: "Josué", abbrev: "Js", chapters: 24, testament: "antigo", group: "Históricos" },
  { slug: "juizes", name: "Juízes", abbrev: "Jz", chapters: 21, testament: "antigo", group: "Históricos" },
  { slug: "rute", name: "Rute", abbrev: "Rt", chapters: 4, testament: "antigo", group: "Históricos" },
  { slug: "1-samuel", name: "1 Samuel", abbrev: "1Sm", chapters: 31, testament: "antigo", group: "Históricos" },
  { slug: "2-samuel", name: "2 Samuel", abbrev: "2Sm", chapters: 24, testament: "antigo", group: "Históricos" },
  { slug: "1-reis", name: "1 Reis", abbrev: "1Rs", chapters: 22, testament: "antigo", group: "Históricos" },
  { slug: "2-reis", name: "2 Reis", abbrev: "2Rs", chapters: 25, testament: "antigo", group: "Históricos" },
  { slug: "1-cronicas", name: "1 Crônicas", abbrev: "1Cr", chapters: 29, testament: "antigo", group: "Históricos" },
  { slug: "2-cronicas", name: "2 Crônicas", abbrev: "2Cr", chapters: 36, testament: "antigo", group: "Históricos" },
  { slug: "esdras", name: "Esdras", abbrev: "Esd", chapters: 10, testament: "antigo", group: "Históricos" },
  { slug: "neemias", name: "Neemias", abbrev: "Ne", chapters: 13, testament: "antigo", group: "Históricos" },
  { slug: "tobias", name: "Tobias", abbrev: "Tb", chapters: 14, testament: "antigo", group: "Históricos" },
  { slug: "judite", name: "Judite", abbrev: "Jt", chapters: 16, testament: "antigo", group: "Históricos" },
  { slug: "ester", name: "Ester", abbrev: "Est", chapters: 10, testament: "antigo", group: "Históricos" },
  { slug: "1-macabeus", name: "1 Macabeus", abbrev: "1Mc", chapters: 16, testament: "antigo", group: "Históricos" },
  { slug: "2-macabeus", name: "2 Macabeus", abbrev: "2Mc", chapters: 15, testament: "antigo", group: "Históricos" },

  // Sapienciais
  { slug: "jo", name: "Jó", abbrev: "Jó", chapters: 42, testament: "antigo", group: "Sapienciais" },
  { slug: "salmos", name: "Salmos", abbrev: "Sl", chapters: 150, testament: "antigo", group: "Sapienciais" },
  { slug: "proverbios", name: "Provérbios", abbrev: "Pr", chapters: 31, testament: "antigo", group: "Sapienciais" },
  { slug: "eclesiastes", name: "Eclesiastes", abbrev: "Ecl", chapters: 12, testament: "antigo", group: "Sapienciais" },
  { slug: "cantico-dos-canticos", name: "Cântico dos Cânticos", abbrev: "Ct", chapters: 8, testament: "antigo", group: "Sapienciais" },
  { slug: "sabedoria", name: "Sabedoria", abbrev: "Sb", chapters: 19, testament: "antigo", group: "Sapienciais" },
  { slug: "eclesiastico", name: "Eclesiástico", abbrev: "Eclo", chapters: 51, testament: "antigo", group: "Sapienciais" },

  // Profetas
  { slug: "isaias", name: "Isaías", abbrev: "Is", chapters: 66, testament: "antigo", group: "Profetas" },
  { slug: "jeremias", name: "Jeremias", abbrev: "Jr", chapters: 52, testament: "antigo", group: "Profetas" },
  { slug: "lamentacoes", name: "Lamentações", abbrev: "Lm", chapters: 5, testament: "antigo", group: "Profetas" },
  { slug: "baruc", name: "Baruc", abbrev: "Br", chapters: 6, testament: "antigo", group: "Profetas" },
  { slug: "ezequiel", name: "Ezequiel", abbrev: "Ez", chapters: 48, testament: "antigo", group: "Profetas" },
  { slug: "daniel", name: "Daniel", abbrev: "Dn", chapters: 14, testament: "antigo", group: "Profetas" },
  { slug: "oseias", name: "Oseias", abbrev: "Os", chapters: 14, testament: "antigo", group: "Profetas" },
  { slug: "joel", name: "Joel", abbrev: "Jl", chapters: 4, testament: "antigo", group: "Profetas" },
  { slug: "amos", name: "Amós", abbrev: "Am", chapters: 9, testament: "antigo", group: "Profetas" },
  { slug: "abdias", name: "Abdias", abbrev: "Ab", chapters: 1, testament: "antigo", group: "Profetas" },
  { slug: "jonas", name: "Jonas", abbrev: "Jn", chapters: 4, testament: "antigo", group: "Profetas" },
  { slug: "miqueias", name: "Miqueias", abbrev: "Mq", chapters: 7, testament: "antigo", group: "Profetas" },
  { slug: "naum", name: "Naum", abbrev: "Na", chapters: 3, testament: "antigo", group: "Profetas" },
  { slug: "habacuc", name: "Habacuc", abbrev: "Hab", chapters: 3, testament: "antigo", group: "Profetas" },
  { slug: "sofonias", name: "Sofonias", abbrev: "Sf", chapters: 3, testament: "antigo", group: "Profetas" },
  { slug: "ageu", name: "Ageu", abbrev: "Ag", chapters: 2, testament: "antigo", group: "Profetas" },
  { slug: "zacarias", name: "Zacarias", abbrev: "Zc", chapters: 14, testament: "antigo", group: "Profetas" },
  { slug: "malaquias", name: "Malaquias", abbrev: "Ml", chapters: 3, testament: "antigo", group: "Profetas" },

  // Evangelhos e Atos
  { slug: "mateus", name: "Mateus", abbrev: "Mt", chapters: 28, testament: "novo", group: "Evangelhos" },
  { slug: "marcos", name: "Marcos", abbrev: "Mc", chapters: 16, testament: "novo", group: "Evangelhos" },
  { slug: "lucas", name: "Lucas", abbrev: "Lc", chapters: 24, testament: "novo", group: "Evangelhos" },
  { slug: "joao", name: "João", abbrev: "Jo", chapters: 21, testament: "novo", group: "Evangelhos" },
  { slug: "atos", name: "Atos dos Apóstolos", abbrev: "At", chapters: 28, testament: "novo", group: "Evangelhos" },

  // Cartas
  { slug: "romanos", name: "Romanos", abbrev: "Rm", chapters: 16, testament: "novo", group: "Cartas" },
  { slug: "1-corintios", name: "1 Coríntios", abbrev: "1Cor", chapters: 16, testament: "novo", group: "Cartas" },
  { slug: "2-corintios", name: "2 Coríntios", abbrev: "2Cor", chapters: 13, testament: "novo", group: "Cartas" },
  { slug: "galatas", name: "Gálatas", abbrev: "Gl", chapters: 6, testament: "novo", group: "Cartas" },
  { slug: "efesios", name: "Efésios", abbrev: "Ef", chapters: 6, testament: "novo", group: "Cartas" },
  { slug: "filipenses", name: "Filipenses", abbrev: "Fl", chapters: 4, testament: "novo", group: "Cartas" },
  { slug: "colossenses", name: "Colossenses", abbrev: "Cl", chapters: 4, testament: "novo", group: "Cartas" },
  { slug: "1-tessalonicenses", name: "1 Tessalonicenses", abbrev: "1Ts", chapters: 5, testament: "novo", group: "Cartas" },
  { slug: "2-tessalonicenses", name: "2 Tessalonicenses", abbrev: "2Ts", chapters: 3, testament: "novo", group: "Cartas" },
  { slug: "1-timoteo", name: "1 Timóteo", abbrev: "1Tm", chapters: 6, testament: "novo", group: "Cartas" },
  { slug: "2-timoteo", name: "2 Timóteo", abbrev: "2Tm", chapters: 4, testament: "novo", group: "Cartas" },
  { slug: "tito", name: "Tito", abbrev: "Tt", chapters: 3, testament: "novo", group: "Cartas" },
  { slug: "filemon", name: "Filêmon", abbrev: "Fm", chapters: 1, testament: "novo", group: "Cartas" },
  { slug: "hebreus", name: "Hebreus", abbrev: "Hb", chapters: 13, testament: "novo", group: "Cartas" },
  { slug: "tiago", name: "Tiago", abbrev: "Tg", chapters: 5, testament: "novo", group: "Cartas" },
  { slug: "1-pedro", name: "1 Pedro", abbrev: "1Pd", chapters: 5, testament: "novo", group: "Cartas" },
  { slug: "2-pedro", name: "2 Pedro", abbrev: "2Pd", chapters: 3, testament: "novo", group: "Cartas" },
  { slug: "1-joao", name: "1 João", abbrev: "1Jo", chapters: 5, testament: "novo", group: "Cartas" },
  { slug: "2-joao", name: "2 João", abbrev: "2Jo", chapters: 1, testament: "novo", group: "Cartas" },
  { slug: "3-joao", name: "3 João", abbrev: "3Jo", chapters: 1, testament: "novo", group: "Cartas" },
  { slug: "judas", name: "Judas", abbrev: "Jd", chapters: 1, testament: "novo", group: "Cartas" },
  { slug: "apocalipse", name: "Apocalipse", abbrev: "Ap", chapters: 22, testament: "novo", group: "Cartas" },
];

export function findBook(slug: string): BibleBook | undefined {
  return BIBLE_BOOKS.find((b) => b.slug === slug);
}

/** Traduções que a paróquia pode querer usar — nenhuma embutida no app. */
export const BIBLE_TRANSLATIONS = [
  { code: "ave-maria", name: "Ave Maria" },
  { code: "cnbb", name: "Bíblia Sagrada — CNBB" },
  { code: "pastoral", name: "Edição Pastoral — Paulus" },
  { code: "jerusalem", name: "Bíblia de Jerusalém" },
] as const;

export type BibleTranslationCode = (typeof BIBLE_TRANSLATIONS)[number]["code"];
