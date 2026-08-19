import { randomBytes, createHash } from "node:crypto";

/**
 * Tokens opacos (não JWT): geramos um valor aleatório, entregamos o valor cru
 * ao cliente (cookie ou link de e-mail) e guardamos só o hash no banco. Sem
 * chave de assinatura para gerenciar/rotacionar, e a revogação é uma
 * atualização de linha, não uma lista de negação separada.
 */
export function generateOpaqueToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
