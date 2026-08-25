import { NextResponse, type NextRequest } from "next/server";
import { generateOpaqueToken } from "@/server/auth/tokens";
import { isValidOAuthProvider, isOAuthConfigured, buildAuthorizeUrl } from "@/server/auth/oauth";
import { appBaseUrl } from "@/lib/url";

// 10 minutos é tempo de sobra pra completar o consentimento no
// Google/Facebook; depois disso o fluxo é considerado abandonado.
const FLOW_TTL_SECONDS = 10 * 60;
const STATE_COOKIE = "oauth_state";
const INVITE_COOKIE = "oauth_convite";

/**
 * O endereço de retorno precisa ser SEMPRE o mesmo, venha a pessoa por onde
 * vier.
 *
 * Montar a partir de `request.url` fazia o endereço mudar conforme o domínio
 * usado para chegar aqui — uma URL de pré-visualização da Vercel, um apelido
 * novo, o localhost —, e o Google recusa qualquer um que não esteja
 * cadastrado: é o erro 400 redirect_uri_mismatch.
 *
 * `APP_URL` é o endereço público canônico; em desenvolvimento cai no
 * localhost. Precisa ser idêntico aqui e na troca do código pelo token,
 * porque o provedor compara os dois.
 */
function redirectUriFor(provider: string): string {
  return new URL(`/api/auth/${provider}/callback`, appBaseUrl()).toString();
}

/**
 * Início do login social — redireciona para a tela de consentimento do
 * provedor. `state` (CSRF) e o código de convite (se veio na URL) ficam em
 * cookies httpOnly de curta duração, lidos de volta pelo callback — não há
 * form nem Server Action nesse trecho do fluxo, então não dá pra carregar
 * esses dados como campo de formulário como no cadastro/login por senha.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  if (!isValidOAuthProvider(provider) || !isOAuthConfigured(provider)) {
    return NextResponse.redirect(new URL("/login?error=oauth_unavailable", request.url));
  }

  const state = generateOpaqueToken();
  const convite = request.nextUrl.searchParams.get("convite")?.trim() || null;
  const redirectUri = redirectUriFor(provider);

  const response = NextResponse.redirect(buildAuthorizeUrl(provider, redirectUri, state));
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: FLOW_TTL_SECONDS,
  };
  response.cookies.set(STATE_COOKIE, state, cookieOptions);
  if (convite) response.cookies.set(INVITE_COOKIE, convite, cookieOptions);
  else response.cookies.delete(INVITE_COOKIE);

  return response;
}
