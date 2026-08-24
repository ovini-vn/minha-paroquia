import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/prisma";
import { ensureRolesAndPermissionsSeeded } from "@/server/auth/seed-rbac";
import { registerUser } from "@/server/modules/users/service";
import { createDiocese } from "@/server/modules/dioceses/service";
import {
  createProvince,
  setDioceseProvince,
  setArchdiocese,
  assignProvinceMember,
  removeProvinceMember,
  listProvinceMembers,
  listOwnProvinceMemberships,
  listDiocesesInProvince,
  listDiocesesWithoutProvince,
  grantNationalScope,
  revokeNationalScope,
  getOwnNationalMembership,
  listNationalMembers,
} from "@/server/modules/provinces/service";
import { canAccessDiocese, canAccessProvince, hasNationalScope } from "@/server/auth/guards";
import type { SessionContext } from "@/server/auth/session";

function session(partial: Partial<SessionContext> = {}): SessionContext {
  return {
    userId: "00000000-0000-0000-0000-000000000000",
    email: "t@test.comunidade.app",
    fullName: "Teste",
    isPlatformAdmin: false,
    themePreference: "default",
    colorScheme: "light",
    onboardedAt: null,
    membership: null,
    dioceses: [],
    provinces: [],
    national: null,
    permissions: [],
    ...partial,
  };
}

describe("província eclesiástica e escopo nacional", () => {
  let provAId: string;
  let provBId: string;
  let arqAId: string;
  let diocA2Id: string;
  let diocBId: string;
  let arcebispoId: string;
  let outroId: string;
  const userIds: string[] = [];
  const dioceseIds: string[] = [];
  const provinceIds: string[] = [];
  const stamp = Date.now();

  beforeAll(async () => {
    await ensureRolesAndPermissionsSeeded();

    const [provA, provB] = await Promise.all([
      createProvince({ name: `Província A ${stamp}` }),
      createProvince({ name: `Província B ${stamp}` }),
    ]);
    provAId = provA.id;
    provBId = provB.id;
    provinceIds.push(provA.id, provB.id);

    const [arqA, diocA2, diocB] = await Promise.all([
      createDiocese({ name: `Arquidiocese A ${stamp}` }),
      createDiocese({ name: `Diocese A2 ${stamp}` }),
      createDiocese({ name: `Diocese B ${stamp}` }),
    ]);
    arqAId = arqA.id;
    diocA2Id = diocA2.id;
    diocBId = diocB.id;
    dioceseIds.push(arqA.id, diocA2.id, diocB.id);

    const [arcebispo, outro] = await Promise.all([
      registerUser({
        fullName: "Dom Arcebispo",
        email: `arceb-${stamp}@test.comunidade.app`,
        password: "SenhaForte123",
      }),
      registerUser({
        fullName: "Outra Pessoa",
        email: `outro-${stamp}@test.comunidade.app`,
        password: "SenhaForte123",
      }),
    ]);
    arcebispoId = arcebispo.id;
    outroId = outro.id;
    userIds.push(arcebispo.id, outro.id);
  });

  afterAll(async () => {
    await prisma.provinceMembership.deleteMany({ where: { provinceId: { in: provinceIds } } });
    await prisma.nationalMembership.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.diocese.deleteMany({ where: { id: { in: dioceseIds } } });
    await prisma.ecclesiasticalProvince.deleteMany({ where: { id: { in: provinceIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  });

  it("rejeita província sem nome", async () => {
    await expect(createProvince({ name: "  " })).rejects.toThrow();
  });

  it("diocese começa sem província e continua válida", async () => {
    const soltas = await listDiocesesWithoutProvince();
    expect(soltas.map((d) => d.id)).toEqual(expect.arrayContaining([arqAId, diocBId]));
  });

  it("vincula dioceses à província", async () => {
    await setDioceseProvince(arqAId, provAId);
    await setDioceseProvince(diocA2Id, provAId);
    await setDioceseProvince(diocBId, provBId);

    expect(await listDiocesesInProvince(provAId)).toHaveLength(2);
    expect(await listDiocesesInProvince(provBId)).toHaveLength(1);
  });

  it("rejeita vincular a província inexistente", async () => {
    await expect(
      setDioceseProvince(arqAId, "00000000-0000-0000-0000-000000000000"),
    ).rejects.toThrow();
  });

  it("marcar a sede metropolitana desmarca a anterior da mesma província", async () => {
    await setArchdiocese(arqAId);
    let naA = await listDiocesesInProvince(provAId);
    expect(naA.filter((d) => d.isArchdiocese)).toHaveLength(1);
    expect(naA[0]?.id).toBe(arqAId); // sede vem primeiro na ordenação

    // Trocar a sede não pode deixar duas.
    await setArchdiocese(diocA2Id);
    naA = await listDiocesesInProvince(provAId);
    expect(naA.filter((d) => d.isArchdiocese)).toHaveLength(1);
    expect(naA.find((d) => d.isArchdiocese)?.id).toBe(diocA2Id);

    await setArchdiocese(arqAId);
  });

  it("rejeita marcar como sede uma diocese sem província", async () => {
    const solta = await createDiocese({ name: `Diocese Solta ${stamp}` });
    dioceseIds.push(solta.id);
    await expect(setArchdiocese(solta.id)).rejects.toThrow();
  });

  it("vincula o arcebispo e ele lê o próprio vínculo", async () => {
    await assignProvinceMember(provAId, `arceb-${stamp}@test.comunidade.app`, "ARCEBISPO_METROPOLITA");

    const meus = await listOwnProvinceMemberships(arcebispoId);
    expect(meus).toHaveLength(1);
    expect(meus[0]?.province.id).toBe(provAId);
    expect(meus[0]?.role).toBe("ARCEBISPO_METROPOLITA");
  });

  it("um usuário não enxerga o vínculo provincial de outro", async () => {
    expect(await listOwnProvinceMemberships(outroId)).toHaveLength(0);
  });

  it("listar membros da província devolve quem está vinculado", async () => {
    // Regressão: sem contexto de província o RLS devolveria lista vazia.
    const membros = await listProvinceMembers(provAId);
    expect(membros).toHaveLength(1);
    expect(membros[0]?.user.fullName).toBe("Dom Arcebispo");
    expect(await listProvinceMembers(provBId)).toHaveLength(0);
  });

  it("arcebispo alcança as dioceses DA SUA província, e só elas", async () => {
    const arceb = session({
      provinces: [{ id: provAId, name: "A", role: "ARCEBISPO_METROPOLITA" }],
    });

    // Chega às dioceses da província A sem ter vínculo direto com nenhuma.
    expect(await canAccessDiocese(arceb, arqAId)).toBe(true);
    expect(await canAccessDiocese(arceb, diocA2Id)).toBe(true);
    // A diocese da província B continua fora.
    expect(await canAccessDiocese(arceb, diocBId)).toBe(false);
  });

  it("arcebispo não alcança província alheia", () => {
    const arceb = session({
      provinces: [{ id: provAId, name: "A", role: "ARCEBISPO_METROPOLITA" }],
    });
    expect(canAccessProvince(arceb, provAId)).toBe(true);
    expect(canAccessProvince(arceb, provBId)).toBe(false);
  });

  it("bispo de uma diocese não alcança a província nem as diocesas irmãs", async () => {
    const bispo = session({
      dioceses: [{ id: arqAId, name: "Arq A", state: null, role: "BISPO" }],
    });
    expect(await canAccessDiocese(bispo, arqAId)).toBe(true);
    // Ser bispo de uma diocese não dá acesso à diocese vizinha da província.
    expect(await canAccessDiocese(bispo, diocA2Id)).toBe(false);
    expect(canAccessProvince(bispo, provAId)).toBe(false);
  });

  it("concede escopo nacional e ele alcança qualquer diocese", async () => {
    await grantNationalScope(`outro-${stamp}@test.comunidade.app`, "PRESIDENTE_CNBB");

    const proprio = await getOwnNationalMembership(outroId);
    expect(proprio?.role).toBe("PRESIDENTE_CNBB");

    const nacional = session({ national: { role: "PRESIDENTE_CNBB" } });
    expect(hasNationalScope(nacional)).toBe(true);
    expect(await canAccessDiocese(nacional, arqAId)).toBe(true);
    expect(await canAccessDiocese(nacional, diocBId)).toBe(true);
    expect(canAccessProvince(nacional, provBId)).toBe(true);
  });

  it("escopo nacional é distinto de admin da plataforma", () => {
    const nacional = session({ national: { role: "OBSERVADOR_NACIONAL" } });
    // Vê tudo, mas não é admin técnico: quem cria províncias é o admin.
    expect(hasNationalScope(nacional)).toBe(true);
    expect(nacional.isPlatformAdmin).toBe(false);
  });

  it("quem não tem escopo algum não alcança nada", async () => {
    const ninguem = session();
    expect(hasNationalScope(ninguem)).toBe(false);
    expect(await canAccessDiocese(ninguem, arqAId)).toBe(false);
    expect(canAccessProvince(ninguem, provAId)).toBe(false);
  });

  it("revogar tira o escopo nacional", async () => {
    expect(await listNationalMembers()).toHaveLength(1);
    await revokeNationalScope(outroId);
    expect(await getOwnNationalMembership(outroId)).toBeNull();
    expect(await listNationalMembers()).toHaveLength(0);
  });

  it("remover o vínculo tira o acesso do arcebispo", async () => {
    await removeProvinceMember(provAId, arcebispoId);
    expect(await listOwnProvinceMemberships(arcebispoId)).toHaveLength(0);
  });

  it("desvincular a diocese tira o alcance do arcebispo sobre ela", async () => {
    const arceb = session({
      provinces: [{ id: provAId, name: "A", role: "ARCEBISPO_METROPOLITA" }],
    });
    expect(await canAccessDiocese(arceb, diocA2Id)).toBe(true);

    await setDioceseProvince(diocA2Id, null);
    expect(await canAccessDiocese(arceb, diocA2Id)).toBe(false);
  });
});
