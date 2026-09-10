import type { Prisma } from "@prisma/client";

/**
 * A trilha que ensina o aplicativo, uma dica por vez.
 *
 * O problema que ela resolve: o app faz muita coisa e o fiel descobre
 * quase nada sozinho. Em produção, nove pessoas entraram e não usaram
 * nada — nenhum pedido de oração, nenhum sacramento registrado, nenhuma
 * candidatura a servir. Não é falta de interesse: é que ninguém sabe que
 * existe.
 *
 * REGRA CENTRAL: cada dica sabe reconhecer que já foi cumprida, e some
 * quando isso acontece. Uma trilha que continua falando de algo que a
 * pessoa já fez é a definição de chato — e é o que faz alguém desligar as
 * notificações inteiras, inclusive as de missa.
 *
 * O que NÃO está aqui, de propósito:
 *
 * - Ordem fixa. A escolha é sorteada entre as pendentes, para a trilha não
 *   parecer um funil de vendas com etapas.
 * - Dica por pastoral específica. O app guarda INTERESSE em pastoral
 *   (`PastoralGroupInterest`), não participação, e o nome do grupo é texto
 *   livre sem taxonomia — não há como escrever automaticamente a dica certa
 *   para "Pastoral da Criança". O recorte que existe de verdade é o PAPEL,
 *   que é estruturado, e é por ele que `publico` segmenta.
 */

/** Quem recebe a dica. `todos` é o padrão; os outros são recortes por papel. */
export type PublicoDaDica = "todos" | "catequista" | "ministro" | "administra";

export type Dica = {
  /** Estável e humano: vira a chave do carimbo de envio, e ela dura para sempre. */
  id: string;
  titulo: string;
  corpo: string;
  /** Onde a funcionalidade mora. É o destino do toque E o alvo da bolinha. */
  linkPath: string;
  publico: PublicoDaDica;
  /**
   * Já fez? Recebe o que precisa e responde sim/não.
   *
   * Cada dica traz o próprio jeito de perguntar, porque cada funcionalidade
   * grava a prova num lugar diferente — e algumas não gravam em lugar
   * nenhum (ver `SEM_RASTRO` abaixo).
   */
  jaUsou: (tx: Prisma.TransactionClient, alvo: { parishId: string; userId: string }) => Promise<boolean>;
};

/**
 * Telas de LEITURA não deixam rastro, e é por isso que estas dicas não têm
 * `jaUsou` próprio.
 *
 * Abrir a Bíblia ou a Agenda não grava linha nenhuma — e criar uma tabela
 * só para registrar "fulano leu" seria vigiar leitura para vender dica.
 *
 * A saída já existia no app: `markNotificationsReadByPath` dá a notificação
 * por lida quando a pessoa abre a tela onde o assunto mora. Então, para
 * estas, TOCAR NA DICA É A PROVA — se ela chegou lá, aprendeu, e o motor
 * não repete (o carimbo de envio impede).
 */
async function semRastro(): Promise<boolean> {
  return false;
}

export const DICAS: Dica[] = [
  {
    id: "sacramentos",
    titulo: "As datas da sua vida na igreja",
    corpo:
      "Batismo, crisma, casamento — registre as suas datas na Caminhada. Elas ficam guardadas com você.",
    linkPath: "/caminhada",
    publico: "todos",
    jaUsou: (tx, { parishId, userId }) =>
      tx.sacrament.count({ where: { parishId, userId } }).then((n) => n > 0),
  },
  {
    id: "aniversario",
    titulo: "Sua data de nascimento",
    corpo: "Preencha seu aniversário no perfil — a paróquia passa a saber quando é o seu dia.",
    linkPath: "/eu/perfil",
    publico: "todos",
    jaUsou: (tx, { userId }) =>
      tx.user.findUnique({ where: { id: userId }, select: { birthDate: true } })
        .then((u) => u?.birthDate != null),
  },
  {
    /*
     * A dica que PEDE PERMISSÃO, e ensina no mesmo gesto.
     *
     * "A comunidade reza por você no seu dia" era a promessa da mensagem
     * original — e era falsa: a política publicada garante que um fiel não
     * alcança dados de outro, então ninguém via a data de ninguém. Em vez
     * de reescrever a promessa para menos, o app passou a poder cumpri-la —
     * desde que a pessoa escolha.
     *
     * Vem DEPOIS na prática, mesmo com o sorteio: sem data preenchida a
     * opção não tem o que mostrar, e por isso `jaUsou` responde "já feito"
     * para quem ainda não tem nascimento nem sacramento. Assim a trilha
     * gasta a vez com a dica útil primeiro.
     */
    id: "compartilhar-datas",
    titulo: "Deixar a comunidade rezar por você",
    corpo:
      "No seu perfil dá para escolher que o seu aniversário apareça para a comunidade na semana em que cai. Sua idade não aparece, e você desmarca quando quiser.",
    linkPath: "/eu/perfil",
    publico: "todos",
    jaUsou: async (tx, { parishId, userId }) => {
      const eu = await tx.user.findUnique({
        where: { id: userId },
        select: { birthDate: true, compartilhaDatas: true },
      });
      if (eu?.compartilhaDatas) return true;
      // Sem data nenhuma, o convite não teria o que revelar.
      const sacramentos = await tx.sacrament.count({ where: { parishId, userId } });
      return eu?.birthDate == null && sacramentos === 0;
    },
  },
  {
    id: "pedido-de-oracao",
    titulo: "Alguém pode rezar com você",
    corpo:
      "Peça uma oração ao pároco, ou compartilhe no mural para a comunidade rezar junto. Pode ser sem o seu nome.",
    linkPath: "/oracao/pedidos",
    publico: "todos",
    jaUsou: (tx, { parishId, userId }) =>
      tx.prayerRequest.count({ where: { parishId, requesterUserId: userId } }).then((n) => n > 0),
  },
  {
    id: "servir",
    titulo: "Existe um lugar para você",
    corpo:
      "Diga em que você pode ajudar — um mutirão, uma pastoral, um domingo. Quem coordena recebe seu nome na hora.",
    linkPath: "/servir",
    publico: "todos",
    jaUsou: (tx, { parishId, userId }) =>
      tx.serviceInterest.count({ where: { parishId, userId } }).then((n) => n > 0),
  },
  {
    id: "pastoral",
    titulo: "As pastorais da nossa paróquia",
    corpo:
      "Veja onde a comunidade se organiza para servir, e diga se quer conhecer alguma de perto.",
    linkPath: "/comunidade/pastorais",
    publico: "todos",
    jaUsou: (tx, { parishId, userId }) =>
      tx.pastoralGroupInterest.count({ where: { parishId, userId } }).then((n) => n > 0),
  },
  {
    id: "atendimento",
    titulo: "Falar com um sacerdote",
    corpo:
      "Confissão, direção espiritual ou uma conversa — dá para ver os horários e pedir pelo aplicativo.",
    linkPath: "/comunidade/sacerdotes",
    publico: "todos",
    jaUsou: (tx, { parishId, userId }) =>
      tx.appointment.count({ where: { parishId, fielUserId: userId } }).then((n) => n > 0),
  },
  {
    id: "familia",
    titulo: "Sua família na paróquia",
    corpo:
      "Cadastre quem depende de você — filhos na catequese, por exemplo — e acompanhe a caminhada deles junto.",
    linkPath: "/eu/familia",
    publico: "todos",
    jaUsou: (tx, { parishId, userId }) =>
      tx.familyMember.count({ where: { parishId, responsibleUserId: userId } }).then((n) => n > 0),
  },
  {
    id: "avisos-no-aparelho",
    titulo: "Ser avisado sem abrir o app",
    corpo:
      "Ative os avisos no aparelho e receba lembrete na véspera do que você assumiu — escala, mutirão, atendimento.",
    linkPath: "/eu/notificacoes",
    publico: "todos",
    jaUsou: (tx, { userId }) =>
      tx.webPushSubscription.count({ where: { userId } }).then((n) => n > 0),
  },
  {
    id: "ofertar",
    titulo: "Fazer parte das obras",
    corpo:
      "Escolha onde a sua oferta ajuda e gere o seu código. O valor é sempre seu — o app não sugere quantia nenhuma.",
    linkPath: "/doacao",
    publico: "todos",
    jaUsou: (tx, { parishId, userId }) =>
      tx.pixDeContribuicao.count({ where: { parishId, userId } }).then((n) => n > 0),
  },
  {
    id: "missa-na-caminhada",
    titulo: "Guardar as missas que você viveu",
    corpo:
      "Registre as missas na sua Caminhada. É só seu — a paróquia não vê, e ninguém é cobrado por isso.",
    linkPath: "/caminhada",
    publico: "todos",
    jaUsou: (tx, { parishId, userId }) =>
      tx.massParticipation.count({ where: { parishId, userId } }).then((n) => n > 0),
  },

  // ---- Telas de leitura: a prova é o toque na própria dica ----
  {
    id: "biblia",
    titulo: "A Bíblia inteira, no bolso",
    corpo: "Os 73 livros, com busca por palavra. Para quando a leitura do dia deixa uma pergunta.",
    linkPath: "/biblia",
    publico: "todos",
    jaUsou: semRastro,
  },
  {
    id: "plano",
    titulo: "Por que a paróquia faz o que faz",
    corpo: "O plano pastoral deste ano está no aplicativo — as prioridades que a comunidade escolheu.",
    linkPath: "/plano",
    publico: "todos",
    jaUsou: semRastro,
  },
  {
    id: "agenda",
    titulo: "A agenda da comunidade",
    corpo: "Missas, eventos e encontros do mês, com filtro por tipo. Dá para ver em lista ou em calendário.",
    linkPath: "/agenda",
    publico: "todos",
    jaUsou: semRastro,
  },

  // ---- Recortes por papel ----
  {
    id: "liturgia-disponibilidade",
    titulo: "Quando você pode servir na liturgia",
    corpo:
      "Marque os dias em que está disponível e a escala passa a contar com você sem precisar telefonar.",
    linkPath: "/servir/liturgia",
    publico: "ministro",
    jaUsou: (tx, { parishId, userId }) =>
      tx.liturgicalAvailability.count({ where: { parishId, userId } }).then((n) => n > 0),
  },
  {
    id: "catequese-turma",
    titulo: "A chamada da sua turma",
    corpo:
      "Lance a presença do encontro pelo aplicativo — some com a lista de papel e a coordenação enxerga na hora.",
    linkPath: "/catequese",
    publico: "catequista",
    jaUsou: semRastro,
  },
];

/** As dicas visíveis para quem tem estes recortes de papel. */
export function dicasDoPublico(publicos: PublicoDaDica[]): Dica[] {
  const conjunto = new Set<PublicoDaDica>(["todos", ...publicos]);
  return DICAS.filter((d) => conjunto.has(d.publico));
}
