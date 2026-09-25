/**
 * A busca do app do fiel: o que dá para achar sem banco.
 *
 * As telas do app, com as palavras que as pessoas de fato usam para
 * procurá-las — "confissão" leva a falar com o padre, "carteirinha" não
 * existe, "horário" leva à agenda. A lista é curta de propósito: cada
 * atalho aqui é uma promessa de que a tela responde àquela palavra.
 */

export type Atalho = { titulo: string; descricao: string; href: string; palavras: string[] };

export const ATALHOS: Atalho[] = [
  { titulo: "Agenda", descricao: "Missas, eventos e celebrações", href: "/agenda", palavras: ["missa", "horario", "horarios", "celebracao", "evento", "festa", "agenda", "adoracao"] },
  { titulo: "Intenção de missa", descricao: "Pedir que a comunidade reze por alguém", href: "/intencoes", palavras: ["intencao", "intencoes", "setimo dia", "falecido", "missa por", "acao de gracas"] },
  { titulo: "Falar com um sacerdote", descricao: "Conversa, confissão e bênção", href: "/comunidade/sacerdotes", palavras: ["padre", "confissao", "confessar", "conversa", "atendimento", "bencao", "sacerdote"] },
  { titulo: "Pedidos de oração", descricao: "Pedir e rezar pelos pedidos da comunidade", href: "/oracao/pedidos", palavras: ["pedido", "oracao", "rezar por", "intercessao"] },
  { titulo: "Rezar", descricao: "Terço, rosário, novenas e Misericórdia", href: "/rezar", palavras: ["terco", "rosario", "novena", "misericordia", "rezar", "oracao"] },
  { titulo: "Bíblia", descricao: "Ler a Bíblia", href: "/biblia", palavras: ["biblia", "evangelho", "salmo", "leitura", "palavra"] },
  { titulo: "Leituras do dia", descricao: "A liturgia da Palavra de hoje", href: "/oracao", palavras: ["leitura", "liturgia", "evangelho do dia", "palavra do dia", "homilia"] },
  { titulo: "Catecismo", descricao: "O Catecismo da Igreja", href: "/catecismo", palavras: ["catecismo", "doutrina", "fe"] },
  { titulo: "Catequese", descricao: "Turmas e encontros da catequese", href: "/catequese", palavras: ["catequese", "primeira comunhao", "crisma", "eucaristia", "catequista"] },
  { titulo: "Preparar um batismo", descricao: "Documentos e encontros de pais e padrinhos", href: "/preparacao/batismo", palavras: ["batismo", "batizar", "batizado", "padrinho", "madrinha", "documentos"] },
  { titulo: "Preparar um casamento", descricao: "Documentos e encontro de noivos", href: "/preparacao/casamento", palavras: ["casamento", "casar", "noivos", "noiva", "matrimonio", "curso de noivos", "documentos"] },
  { titulo: "Minha Caminhada", descricao: "Sacramentos, missas e confissões", href: "/caminhada", palavras: ["caminhada", "sacramento", "batismo", "crisma", "casamento", "matrimonio"] },
  { titulo: "Servir", descricao: "Pastorais e onde ajudar", href: "/servir", palavras: ["servir", "pastoral", "voluntario", "ajudar", "grupo", "ministerio"] },
  { titulo: "Meus compromissos", descricao: "Escalas, encontros e tarefas", href: "/eu/compromissos", palavras: ["compromisso", "escala", "tarefa", "encontro"] },
  { titulo: "Ofertar", descricao: "Contribuir com a paróquia", href: "/doacao", palavras: ["ofertar", "oferta", "doar", "doacao", "contribuir", "pix", "dizimo"] },
  { titulo: "Dízimo", descricao: "Minha participação por período", href: "/eu/dizimo", palavras: ["dizimo", "dizimista"] },
  { titulo: "Avisos", descricao: "O que a paróquia comunicou", href: "/avisos", palavras: ["aviso", "comunicado", "recado", "noticia"] },
  { titulo: "Contato e secretaria", descricao: "Endereço, telefone e expediente", href: "/contato", palavras: ["contato", "telefone", "whatsapp", "endereco", "secretaria", "expediente", "email"] },
  { titulo: "Nosso Pároco", descricao: "Quem é o pároco", href: "/paroco", palavras: ["paroco", "padre"] },
  { titulo: "História da paróquia", descricao: "O memorial da comunidade", href: "/historia", palavras: ["historia", "memorial", "fundacao", "padroeira", "padroeiro"] },
  { titulo: "Minha família", descricao: "Dependentes e responsáveis", href: "/eu/familia", palavras: ["familia", "filho", "filha", "dependente"] },
  { titulo: "Aparência", descricao: "Tamanho da letra e tema", href: "/eu/aparencia", palavras: ["letra", "fonte", "tamanho", "tema", "escuro", "aparencia"] },
];

/** Sem acento, minúsculo, espaços simples: "Confissão " vira "confissao". */
export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Todas as palavras do termo aparecem no texto, em qualquer ordem. */
export function casa(termo: string, ...textos: (string | null | undefined)[]): boolean {
  const partes = normalizar(termo).split(" ").filter(Boolean);
  if (partes.length === 0) return false;
  const alvo = normalizar(textos.filter(Boolean).join(" "));
  return partes.every((p) => alvo.includes(p));
}

export function atalhosPara(termo: string): Atalho[] {
  return ATALHOS.filter((a) => casa(termo, a.titulo, a.descricao, a.palavras.join(" ")));
}
