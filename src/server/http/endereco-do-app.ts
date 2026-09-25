import "server-only";
import { headers } from "next/headers";
import { appBaseUrl } from "@/lib/url";

/**
 * O endereço do app como quem está usando o vê agora.
 *
 * `APP_URL` só existe em produção. No ambiente de teste — um endereço de
 * pré-visualização da Vercel —, um link montado com ele levaria de volta à
 * produção, ou ao `localhost` do fallback. Para links que alguém vai COPIAR
 * e mandar (o de primeiro acesso, o da paróquia), vale o endereço da
 * requisição; sem cabeçalho, o de sempre.
 */
export async function enderecoDoApp(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return appBaseUrl();
  const protocolo = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${protocolo}://${host}`;
}
