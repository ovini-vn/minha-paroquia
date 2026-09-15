import { acceptInvitation } from "./service";
import { CONVITES_ATIVOS } from "@/lib/funcionalidades";

/**
 * Se um código de convite acompanha o cadastro/login (form ou OAuth), tenta
 * aceitar a comunidade logo em seguida. Falha aqui não desfaz a conta/login
 * — o usuário só cai numa Home sem comunidade ativa, que orienta a pedir um
 * novo convite. Compartilhado entre auth-actions.ts (fluxo por senha) e as
 * rotas OAuth (fluxo social), que não podem reusar uma função de dentro de
 * um arquivo "use server".
 */
export async function tryAcceptInvitationIfPresent(userId: string, code: string | null): Promise<void> {
  // Convites desligados (ver src/lib/funcionalidades.ts): um código antigo
  // no endereço não põe ninguém numa paróquia. A pessoa escolhe a dela no
  // passo seguinte, como quem chegou sem código.
  if (!code || !CONVITES_ATIVOS) return;
  try {
    await acceptInvitation({ code, userId });
  } catch {
    // silencioso de propósito: a Home cobre o estado "sem comunidade ativa".
  }
}
