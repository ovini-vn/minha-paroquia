import { prisma } from "@/server/db/prisma";
import {
  withOwnMembershipLookup,
  withProvinceContext,
  withPlatformContext,
} from "@/server/db/tenant-context";
import { ValidationError } from "@/server/shared/errors";
import { slugify } from "@/server/shared/slug";
import type { ProvinceRole, NationalRole } from "@prisma/client";

/**
 * Província Eclesiástica e escopo nacional — os dois níveis acima da diocese.
 *
 * O acesso segue a mesma filosofia da diocese (ver modules/dioceses/service.ts):
 * o alcance de leitura é sempre resolvido como um CONJUNTO EXPLÍCITO de ids,
 * e cada consulta de dado paroquial continua passando por withTenantContext.
 * Ninguém — nem o nível nacional — lê dado de paróquia com RLS desligado.
 */

// ---------------------------------------------------------------- Províncias

export function listProvinces() {
  return prisma.ecclesiasticalProvince.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { dioceses: true, memberships: true } } },
  });
}

export function getProvince(id: string) {
  return prisma.ecclesiasticalProvince.findUnique({ where: { id } });
}

export function listDiocesesInProvince(provinceId: string) {
  return prisma.diocese.findMany({
    where: { provinceId },
    // Arquidiocese (sede metropolitana) primeiro — é a cabeça da província.
    orderBy: [{ isArchdiocese: "desc" }, { name: "asc" }],
    include: { _count: { select: { parishes: true } } },
  });
}

export function listDiocesesWithoutProvince() {
  return prisma.diocese.findMany({ where: { provinceId: null }, orderBy: { name: "asc" } });
}

export async function createProvince(input: { name: string }) {
  const name = input.name.trim();
  if (!name) throw new ValidationError("Informe o nome da província.");

  const base = slugify(name);
  if (!base) throw new ValidationError("Nome da província inválido.");

  let slug = base;
  let attempt = 2;
  while (await prisma.ecclesiasticalProvince.findUnique({ where: { slug } })) {
    slug = `${base}-${attempt}`;
    attempt += 1;
  }

  return prisma.ecclesiasticalProvince.create({ data: { name, slug } });
}

export async function setDioceseProvince(dioceseId: string, provinceId: string | null) {
  if (provinceId) {
    const province = await prisma.ecclesiasticalProvince.findUnique({ where: { id: provinceId } });
    if (!province) throw new ValidationError("Província não encontrada.");
  }
  return prisma.diocese.update({ where: { id: dioceseId }, data: { provinceId } });
}

/**
 * Marca a sede metropolitana. Uma província tem uma arquidiocese: ao marcar
 * uma, as outras da mesma província deixam de ser — senão a "cabeça" da
 * província ficaria ambígua.
 */
export async function setArchdiocese(dioceseId: string) {
  const diocese = await prisma.diocese.findUnique({ where: { id: dioceseId } });
  if (!diocese) throw new ValidationError("Diocese não encontrada.");
  if (!diocese.provinceId) {
    throw new ValidationError("Vincule a diocese a uma província antes de marcá-la como sede.");
  }

  return prisma.$transaction([
    prisma.diocese.updateMany({
      where: { provinceId: diocese.provinceId },
      data: { isArchdiocese: false },
    }),
    prisma.diocese.update({ where: { id: dioceseId }, data: { isArchdiocese: true } }),
  ]);
}

/** Vínculos provinciais do próprio usuário — usado ao montar a sessão. */
export function listOwnProvinceMemberships(userId: string) {
  return withOwnMembershipLookup(userId, (tx) =>
    tx.provinceMembership.findMany({
      where: { userId, status: "active" },
      include: { province: { select: { id: true, name: true } } },
    }),
  );
}

/** Toca province_memberships (com RLS) — ver withProvinceContext. */
export async function assignProvinceMember(
  provinceId: string,
  email: string,
  role: ProvinceRole,
) {
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user) {
    throw new ValidationError("Nenhuma conta com esse e-mail. A pessoa precisa se cadastrar antes.");
  }

  return withProvinceContext(provinceId, (tx) =>
    tx.provinceMembership.upsert({
      where: { userId_provinceId: { userId: user.id, provinceId } },
      update: { role, status: "active" },
      create: { userId: user.id, provinceId, role, status: "active" },
    }),
  );
}

export function listProvinceMembers(provinceId: string) {
  return withProvinceContext(provinceId, (tx) =>
    tx.provinceMembership.findMany({
      where: { provinceId, status: "active" },
      include: { user: { select: { fullName: true, email: true } } },
      orderBy: { createdAt: "asc" },
    }),
  );
}

export function removeProvinceMember(provinceId: string, userId: string) {
  return withProvinceContext(provinceId, (tx) =>
    tx.provinceMembership.deleteMany({ where: { provinceId, userId } }),
  );
}

// ------------------------------------------------------------ Escopo nacional

/** Vínculo nacional do próprio usuário — usado ao montar a sessão. */
export function getOwnNationalMembership(userId: string) {
  return withOwnMembershipLookup(userId, (tx) =>
    tx.nationalMembership.findFirst({ where: { userId, status: "active" } }),
  );
}

/**
 * Conceder/revogar escopo nacional usa withPlatformContext — único lugar do
 * app onde a escrita bypassa o RLS, e por uma razão concreta: escopo
 * nacional não tem nada mais estreito a que se amarrar. Quem chama PRECISA
 * ter passado por requirePlatformAdmin.
 */
export async function grantNationalScope(email: string, role: NationalRole) {
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user) {
    throw new ValidationError("Nenhuma conta com esse e-mail. A pessoa precisa se cadastrar antes.");
  }

  return withPlatformContext((tx) =>
    tx.nationalMembership.upsert({
      where: { userId: user.id },
      update: { role, status: "active" },
      create: { userId: user.id, role, status: "active" },
    }),
  );
}

export function revokeNationalScope(userId: string) {
  return withPlatformContext((tx) => tx.nationalMembership.deleteMany({ where: { userId } }));
}

export function listNationalMembers() {
  return withPlatformContext((tx) =>
    tx.nationalMembership.findMany({
      where: { status: "active" },
      include: { user: { select: { id: true, fullName: true, email: true } } },
      orderBy: { createdAt: "asc" },
    }),
  );
}
