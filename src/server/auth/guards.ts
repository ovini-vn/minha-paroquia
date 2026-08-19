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
