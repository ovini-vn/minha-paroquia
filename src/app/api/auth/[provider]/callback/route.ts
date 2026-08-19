import { NextResponse, type NextRequest } from "next/server";
import { isValidOAuthProvider, resolveOAuthProfile } from "@/server/auth/oauth";
import { findOrCreateUserFromOAuth } from "@/server/modules/users/service";
import { createSession } from "@/server/auth/session";
import { tryAcceptInvitationIfPresent } from "@/server/modules/invitations/accept-if-present";
import { AppError } from "@/server/shared/errors";

const STATE_COOKIE = "oauth_state";
const INVITE_COOKIE = "oauth_convite";

/**
 * Volta do provedor com `code`+`state`. Valida o state contra o cookie
 * setado no início do fluxo (CSRF — garante que essa requisição veio de um
 * redirecionamento que nós mesmos iniciamos), troca o code por um token de
 * acesso, busca o perfil, acha/cria o usuário e cria a sessão do jeito
 * normal (createSession, igual ao login por senha).
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const loginErrorUrl = (reason: string) => new URL(`/login?error=${encodeURIComponent(reason)}`, request.url);

  if (!isValidOAuthProvider(provider)) {
    return NextResponse.redirect(loginErrorUrl("oauth"));
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const storedState = request.cookies.get(STATE_COOKIE)?.value;
  const inviteCode = request.cookies.get(INVITE_COOKIE)?.value || null;

  const clearFlowCookies = (response: NextResponse) => {
    response.cookies.delete(STATE_COOKIE);
    response.cookies.delete(INVITE_COOKIE);
    return response;
  };

  if (!code || !state || !storedState || state !== storedState) {
    return clearFlowCookies(NextResponse.redirect(loginErrorUrl("oauth_state")));
  }

  const redirectUri = new URL(`/api/auth/${provider}/callback`, request.url).toString();

  let userId: string;
  try {
    const profile = await resolveOAuthProfile(provider, code, redirectUri);
    const user = await findOrCreateUserFromOAuth(profile);
    userId = user.id;
  } catch (error) {
    if (error instanceof AppError) {
      return clearFlowCookies(NextResponse.redirect(loginErrorUrl(error.message)));
    }
    throw error;
  }

  await createSession(userId);
  await tryAcceptInvitationIfPresent(userId, inviteCode);

  return clearFlowCookies(NextResponse.redirect(new URL("/inicio", request.url)));
}
