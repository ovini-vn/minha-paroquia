import "server-only";
import { cookies } from "next/headers";
import { prisma } from "@/server/db/prisma";
import { withOwnMembershipLookup } from "@/server/db/tenant-context";
import { generateOpaqueToken, hashToken } from "./tokens";
import { computeEffectivePermissions, type PermissionCode, type RoleCode } from "./rbac";
import type { ThemePreference, DioceseRole, ProvinceRole, NationalRole } from "@prisma/client";

export const SESSION_COOKIE_NAME = "comunidade_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

export type SessionContext = {
  userId: string;
  email: string;
  fullName: string;
  isPlatformAdmin: boolean;
  themePreference: ThemePreference;
  membership: {
    parishId: string;
    parishName: string;
    parishSlug: string;
    roleId: string;
    roleCode: RoleCode;
    roleName: string;
  } | null;
  /**
   * Dioceses que este usuário supervisiona. Escopo SEPARADO de `membership`:
   * um bispo pode ter (ou não) vínculo com uma paróquia específica, e isso
   * é independente da diocese que ele acompanha.
   */
  dioceses: { id: string; name: string; state: string | null; role: DioceseRole }[];
  /** Províncias eclesiásticas que este usuário supervisiona (arcebispo). */
  provinces: { id: string; name: string; role: ProvinceRole }[];
  /** Escopo nacional (CNBB) — vê todas as dioceses. null se não tem. */
  national: { role: NationalRole } | null;
  permissions: PermissionCode[];
};

/** Cria a sessão no banco e escreve o cookie. Só pode rodar em Server Action. */
export async function createSession(userId: string): Promise<void> {
  const token = generateOpaqueToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await prisma.session.create({
    data: { userId, tokenHash, expiresAt },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/** Revoga a sessão atual e limpa o cookie. Só pode rodar em Server Action. */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    await prisma.session.updateMany({
      where: { tokenHash: hashToken(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Lê o cookie de sessão e resolve o contexto completo: usuário, vínculo
 * ativo (paróquia + papel) e as permissões desse papel. Retorna null se não
 * houver sessão válida — nunca lança erro, quem chama decide o que fazer.
 */
export async function getSessionContext(): Promise<SessionContext | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });

  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    return null;
  }

  const { user } = session;

  // Tudo o que o usuário pode ler sobre si mesmo antes de haver contexto de
  // tenant, numa transação só: vínculo de paróquia, overrides e vínculos
  // diocesanos (as três políticas de RLS permitem leitura por user_id).
  const { membershipRow, overrides, dioceseRows, provinceRows, nationalRow } =
    await withOwnMembershipLookup(user.id, async (tx) => {
      const membershipRow = await tx.parishMembership.findFirst({
        where: { userId: user.id, status: "active" },
        include: { parish: true, role: { include: { rolePermissions: { include: { permission: true } } } } },
      });
      const overrides = await tx.permissionOverride.findMany({ where: { userId: user.id } });
      const dioceseRows = await tx.dioceseMembership.findMany({
        where: { userId: user.id, status: "active" },
        include: { diocese: { select: { id: true, name: true, state: true } } },
      });
      const provinceRows = await tx.provinceMembership.findMany({
        where: { userId: user.id, status: "active" },
        include: { province: { select: { id: true, name: true } } },
      });
      const nationalRow = await tx.nationalMembership.findFirst({
        where: { userId: user.id, status: "active" },
      });
      return { membershipRow, overrides, dioceseRows, provinceRows, nationalRow };
    });

  const dioceses = dioceseRows.map((row) => ({
    id: row.diocese.id,
    name: row.diocese.name,
    state: row.diocese.state,
    role: row.role,
  }));
  const provinces = provinceRows.map((row) => ({
    id: row.province.id,
    name: row.province.name,
    role: row.role,
  }));
  const national = nationalRow ? { role: nationalRow.role } : null;

  if (!membershipRow) {
    return {
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      isPlatformAdmin: user.isPlatformAdmin,
      themePreference: user.themePreference,
      membership: null,
      dioceses,
      provinces,
      national,
      permissions: [],
    };
  }

  const rolePermissions = membershipRow.role.rolePermissions.map((rp) => rp.permission.code as PermissionCode);

  return {
    userId: user.id,
    email: user.email,
    fullName: user.fullName,
    isPlatformAdmin: user.isPlatformAdmin,
    themePreference: user.themePreference,
    membership: {
      parishId: membershipRow.parishId,
      parishName: membershipRow.parish.name,
      parishSlug: membershipRow.parish.slug,
      roleId: membershipRow.roleId,
      roleCode: membershipRow.role.code as RoleCode,
      roleName: membershipRow.role.name,
    },
    dioceses,
    provinces,
    national,
    permissions: computeEffectivePermissions(rolePermissions, overrides),
  };
}
