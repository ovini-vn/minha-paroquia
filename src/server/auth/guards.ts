import "server-only";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db/prisma";
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
 * O usuário alcança esta diocese?
 *
 * Quatro caminhos, do mais amplo ao mais estreito:
 *   1. admin da plataforma (papel técnico);
 *   2. escopo nacional (CNBB) — todas as dioceses;
 *   3. arcebispo/administrador da PROVÍNCIA a que a diocese pertence;
 *   4. bispo/administrador da própria diocese.
 *
 * É assíncrona por causa do caminho 3: a sessão carrega as províncias do
 * usuário, mas a ligação diocese→província mora no banco. Consultar na hora
 * é mais seguro do que materializar a lista na sessão — se um vínculo mudar,
 * o acesso acompanha na requisição seguinte, sem sessão obsoleta abrindo
 * porta.
 *
 * Esta é a ÚNICA porta de entrada para dados diocesanos: os serviços não
 * checam permissão de propósito, a autorização mora aqui.
 */
export async function canAccessDiocese(
  session: SessionContext,
  dioceseId: string,
): Promise<boolean> {
  if (session.isPlatformAdmin) return true;
  if (session.national) return true;
  if (session.dioceses.some((d) => d.id === dioceseId)) return true;
  if (session.provinces.length === 0) return false;

  const diocese = await prisma.diocese.findUnique({
    where: { id: dioceseId },
    select: { provinceId: true },
  });
  if (!diocese?.provinceId) return false;
  return session.provinces.some((p) => p.id === diocese.provinceId);
}

/** Para Server Components de página: redireciona quem não alcança a diocese. */
export async function requireDioceseAccessForPage(dioceseId: string): Promise<SessionContext> {
  const session = await requireSessionForPage();
  if (!(await canAccessDiocese(session, dioceseId))) redirect("/inicio");
  return session;
}

/** Para Server Actions: lança em vez de redirecionar. */
export async function requireDioceseAccess(
  session: SessionContext,
  dioceseId: string,
): Promise<void> {
  if (!(await canAccessDiocese(session, dioceseId))) {
    throw new ForbiddenError();
  }
}

/**
 * Província: admin da plataforma e escopo nacional passam; fora isso, só
 * quem tem vínculo com aquela província.
 */
export function canAccessProvince(session: SessionContext, provinceId: string): boolean {
  if (session.isPlatformAdmin) return true;
  if (session.national) return true;
  return session.provinces.some((p) => p.id === provinceId);
}

export async function requireProvinceAccessForPage(provinceId: string): Promise<SessionContext> {
  const session = await requireSessionForPage();
  if (!canAccessProvince(session, provinceId)) redirect("/inicio");
  return session;
}

export function requireProvinceAccess(session: SessionContext, provinceId: string): void {
  if (!canAccessProvince(session, provinceId)) {
    throw new ForbiddenError();
  }
}

/** Escopo nacional (CNBB) — ou admin da plataforma. */
export function hasNationalScope(session: SessionContext): boolean {
  return session.isPlatformAdmin || session.national !== null;
}

export async function requireNationalScopeForPage(): Promise<SessionContext> {
  const session = await requireSessionForPage();
  if (!hasNationalScope(session)) redirect("/inicio");
  return session;
}
