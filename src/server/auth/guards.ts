import "server-only";
import { redirect } from "next/navigation";
import { ForbiddenError, UnauthorizedError } from "@/server/shared/errors";
import { getSessionContext, type SessionContext } from "./session";
import type { PermissionCode } from "./rbac";

/** Para Server Actions: lança erro claro em vez de redirecionar. */
export async function requireSession(): Promise<SessionContext> {
  const session = await getSessionContext();
  if (!session) throw new UnauthorizedError();
  return session;
}

/** Para Server Components de página/layout: redireciona para o login. */
export async function requireSessionForPage(): Promise<SessionContext> {
  const session = await getSessionContext();
  if (!session) redirect("/login");
  return session;
}

export function requirePermission(session: SessionContext, code: PermissionCode): void {
  if (!session.permissions.includes(code)) {
    throw new ForbiddenError();
  }
}

/** Para Server Components de página: redireciona em vez de lançar erro. */
export async function requirePermissionForPage(code: PermissionCode): Promise<SessionContext> {
  const session = await requireSessionForPage();
  if (!session.isPlatformAdmin && !session.permissions.includes(code)) {
    redirect("/inicio");
  }
  return session;
}

export function requirePlatformAdmin(session: SessionContext): void {
  if (!session.isPlatformAdmin) {
    throw new ForbiddenError();
  }
}

/** Para Server Components de página: só admin da plataforma passa. */
export async function requirePlatformAdminForPage(): Promise<SessionContext> {
  const session = await requireSessionForPage();
  if (!session.isPlatformAdmin) redirect("/inicio");
  return session;
}

/**
 * O usuário supervisiona esta diocese? Admin da plataforma sempre passa.
 *
 * Esta é a ÚNICA porta de entrada para dados diocesanos. O serviço de
 * diocese não checa permissão de propósito (ver o comentário no topo de
 * modules/dioceses/service.ts) — a autorização mora aqui.
 */
export function hasDioceseAccess(session: SessionContext, dioceseId: string): boolean {
  if (session.isPlatformAdmin) return true;
  return session.dioceses.some((d) => d.id === dioceseId);
}

/** Para Server Components de página: redireciona quem não supervisiona a diocese. */
export async function requireDioceseAccessForPage(dioceseId: string): Promise<SessionContext> {
  const session = await requireSessionForPage();
  if (!hasDioceseAccess(session, dioceseId)) redirect("/inicio");
  return session;
}

/** Para Server Actions: lança em vez de redirecionar. */
export function requireDioceseAccess(session: SessionContext, dioceseId: string): void {
  if (!hasDioceseAccess(session, dioceseId)) {
    throw new ForbiddenError();
  }
}
