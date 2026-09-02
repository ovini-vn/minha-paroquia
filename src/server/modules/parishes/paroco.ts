/**
 * Quem a comunidade vê como pároco.
 *
 * Pode não ser quem tem conta: em muitas paróquias o padre não usa o
 * aplicativo, e é a secretaria que responde por ele. Por isso o nome
 * digitado ganha do nome da conta — é a informação que alguém acabou de
 * afirmar de propósito.
 *
 * QUEM NÃO USA O APLICATIVO TAMBÉM TEM AGENDA desde 02/09/2026: a
 * secretaria publica os horários por ele pelo painel. Antes disso, perfil
 * sem conta era perfil sem agenda, e o botão levaria a lugar nenhum.
 *
 * O que continua valendo é a desconfiança com a CONTA: quem opera a
 * ferramenta pode carregar o papel de Pároco por questão de acesso, sem
 * ser o pároco — e aí mandar o fiel para a agenda dessa pessoa estaria
 * errado. Por isso a conta só vira agenda quando o nome exibido é o dela.
 */

export type Paroco = {
  nome: string;
  titulo: string;
  historia: string | null;
  fotoUrl: string | null;
  /** Preenchido só quando dá para agendar atendimento. */
  priestProfileId: string | null;
  /**
   * Perfil de quem tem o papel de Pároco, exista ou não nome digitado.
   * É por ele que se reconhece um post feito em nome do pároco.
   */
  contaId: string | null;
};

export function resolverParoco(
  parish: {
    parocoNome: string | null;
    parocoTitulo: string | null;
    parocoHistoria: string | null;
    parocoFotoUrl: string | null;
  },
  registrado: {
    id: string;
    title: string;
    nome: string | null;
    photoUrl: string | null;
    userId?: string | null;
    user: { fullName: string; photoUrl: string | null } | null;
  } | null,
): Paroco | null {
  const digitado = parish.parocoNome?.trim() || null;
  const nome = digitado ?? registrado?.nome?.trim() ?? registrado?.user?.fullName ?? null;
  if (!nome) return null;

  const daConta = !digitado && registrado !== null;

  return {
    nome,
    titulo: parish.parocoTitulo?.trim() || registrado?.title || "Pároco",
    historia: parish.parocoHistoria?.trim() || null,
    fotoUrl:
      parish.parocoFotoUrl?.trim() ||
      (daConta ? (registrado.photoUrl ?? registrado.user?.photoUrl ?? null) : null),
    /*
     * Perfil SEM CONTA aponta para a agenda mesmo com nome digitado por
     * cima: ele foi criado de propósito para representar este padre, e não
     * carrega a ambiguidade de uma conta que alguém usa para administrar.
     */
    priestProfileId:
      daConta || (registrado && registrado.userId === null) ? registrado!.id : null,
    contaId: registrado?.id ?? null,
  };
}

/**
 * Quem assina a Palavra do Padre.
 *
 * Em paróquia onde o padre não usa o aplicativo, quem publica é o
 * administrador, usando a conta que carrega o papel de Pároco. Assinar com
 * o nome dessa conta diria ao fiel que outra pessoa escreveu — quando a
 * palavra é do pároco, e é assim que a paróquia decidiu publicá-la.
 *
 * Vale só para os posts dessa conta: os de outros sacerdotes continuam
 * assinados por eles.
 */
export type Assinatura = { nome: string; titulo: string; fotoUrl: string | null };

export function assinaturaDoPost(
  autor: {
    id: string;
    title: string;
    nome?: string | null;
    photoUrl?: string | null;
    user?: { fullName: string; photoUrl?: string | null } | null;
  } | null,
  paroco: Paroco | null,
): Assinatura {
  // Sem autor: publicado por quem não é clero, em nome do pároco.
  if (!autor) {
    return paroco
      ? { nome: paroco.nome, titulo: paroco.titulo, fotoUrl: paroco.fotoUrl }
      : { nome: "Paróquia", titulo: "Palavra do Padre", fotoUrl: null };
  }
  if (paroco && paroco.contaId === autor.id) {
    // A foto vem da apresentação cadastrada, não da conta: quem opera a
    // ferramenta pode não ser o padre, e é o rosto dele que a comunidade
    // precisa reconhecer na mensagem.
    return { nome: paroco.nome, titulo: paroco.titulo, fotoUrl: paroco.fotoUrl };
  }
  return {
    // Sacerdote sem conta assina com o nome do perfil — é o único que ele
    // tem, e é o que a paróquia digitou de propósito.
    nome: autor.nome?.trim() || autor.user?.fullName || "Sacerdote",
    titulo: autor.title,
    fotoUrl: autor.photoUrl ?? autor.user?.photoUrl ?? null,
  };
}
