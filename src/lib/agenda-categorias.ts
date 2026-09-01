import type { CategoriaDaAgenda, CelebrationType } from "@prisma/client";

/**
 * As cores da agenda.
 *
 * Existe porque uma grade de mês sem cor é uma tabela de números: o fiel
 * abre, vê trinta pontinhos iguais e fecha. A cor responde de relance a
 * pergunta que ele faz — "é missa, é reunião, é festa?".
 *
 * SEIS famílias, e não as doze categorias do calendário impresso. Doze
 * cores numa grade de telefone não se distinguem; viram enfeite. O
 * agrupamento é o do fiel, não o da secretaria: ninguém pergunta em que
 * gaveta do plano pastoral a coisa foi arquivada.
 *
 * As cores são tokens próprios (`--cat-*` em globals.css) e não os tokens
 * de estado do app. `error` é vermelho porque algo deu errado; usar
 * vermelho para "festa" ensinaria a interface a mentir.
 */
export const CATEGORIAS: Record<
  CategoriaDaAgenda,
  { rotulo: string; token: string; descricao: string }
> = {
  missa: { rotulo: "Missa", token: "missa", descricao: "Missas da paróquia e das comunidades" },
  oracao: {
    rotulo: "Oração",
    token: "oracao",
    descricao: "Adoração, novena, tríduo, terço",
  },
  sacramento: {
    rotulo: "Sacramentos",
    token: "sacramento",
    descricao: "Batizado, casamento, crisma, primeira eucaristia",
  },
  formacao: {
    rotulo: "Formação",
    token: "formacao",
    descricao: "Cursos, reuniões de conselho, encontros de coordenação",
  },
  comunidade: {
    rotulo: "Comunidade",
    token: "comunidade",
    descricao: "Pastorais, juventude, catequese, grupos bíblicos",
  },
  festa: { rotulo: "Festas", token: "festa", descricao: "Festa da padroeira, quermesse, gincana" },
  outro: { rotulo: "Outros", token: "outro", descricao: "O que não se encaixa nos anteriores" },
};

/** A ordem da legenda: do mais frequente ao menos, como a agenda se lê. */
export const ORDEM_DA_LEGENDA: CategoriaDaAgenda[] = [
  "missa",
  "oracao",
  "sacramento",
  "formacao",
  "comunidade",
  "festa",
  "outro",
];

/**
 * A categoria de uma celebração vem do TIPO dela.
 *
 * Sem coluna nova: a celebração já diz o que é, e duas fontes para a mesma
 * pergunta divergiriam no primeiro dia em que alguém editasse uma delas.
 */
export function categoriaDaCelebracao(tipo: CelebrationType): CategoriaDaAgenda {
  switch (tipo) {
    case "missa":
      return "missa";
    case "adoracao":
      return "oracao";
    case "batizado":
    case "casamento":
    case "confissao":
      return "sacramento";
    default:
      return "oracao";
  }
}

/**
 * As doze gavetas do calendário impresso, nas seis famílias do app.
 *
 * O mapa está aqui, e não no importador, porque ele é conhecimento sobre o
 * DOMÍNIO — outra arquidiocese com outras siglas vai precisar do mesmo
 * tipo de tradução, e ela deve morar onde se lê o que as cores significam.
 */
const DO_CALENDARIO: Record<string, CategoriaDaAgenda> = {
  mis: "missa",
  lit: "oracao",
  dev: "oracao",
  sac: "sacramento",
  for: "formacao",
  reu: "formacao",
  cle: "formacao",
  gbr: "comunidade",
  juv: "comunidade",
  fam: "comunidade",
  sau: "comunidade",
  eve: "festa",
};

export function categoriaDoCalendario(sigla: string): CategoriaDaAgenda {
  return DO_CALENDARIO[sigla] ?? "outro";
}
