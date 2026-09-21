import "server-only";
import { cookies } from "next/headers";

/**
 * A paróquia que a administração da plataforma está olhando agora.
 *
 * Existe porque uma pessoa pertence a UMA paróquia por vez (decisão #1 de
 * docs/FUNDACAO.md), e quem administra a plataforma precisa abrir o painel
 * de outra: para preparar uma paróquia nova antes de ela ter gente, para
 * mostrar o app a um pároco, para socorrer uma secretaria no telefone.
 *
 * Antes, o único caminho era MUDAR de paróquia — o que encerra o vínculo
 * atual, e é recusado a quem administra sozinho a própria paróquia. O foco
 * não toca no vínculo de ninguém: é uma lente, não uma mudança.
 *
 * Vale só para administrador da plataforma, e some sozinho em oito horas:
 * é para uma tarde de trabalho, não para morar dentro dela.
 */
export const COOKIE_DO_FOCO = "paroquia_em_foco";

const DURACAO_DO_FOCO_MS = 8 * 60 * 60 * 1000;

/**
 * Qual paróquia focar, dado quem é a pessoa e o que veio no cookie.
 *
 * Separada da leitura do cookie para poder ser testada sem requisição: a
 * regra que importa é "só administrador da plataforma foca", e ela não
 * pode depender de nenhuma tela lembrar de conferir.
 */
export function resolverFoco(isPlatformAdmin: boolean, valorDoCookie: string | null): string | null {
  if (!isPlatformAdmin) return null;
  const parishId = valorDoCookie?.trim();
  return parishId ? parishId : null;
}

export async function lerCookieDoFoco(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_DO_FOCO)?.value ?? null;
}

/** Só pode ser chamado de Server Action — é quem pode escrever cookie. */
export async function focarParoquia(parishId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_DO_FOCO, parishId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: DURACAO_DO_FOCO_MS / 1000,
  });
}

export async function sairDoFoco(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_DO_FOCO);
}
