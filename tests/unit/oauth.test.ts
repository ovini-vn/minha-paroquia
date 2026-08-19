import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isValidOAuthProvider, isOAuthConfigured, buildAuthorizeUrl } from "@/server/auth/oauth";

describe("oauth: validação de provedor e construção da URL de autorização", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.FACEBOOK_CLIENT_ID;
    delete process.env.FACEBOOK_CLIENT_SECRET;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("aceita só 'google' e 'facebook' como provedor válido", () => {
    expect(isValidOAuthProvider("google")).toBe(true);
    expect(isValidOAuthProvider("facebook")).toBe(true);
    expect(isValidOAuthProvider("twitter")).toBe(false);
    expect(isValidOAuthProvider("")).toBe(false);
  });

  it("isOAuthConfigured é false sem client id/secret nas variáveis de ambiente", () => {
    expect(isOAuthConfigured("google")).toBe(false);
    expect(isOAuthConfigured("facebook")).toBe(false);
  });

  it("isOAuthConfigured é true quando client id e secret estão presentes", () => {
    process.env.GOOGLE_CLIENT_ID = "id";
    process.env.GOOGLE_CLIENT_SECRET = "secret";
    expect(isOAuthConfigured("google")).toBe(true);
    expect(isOAuthConfigured("facebook")).toBe(false);
  });

  it("buildAuthorizeUrl lança erro se o provedor não está configurado", () => {
    expect(() => buildAuthorizeUrl("google", "http://localhost:3000/api/auth/google/callback", "state123")).toThrow();
  });

  it("buildAuthorizeUrl monta a URL do Google com client_id, redirect_uri e state corretos", () => {
    process.env.GOOGLE_CLIENT_ID = "meu-client-id";
    process.env.GOOGLE_CLIENT_SECRET = "meu-secret";

    const url = new URL(buildAuthorizeUrl("google", "http://localhost:3000/api/auth/google/callback", "state123"));
    expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(url.searchParams.get("client_id")).toBe("meu-client-id");
    expect(url.searchParams.get("redirect_uri")).toBe("http://localhost:3000/api/auth/google/callback");
    expect(url.searchParams.get("state")).toBe("state123");
    expect(url.searchParams.get("response_type")).toBe("code");
  });

  it("buildAuthorizeUrl monta a URL do Facebook corretamente", () => {
    process.env.FACEBOOK_CLIENT_ID = "meu-app-id";
    process.env.FACEBOOK_CLIENT_SECRET = "meu-secret";

    const url = new URL(buildAuthorizeUrl("facebook", "http://localhost:3000/api/auth/facebook/callback", "state456"));
    expect(url.origin + url.pathname).toBe("https://www.facebook.com/v19.0/dialog/oauth");
    expect(url.searchParams.get("client_id")).toBe("meu-app-id");
    expect(url.searchParams.get("state")).toBe("state456");
  });
});
