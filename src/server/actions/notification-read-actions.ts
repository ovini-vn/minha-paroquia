"use server";

import { revalidatePath } from "next/cache";
import { getSessionContext } from "@/server/auth/session";
import { markNotificationsReadByPath } from "@/server/modules/notifications/service";

/**
 * Dá por lida a notificação cujo assunto vive na tela recém-aberta.
 *
 * NÃO HÁ MAIS LISTA de caminhos aceitos, e foi ela que manteve as bolinhas
 * acesas. A lista tinha sete endereços; as notificações apontam para mais
 * de quinze. A Palavra do Padre leva a /oracao, as dicas levam à Bíblia, à
 * Agenda, à Família — nenhum na lista. Até /avisos, que chamava esta ação,
 * era recusado em silêncio. Abrir a tela não apagava nada.
 *
 * A lista protegia pouco. O que a ação faz é marcar as notificações DA
 * PRÓPRIA PESSOA, desta paróquia, cujo destino é EXATAMENTE este endereço.
 * Mandar um texto inventado não alcança notificação de ninguém, e o pior
 * que alguém consegue é dar por lida uma notificação sua sem abrir a tela —
 * o que o botão "marcar como lida" já deixa fazer.
 *
 * Fica só a forma: um caminho interno, de tamanho razoável.
 */
export async function darNotificacoesPorLidasAction(caminho: string): Promise<void> {
  const session = await getSessionContext();
  if (!session?.membership) return;
  if (typeof caminho !== "string" || !caminho.startsWith("/") || caminho.startsWith("//")) return;
  if (caminho.length > 200) return;

  const { count } = await markNotificationsReadByPath(
    session.membership.parishId,
    session.userId,
    caminho,
  );

  // Só revalida se algo mudou: o contador de não lidas e a bolinha vivem no
  // cabeçalho de todas as telas, e recarregá-los à toa seria desperdício.
  if (count > 0) revalidatePath("/", "layout");
}
