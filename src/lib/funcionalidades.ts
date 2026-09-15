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

/**
 * CATECISMO — oculto em 15/09/2026, por decisão do usuário.
 *
 * Subiu no mesmo dia: a busca por número e assunto na aba Palavra, e os
 * parágrafos ligados aos encontros da Catequese. Foi ocultado enquanto se
 * resolve o direito sobre o texto. O Catecismo é da Libreria Editrice
 * Vaticana, e as traduções são licenciadas; a ideia é pedir autorização
 * (e decidir entre a tradução de Portugal, que está em vatican.va, e a
 * edição brasileira) antes de mostrar o texto dentro do app.
 *
 * O que a chave desliga:
 * - O cartão Catecismo da aba Palavra some, e /catecismo responde "não
 *   encontrado".
 * - No itinerário, "Ligar ao Catecismo" some de cada encontro, e ligar um
 *   parágrafo é recusado no servidor.
 * - A ficha do catequizando perde o "Para ler em casa", e a turma perde o
 *   "Para preparar o próximo encontro".
 *
 * A tabela itinerario_tema_catecismo e o que já foi ligado continuam no
 * banco, sem aparecer. O índice (src/lib/catecismo) e os testes ficam.
 */
export const CATECISMO_ATIVO = false;

/**
 * TERÇO COM A VOZ — protótipo em teste desde 15/09/2026.
 *
 * O aplicativo ouve quem reza, acende as palavras e passa sozinho para a
 * próxima oração. Pedido para quem reza no carro. Fica ligado para o
 * usuário testar em aparelhos reais; o link aparece no Terço marcado como
 * "em teste".
 *
 * Desligar esconde o link e faz /rezar/terco/voz responder "não
 * encontrado". Nada fica guardado: a voz não é gravada nem enviada ao
 * servidor do app.
 */
export const TERCO_COM_A_VOZ_EM_TESTE = true;
