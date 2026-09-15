/**
 * Funcionalidades DESLIGADAS de propósito, e o motivo de cada uma.
 *
 * Desligar aqui não apaga nada: o código, as tabelas e os testes continuam,
 * e religar é trocar o valor. Cada lugar que obedece à chave diz isso no
 * próprio comentário, para quem cair nele sem ter visto este arquivo.
 */

/**
 * CONVITES — desligados em 15/09/2026, por decisão do usuário.
 *
 * O app está em uma paróquia só. Qualquer pessoa já entra sozinha:
 * cria a conta, escolhe a paróquia e vira fiel, sem aprovação — e agora
 * também pode mudar de paróquia por Eu. Com isso o convite não resolvia
 * nada que faltasse, e a tela de Convites era mais uma coisa para a
 * secretaria entender.
 *
 * O que a chave desliga:
 * - Painel › Convites some do menu e da página inicial do painel, e o
 *   endereço /painel/convites responde "não encontrado".
 * - Criar e cancelar convite são recusados no servidor.
 * - O link público /convite/<código> explica que os convites estão
 *   desligados e leva ao cadastro normal.
 * - Cadastro, login e Google/Facebook ignoram um código de convite que
 *   venha no endereço: a pessoa escolhe a paróquia como todo mundo.
 *
 * Quem precisa de outro papel (sacerdote, catequista, secretaria) entra
 * como fiel, e o papel é trocado em Painel › Membros e papéis — que já cria
 * o perfil de sacerdote quando é o caso.
 *
 * Os convites que já existem no banco ficam como estão, sem efeito.
 */
export const CONVITES_ATIVOS = false;
