import { NextResponse, type NextRequest } from "next/server";
import { generateOpaqueToken } from "@/server/auth/tokens";
import { isValidOAuthProvider, isOAuthConfigured, buildAuthorizeUrl } from "@/server/auth/oauth";

// 10 minutos é tempo de sobra pra completar o consentimento no
// Google/Facebook; depois disso o fluxo é considerado abandonado.
const FLOW_TTL_SECONDS = 10 * 60;
const STATE_COOKIE = "oauth_state";
const INVITE_COOKIE = "oauth_convite";

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
  const redirectUri = new URL(`/api/auth/${provider}/callback`, request.url).toString();

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
