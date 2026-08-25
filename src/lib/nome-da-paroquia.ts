/**
 * Separa o tipo da comunidade do nome dela.
 *
 * "Paróquia Nossa Senhora de Fátima" não cabe numa linha de cabeçalho de
 * celular, e cortar no meio ("Paróquia Nossa Senhora de Fáti…") esconde
 * justamente a parte que identifica a comunidade — o nome. Separando, o
 * tipo vai pequeno em cima e o nome fica inteiro embaixo.
 *
 * Só separa quando reconhece o começo. Uma comunidade chamada de outro
 * jeito continua aparecendo inteira, sem invenção.
 */

/** Como as comunidades católicas costumam começar o próprio nome. */
const TIPOS = [
  "Paróquia",
  "Quase-Paróquia",
  "Santuário",
  "Basílica",
  "Catedral",
  "Capela",
  "Igreja",
  "Matriz",
  "Reitoria",
  "Comunidade",
  "Área Pastoral",
];

/** Preposições que pertencem ao tipo, não ao nome: "Paróquia de São João". */
const PREPOSICOES = ["de", "da", "do", "das", "dos"];

export type NomeSeparado = {
  /** "Paróquia", "Santuário do"… ou null quando não dá para separar. */
  tipo: string | null;
  /** O que identifica a comunidade — sempre preenchido. */
  nome: string;
};

export function separarNomeDaParoquia(nomeCompleto: string): NomeSeparado {
  const inteiro = nomeCompleto.trim().replace(/\s+/g, " ");
  if (!inteiro) return { tipo: null, nome: "" };

  const tipo = TIPOS.find(
    (t) => inteiro.toLocaleLowerCase("pt-BR").startsWith(`${t.toLocaleLowerCase("pt-BR")} `),
  );
  if (!tipo) return { tipo: null, nome: inteiro };

  let resto = inteiro.slice(tipo.length).trim();

  // "Paróquia de São João": a preposição fica com o tipo, para a segunda
  // linha começar no nome de verdade.
  const primeira = resto.split(" ")[0] ?? "";
  const ehPreposicao = PREPOSICOES.includes(primeira.toLocaleLowerCase("pt-BR"));
  const tipoFinal = ehPreposicao ? `${tipo} ${primeira}` : tipo;
  if (ehPreposicao) resto = resto.slice(primeira.length).trim();

  // Sobrou só o tipo ("Paróquia", "Paróquia de"): não há o que separar.
  if (!resto) return { tipo: null, nome: inteiro };

  return { tipo: tipoFinal, nome: resto };
}
