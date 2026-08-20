import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/prisma";
import { ensureRolesAndPermissionsSeeded } from "@/server/auth/seed-rbac";
import { registerParish } from "@/server/modules/parishes/service";
import { registerUser } from "@/server/modules/users/service";
import { acceptInvitation } from "@/server/modules/invitations/service";
import { createInvitation } from "@/server/modules/invitations/service";
import {
  createDiocese,
  setParishDiocese,
  assignDioceseMember,
  removeDioceseMember,
  listDioceseMembers,
  getDioceseOverview,
  listOwnDioceseMemberships,
  listParishesInDiocese,
  listParishesWithoutDiocese,
} from "@/server/modules/dioceses/service";
import { hasDioceseAccess } from "@/server/auth/guards";
import type { SessionContext } from "@/server/auth/session";
import { cleanupTenantData } from "../helpers/cleanup";

/** Sessão mínima para exercitar só a checagem de acesso diocesano. */
function sessionWith(
  dioceses: SessionContext["dioceses"],
  isPlatformAdmin = false,
): SessionContext {
  return {
    userId: "00000000-0000-0000-0000-000000000000",
    email: "t@test.comunidade.app",
    fullName: "Teste",
    isPlatformAdmin,
    themePreference: "default",
    membership: null,
    dioceses,
    permissions: [],
  };
}

describe("hierarquia diocese → paróquia", () => {
  let dioceseAId: string;
  let dioceseBId: string;
  let parishA1Id: string;
  let parishA2Id: string;
  let parishBId: string;
  let bispoAId: string;
  let fielId: string;
  const userIds: string[] = [];
  const parishIds: string[] = [];
  const dioceseIds: string[] = [];
  const stamp = Date.now();

  beforeAll(async () => {
    await ensureRolesAndPermissionsSeeded();

    const [a1, a2, b] = await Promise.all([
      registerParish({ name: `Par A1 ${stamp}`, city: "Londrina", state: "PR" }),
      registerParish({ name: `Par A2 ${stamp}`, city: "Cambé", state: "PR" }),
      registerParish({ name: `Par B ${stamp}`, city: "Maringá", state: "PR" }),
    ]);
    parishA1Id = a1.id;
    parishA2Id = a2.id;
    parishBId = b.id;
    parishIds.push(a1.id, a2.id, b.id);

    const dioceseA = await createDiocese({ name: `Diocese A ${stamp}`, state: "pr" });
    const dioceseB = await createDiocese({ name: `Diocese B ${stamp}`, state: "PR" });
    dioceseAId = dioceseA.id;
    dioceseBId = dioceseB.id;
    dioceseIds.push(dioceseA.id, dioceseB.id);

    const bispo = await registerUser({
      fullName: "Dom Bispo",
      email: `bispo-${stamp}@test.comunidade.app`,
      password: "SenhaForte123",
    });
    const fiel = await registerUser({
      fullName: "Fiel Comum",
      email: `fiel-dioc-${stamp}@test.comunidade.app`,
      password: "SenhaForte123",
    });
    bispoAId = bispo.id;
    fielId = fiel.id;
    userIds.push(bispo.id, fiel.id);
  });

  afterAll(async () => {
    await prisma.dioceseMembership.deleteMany({ where: { dioceseId: { in: dioceseIds } } });
    await cleanupTenantData({ userIds, parishIds });
    await prisma.diocese.deleteMany({ where: { id: { in: dioceseIds } } });
  });

  it("normaliza a UF e gera slug único", async () => {
    const diocese = await prisma.diocese.findUniqueOrThrow({ where: { id: dioceseAId } });
    expect(diocese.state).toBe("PR");
    expect(diocese.slug).toMatch(/^diocese-a-/);

    // Mesmo nome não quebra: cai em sufixo numérico.
    const repetida = await createDiocese({ name: `Diocese A ${stamp}` });
    dioceseIds.push(repetida.id);
    expect(repetida.slug).toBe(`${diocese.slug}-2`);
  });

  it("rejeita diocese sem nome", async () => {
    await expect(createDiocese({ name: "   " })).rejects.toThrow();
  });

  it("paróquia começa sem diocese e continua válida", async () => {
    const semDiocese = await listParishesWithoutDiocese();
    expect(semDiocese.map((p) => p.id)).toEqual(expect.arrayContaining([parishA1Id, parishBId]));
  });

  it("vincula paróquias e o painel agrega só as da diocese", async () => {
    await setParishDiocese(parishA1Id, dioceseAId);
    await setParishDiocese(parishA2Id, dioceseAId);
    await setParishDiocese(parishBId, dioceseBId);

    const naA = await listParishesInDiocese(dioceseAId);
    expect(naA).toHaveLength(2);

    const overview = await getDioceseOverview(dioceseAId);
    expect(overview?.totals.parishes).toBe(2);
    // A paróquia da diocese B não pode aparecer aqui de forma alguma.
    expect(overview?.parishes.map((p) => p.parishId)).not.toContain(parishBId);
  });

  it("as contagens do painel refletem os membros reais de cada paróquia", async () => {
    // Coloca o fiel na paróquia A1, via o fluxo real de convite.
    const paroco = await registerUser({
      fullName: "Pároco A1",
      email: `paroco-a1-${stamp}@test.comunidade.app`,
      password: "SenhaForte123",
    });
    userIds.push(paroco.id);
    const invite = await createInvitation({
      parishId: parishA1Id,
      createdBy: paroco.id,
      type: "link",
      role: "FIEL",
    });
    await acceptInvitation({ code: invite.code, userId: fielId });

    const overview = await getDioceseOverview(dioceseAId);
    const a1 = overview?.parishes.find((p) => p.parishId === parishA1Id);
    expect(a1?.memberCount).toBe(1);
    expect(a1?.city).toBe("Londrina");
  });

  it("desvincular devolve a paróquia para o grupo sem diocese", async () => {
    await setParishDiocese(parishA2Id, null);
    expect(await listParishesInDiocese(dioceseAId)).toHaveLength(1);

    await setParishDiocese(parishA2Id, dioceseAId);
    expect(await listParishesInDiocese(dioceseAId)).toHaveLength(2);
  });

  it("rejeita vincular a uma diocese inexistente", async () => {
    await expect(
      setParishDiocese(parishA1Id, "00000000-0000-0000-0000-000000000000"),
    ).rejects.toThrow();
  });

  it("vincula o bispo e ele lê o próprio vínculo", async () => {
    await assignDioceseMember(dioceseAId, `bispo-${stamp}@test.comunidade.app`, "BISPO");

    const meus = await listOwnDioceseMemberships(bispoAId);
    expect(meus).toHaveLength(1);
    expect(meus[0]?.diocese.id).toBe(dioceseAId);
    expect(meus[0]?.role).toBe("BISPO");
  });

  it("um usuário não enxerga o vínculo diocesano de outro", async () => {
    // RLS de diocese_memberships só libera as próprias linhas (por user_id).
    expect(await listOwnDioceseMemberships(fielId)).toHaveLength(0);
  });

  it("listar membros da diocese devolve quem está vinculado", async () => {
    // Regressão: sem contexto de diocese o RLS devolve lista vazia em
    // silêncio, e a tela mostraria "ninguém vinculado" com o bispo lá.
    const membros = await listDioceseMembers(dioceseAId);
    expect(membros).toHaveLength(1);
    expect(membros[0]?.user.fullName).toBe("Dom Bispo");
  });

  it("o vínculo de uma diocese não aparece na listagem de outra", async () => {
    expect(await listDioceseMembers(dioceseBId)).toHaveLength(0);
  });

  it("rejeita vincular e-mail sem conta", async () => {
    await expect(
      assignDioceseMember(dioceseAId, `nao-existe-${stamp}@test.comunidade.app`, "BISPO"),
    ).rejects.toThrow();
  });

  it("bispo da diocese A não tem acesso à diocese B", () => {
    const bispoA = sessionWith([
      { id: dioceseAId, name: "A", state: "PR", role: "BISPO" },
    ]);
    expect(hasDioceseAccess(bispoA, dioceseAId)).toBe(true);
    expect(hasDioceseAccess(bispoA, dioceseBId)).toBe(false);
  });

  it("quem não supervisiona nenhuma diocese não acessa nenhuma", () => {
    expect(hasDioceseAccess(sessionWith([]), dioceseAId)).toBe(false);
  });

  it("admin da plataforma acessa qualquer diocese", () => {
    const admin = sessionWith([], true);
    expect(hasDioceseAccess(admin, dioceseAId)).toBe(true);
    expect(hasDioceseAccess(admin, dioceseBId)).toBe(true);
  });

  it("remover o vínculo tira o acesso do bispo", async () => {
    await removeDioceseMember(dioceseAId, bispoAId);
    expect(await listOwnDioceseMemberships(bispoAId)).toHaveLength(0);
  });
});
