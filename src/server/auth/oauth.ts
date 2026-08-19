import "server-only";
import { ValidationError } from "@/server/shared/errors";
import type { OAuthProfile } from "@/server/modules/users/service";

export const OAUTH_PROVIDERS = ["google", "facebook"] as const;
export type OAuthProviderCode = (typeof OAUTH_PROVIDERS)[number];

export function isValidOAuthProvider(value: string): value is OAuthProviderCode {
  return (OAUTH_PROVIDERS as readonly string[]).includes(value);
}

type ProviderConfig = {
  authorizeUrl: string;
  tokenUrl: string;
  userinfoUrl: string;
  scope: string;
  clientId: string | undefined;
  clientSecret: string | undefined;
};

function configFor(provider: OAuthProviderCode): ProviderConfig {
  if (provider === "google") {
    return {
      authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      userinfoUrl: "https://www.googleapis.com/oauth2/v3/userinfo",
      scope: "openid email profile",
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    };
  }
  return {
    authorizeUrl: "https://www.facebook.com/v19.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v19.0/oauth/access_token",
    userinfoUrl: "https://graph.facebook.com/me?fields=id,name,email",
    scope: "email public_profile",
    clientId: process.env.FACEBOOK_CLIENT_ID,
    clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
  };
}

export function isOAuthConfigured(provider: OAuthProviderCode): boolean {
  const config = configFor(provider);
  return Boolean(config.clientId && config.clientSecret);
}

export function buildAuthorizeUrl(provider: OAuthProviderCode, redirectUri: string, state: string): string {
  const config = configFor(provider);
  if (!config.clientId) throw new ValidationError("Login social não está configurado.");

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUri,
    scope: config.scope,
    state,
    response_type: "code",
  });
  return `${config.authorizeUrl}?${params.toString()}`;
}

async function exchangeCodeForToken(
  provider: OAuthProviderCode,
  code: string,
  redirectUri: string,
): Promise<string> {
  const config = configFor(provider);
  if (!config.clientId || !config.clientSecret) throw new ValidationError("Login social não está configurado.");

  const params = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: params.toString(),
  });
  if (!response.ok) throw new ValidationError("Não foi possível concluir o login social.");

  const data = (await response.json()) as { access_token?: string };
  if (!data.access_token) throw new ValidationError("Não foi possível concluir o login social.");
  return data.access_token;
}

type GoogleUserinfo = { sub: string; email?: string; email_verified?: boolean; name?: string };
type FacebookUserinfo = { id: string; email?: string; name?: string };

async function fetchProfile(provider: OAuthProviderCode, accessToken: string): Promise<OAuthProfile> {
  const config = configFor(provider);
  const response = await fetch(config.userinfoUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) throw new ValidationError("Não foi possível obter seus dados do provedor.");

  if (provider === "google") {
    const data = (await response.json()) as GoogleUserinfo;
    // Só confiamos no e-mail para linkar a uma conta existente se o próprio
    // Google confirma que ele foi verificado — evita alguém "roubar" outra
    // conta usando um e-mail Google não verificado que bata com um e-mail
    // já cadastrado aqui.
    if (!data.email || !data.email_verified) {
      throw new ValidationError("Sua conta Google precisa ter um e-mail verificado.");
    }
    return { provider: "google", providerAccountId: data.sub, email: data.email, fullName: data.name || data.email };
  }

  const data = (await response.json()) as FacebookUserinfo;
  if (!data.email) {
    throw new ValidationError("Sua conta Facebook precisa de um e-mail para entrar aqui.");
  }
  return { provider: "facebook", providerAccountId: data.id, email: data.email, fullName: data.name || data.email };
}

export async function resolveOAuthProfile(
  provider: OAuthProviderCode,
  code: string,
  redirectUri: string,
): Promise<OAuthProfile> {
  const accessToken = await exchangeCodeForToken(provider, code, redirectUri);
  return fetchProfile(provider, accessToken);
}
