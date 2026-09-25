import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ensureRolesAndPermissionsSeeded } from "@/server/auth/seed-rbac";
import { registerParish } from "@/server/modules/parishes/service";
import { registerUser } from "@/server/modules/users/service";
import { createInvitation, acceptInvitation } from "@/server/modules/invitations/service";
import { createGroup } from "@/server/modules/pastorais/service";
import { adicionarMembroPorNome } from "@/server/modules/grupos/service";
import { NOME_DE_QUEM_SAIU, excluirMinhaConta } from "@/server/modules/conta/exclusao";
import { withPlatformContext, withTenantContext } from "@/server/db/tenant-context";
import { cleanupTenantData } from "../helpers/cleanup";

/**
 * Excluir a própria conta: o pessoal sai, o que a paróquia guarda fica sem
 * o nome, e ninguém deixa a paróquia sem administração.
 */
describe("excluir a própria conta", () => {
  const stamp = Date.now();
  const userIds: string[] = [];
  const parishIds: string[] = [];
  let parishId: string;
  let dani: string;
  let paroco: string;

  const conta = async (nome: string, apelido: string, papel: "FIEL" | "PAROCO") => {
    const u = await registerUser({ fullName: nome, email: `${apelido}-ex-${stamp}@test.comunidade.app`, password: "SenhaForte123" });
    userIds.push(u.id);
    const convite = await createInvitation({ parishId, createdBy: u.id, type: "link", role: "FIEL" });
    await acceptInvitation({ code: convite.code, userId: u.id });
    if (papel === "PAROCO") {
      // Convite não cria pároco: o papel é trocado direto, como faz a implantação.
      await withPlatformContext(async (tx) => {
        const role = await tx.role.findUniqueOrThrow({ where: { code: "PAROCO" } });
        await tx.parishMembership.updateMany({ where: { userId: u.id, parishId }, data: { roleId: role.id } });
      });
    }
    return u.id;
  };

  beforeAll(async () => {
    await ensureRolesAndPermissionsSeeded();
    parishId = (await registerParish({ name: `Par Exclusao ${stamp}` })).id;
    parishIds.push(parishId);
    paroco = await conta("Padre Unico Da Paroquia", "padre", "PAROCO");
    dani = await conta("Dani Vai Sair", "dani", "FIEL");

    const grupo = await createGroup(parishId, paroco, { name: "Pastoral da Saída" });
    await adicionarMembroPorNome(parishId, grupo.id, "Dani Vai Sair", "membro", paroco);
    await withTenantContext(parishId, async (tx) => {
      await tx.sacrament.create({ data: { parishId, userId: dani, type: "batismo", date: new Date("2000-01-01") } });
      await tx.confessionLog.create({ data: { parishId, userId: dani, date: new Date("2026-09-01") } });
      await tx.contribuicao.create({
        data: { parishId, userId: dani, centavos: 5000, recebidaEm: new Date("2026-09-01"), forma: "dinheiro" },
      });
    });
  });

  afterAll(async () => {
    await cleanupTenantData({ userIds, parishIds });
  });

  it("pede a palavra de confirmação", async () => {
    await expect(excluirMinhaConta(dani, "sim")).rejects.toThrow(/EXCLUIR/);
  });

  it("o único pároco não deixa a paróquia sem administração", async () => {
    await expect(excluirMinhaConta(paroco, "EXCLUIR")).rejects.toThrow(/única pessoa que administra/);
  });

  it("apaga o pessoal, e guarda sacramento e contribuição sem o nome", async () => {
    await excluirMinhaConta(dani, "excluir");
    const depois = await withPlatformContext(async (tx) => ({
      user: await tx.user.findUnique({ where: { id: dani } }),
      membros: await tx.membroDoGrupo.count({ where: { userId: dani } }),
      confissoes: await tx.confessionLog.count({ where: { userId: dani } }),
      sessoes: await tx.session.count({ where: { userId: dani } }),
      sacramentos: await tx.sacrament.count({ where: { userId: dani } }),
      contribuicoes: await tx.contribuicao.findMany({ where: { parishId }, select: { userId: true, centavos: true } }),
      vinculo: await tx.parishMembership.findFirst({ where: { userId: dani }, select: { status: true } }),
    }));
    expect(depois.user).toMatchObject({ fullName: NOME_DE_QUEM_SAIU, passwordHash: null, phone: null, birthDate: null });
    expect(depois.user!.email).toMatch(/@conta-excluida\.invalid$/);
    expect(depois.membros).toBe(0);
    expect(depois.confissoes).toBe(0);
    expect(depois.sessoes).toBe(0);
    expect(depois.sacramentos).toBe(1);
    expect(depois.contribuicoes).toEqual([{ userId: null, centavos: 5000 }]);
    expect(depois.vinculo?.status).toBe("inactive");
  });
});
