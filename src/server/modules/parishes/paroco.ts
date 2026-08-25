/**
 * Quem a comunidade vê como pároco.
 *
 * Pode não ser quem tem conta: em muitas paróquias o padre não usa o
 * aplicativo, e é a secretaria que responde por ele. Por isso o nome
 * digitado ganha do nome da conta — é a informação que alguém acabou de
 * afirmar de propósito.
 *
 * Só dá para pedir atendimento quando a pessoa exibida É a da conta: agenda
 * de quem não usa o aplicativo não existe, e o botão levaria a lugar nenhum.
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
    photoUrl: string | null;
    user: { fullName: string; photoUrl: string | null };
  } | null,
): Paroco | null {
  const digitado = parish.parocoNome?.trim() || null;
  const nome = digitado ?? registrado?.user.fullName ?? null;
  if (!nome) return null;

  const daConta = !digitado && registrado !== null;

  return {
    nome,
    titulo: parish.parocoTitulo?.trim() || registrado?.title || "Pároco",
    historia: parish.parocoHistoria?.trim() || null,
    fotoUrl:
      parish.parocoFotoUrl?.trim() ||
      (daConta ? (registrado.photoUrl ?? registrado.user.photoUrl) : null),
    priestProfileId: daConta ? registrado.id : null,
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
export function assinaturaDoPost(
  autor: { id: string; title: string; user: { fullName: string } },
  paroco: Paroco | null,
): { nome: string; titulo: string } {
  if (paroco && paroco.contaId === autor.id) {
    return { nome: paroco.nome, titulo: paroco.titulo };
  }
  return { nome: autor.user.fullName, titulo: autor.title };
}
