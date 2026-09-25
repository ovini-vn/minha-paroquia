import "server-only";
import { cookies } from "next/headers";

/**
 * De qual paróquia a pessoa veio, quando chegou pelo link dela (ver
 * `app/p/[slug]/route.ts`). É só uma lembrança: sugere a paróquia na hora
 * de escolher, e some quando a escolha acontece.
 */
export const COOKIE_DA_PAROQUIA_DE_ENTRADA = "paroquia_de_entrada";

export async function lerParoquiaDeEntrada(): Promise<string | null> {
  const loja = await cookies();
  return loja.get(COOKIE_DA_PAROQUIA_DE_ENTRADA)?.value ?? null;
}

/** Só em Server Action: é quem pode escrever cookie. */
export async function esquecerParoquiaDeEntrada(): Promise<void> {
  const loja = await cookies();
  loja.delete(COOKIE_DA_PAROQUIA_DE_ENTRADA);
}
