"use server";

import { revalidatePath } from "next/cache";
import { getSessionContext } from "@/server/auth/session";
import { markNotificationsReadByPath } from "@/server/modules/notifications/service";

/** Caminhos que uma notificação pode apontar — nada além destes é aceito. */
const CAMINHOS_CONHECIDOS = [
  "/inicio",
  "/comunidade",
  "/caminhada",
  "/eu/atendimentos",
  "/servir/liturgia",
  "/painel/servir",
  "/painel/pastorais",
] as const;

/**
 * Dá por lida a notificação cujo assunto vive na tela recém-aberta.
 *
 * O caminho vem do navegador, então é conferido contra uma lista fechada:
 * sem isso, alguém poderia mandar qualquer texto e marcar como lida uma
 * notificação que nunca abriu. O prejuízo seria pequeno — são notificações
 * da própria pessoa —, mas a lista custa nada.
 */
export async function darNotificacoesPorLidasAction(caminho: string): Promise<void> {
  const session = await getSessionContext();
  if (!session?.membership) return;
  if (!(CAMINHOS_CONHECIDOS as readonly string[]).includes(caminho)) return;

  const { count } = await markNotificationsReadByPath(
    session.membership.parishId,
    session.userId,
    caminho,
  );

  // Só revalida se algo mudou: o contador de não lidas vive no cabeçalho de
  // todas as telas, e recarregá-lo à toa a cada visita seria desperdício.
  if (count > 0) revalidatePath("/", "layout");
}
