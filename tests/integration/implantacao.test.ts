import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/prisma";
import { ensureRolesAndPermissionsSeeded } from "@/server/auth/seed-rbac";
import { registerParish } from "@/server/modules/parishes/service";
import { registerUser } from "@/server/modules/users/service";
import { createInvitation, acceptInvitation } from "@/server/modules/invitations/service";
import { criarPrimeiroAcesso, listaDaImplantacao } from "@/server/modules/implantacao/service";
import { withOwnMembershipLookup, withTenantContext } from "@/server/db/tenant-context";
import { hashToken } from "@/server/auth/tokens";
import { cleanupTenantData } from "../helpers/cleanup";

/**
 * Implantar uma paróquia: dar a ela quem a administre, sem script e sem o
 * banco de produção na mão — o que travou a Rocio em 21/09/2026.
 */
describe("implantação de uma paróquia nova", () => {
  const stamp = Date.now();
  const userIds: string[] = [];
  const parishIds: string[] = [];
  let nova: string;
  let outra: string;
  let adminDaPlataforma: string;

  beforeAll(async () => {
    await ensureRolesAndPermissionsSeeded();
    const [a, b] = await Promise.all([
      registerParish({ name: `Par Implantação ${stamp}` }),
      registerParish({ name: `Par Vizinha Implantação ${stamp}` }),
    ]);
    nova = a.id;
    outra = b.id;
    parishIds.push(a.id, b.id);
    const admin = await registerUser({
      fullName: "Admin Plataforma",
      email: `admin-impl-${stamp}@test.comunidade.app`,
      password: "SenhaForte123",
    });
    adminDaPlataforma = admin.id;
    userIds.push(admin.id);
  });

  afterAll(async () => {
    const criados = await prisma.user.findMany({
      where: { email: { contains: `-impl-${stamp}` } },
      select: { id: true },
    });
    await cleanupTenantData({ userIds: [...userIds, ...criados.map((u) => u.id)], parishIds });
  });

  const vinculo = (userId: string) =>
    withOwnMembershipLookup(userId, (tx) =>
      tx.parishMembership.findFirst({ where: { userId, status: "active" }, include: { role: true } }),
    );

  it("cria a conta do pároco, com o papel, o perfil de sacerdote e um link de uma semana", async () => {
    const acesso = await criarPrimeiroAcesso({
      parishId: nova,
      nome: "Pe. Alessandro Teste",
      email: `  PAROCO-impl-${stamp}@test.comunidade.app `,
      papel: "PAROCO",
      criadoPor: adminDaPlataforma,
    });
    expect(acesso.jaTinhaConta).toBe(false);
    expect(acesso.caminho).toMatch(/^\/recuperar-acesso\/redefinir\?token=/);

    const usuario = await prisma.user.findUniqueOrThrow({ where: { email: `paroco-impl-${stamp}@test.comunidade.app` } });
    expect(usuario.passwordHash).toBeNull();

    const v = await vinculo(usuario.id);
    expect(v?.parishId).toBe(nova);
    expect(v?.role.code).toBe("PAROCO");

    const perfil = await withTenantContext(nova, (tx) => tx.priestProfile.findFirst({ where: { userId: usuario.id } }));
    expect(perfil).not.toBeNull();

    const token = acesso.caminho.split("token=")[1]!;
    const registro = await prisma.passwordResetToken.findUniqueOrThrow({ where: { tokenHash: hashToken(token) } });
    const dias = (registro.expiresAt.getTime() - Date.now()) / 86_400_000;
    expect(dias).toBeGreaterThan(6.9);

    const auditoria = await withTenantContext(nova, (tx) =>
      tx.auditLog.findFirst({ where: { parishId: nova, alvoId: usuario.id } }),
    );
    expect(auditoria?.acao).toBe("acesso.primeiro_criado");
  });

  it("quem já tem conta e não tem paróquia entra nesta com o papel pedido", async () => {
    const semParoquia = await registerUser({
      fullName: "Secretaria Sem Paróquia",
      email: `sec-impl-${stamp}@test.comunidade.app`,
      password: "SenhaForte123",
    });
    const acesso = await criarPrimeiroAcesso({
      parishId: nova,
      nome: "Secretaria Sem Paróquia",
      email: `sec-impl-${stamp}@test.comunidade.app`,
      papel: "SECRETARIA",
      criadoPor: adminDaPlataforma,
    });
    expect(acesso.jaTinhaConta).toBe(true);
    expect((await vinculo(semParoquia.id))?.role.code).toBe("SECRETARIA");
  });

  it("recusa quem já pertence a outra paróquia: mudar é decisão da pessoa", async () => {
    const deOutra = await registerUser({
      fullName: "Fiel De Outra",
      email: `outra-impl-${stamp}@test.comunidade.app`,
      password: "SenhaForte123",
    });
    const convite = await createInvitation({ parishId: outra, createdBy: deOutra.id, type: "link", role: "FIEL" });
    await acceptInvitation({ code: convite.code, userId: deOutra.id });

    await expect(
      criarPrimeiroAcesso({
        parishId: nova,
        nome: "Fiel De Outra",
        email: `outra-impl-${stamp}@test.comunidade.app`,
        papel: "PAROCO",
        criadoPor: adminDaPlataforma,
      }),
    ).rejects.toThrow(/já pertence/);
    expect((await vinculo(deOutra.id))?.parishId).toBe(outra);
  });

  it("recusa papel que não administra, nome sem sobrenome e e-mail inválido", async () => {
    const base = { parishId: nova, criadoPor: adminDaPlataforma };
    await expect(
      criarPrimeiroAcesso({ ...base, nome: "Fulano Tal", email: `x-impl-${stamp}@t.app`, papel: "FIEL" }),
    ).rejects.toThrow(/papel/);
    await expect(
      criarPrimeiroAcesso({ ...base, nome: "Fulano", email: `y-impl-${stamp}@t.app`, papel: "PAROCO" }),
    ).rejects.toThrow(/sobrenome/);
    await expect(
      criarPrimeiroAcesso({ ...base, nome: "Fulano Tal", email: "sem-arroba", papel: "PAROCO" }),
    ).rejects.toThrow(/e-mail/);
  });

  it("a lista do que falta confere o banco, e não uma marcação à mão", async () => {
    const antes = await listaDaImplantacao(outra);
    expect(antes.find((i) => i.chave === "horarios")?.feito).toBe(false);
    expect(antes.find((i) => i.chave === "contato")?.feito).toBe(false);

    await withTenantContext(outra, (tx) =>
      tx.parish.update({ where: { id: outra }, data: { address: "Rua Teste, 1", phone: "(43) 3333-0000" } }),
    );
    const depois = await listaDaImplantacao(outra);
    expect(depois.find((i) => i.chave === "contato")?.feito).toBe(true);
  });
});
