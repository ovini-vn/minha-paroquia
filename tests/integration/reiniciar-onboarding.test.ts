import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ensureRolesAndPermissionsSeeded } from "@/server/auth/seed-rbac";
import { registerParish } from "@/server/modules/parishes/service";
import { registerUser } from "@/server/modules/users/service";
import { withPlatformContext, withTenantContext } from "@/server/db/tenant-context";
import { prisma } from "@/server/db/prisma";
import {
  listarContasReiniciaveis,
  reiniciarOnboarding,
} from "@/server/modules/onboarding/service";
import { cleanupTenantData } from "../helpers/cleanup";

/**
 * Devolver uma conta ao começo do onboarding.
 *
 * O que estes testes protegem é o que a versão em script errou uma vez: o
 * `deleteMany` em `parish_memberships` passa por uma tabela com RLS FORCE,
 * e sem o contexto de plataforma ele apaga ZERO e devolve sucesso. Por
 * isso todos os testes olham o que SOBROU no banco, e não o que a função
 * respondeu.
 */
describe("reiniciar onboarding", () => {
  let parishId: string;
  let outraParoquiaId: string;
  let secretariaId: string;
  const userIds: string[] = [];
  const parishIds: string[] = [];
  const stamp = Date.now();

  async function novoMembro(nome: string, onde = parishId) {
    const u = await registerUser({
      fullName: nome,
      email: `${nome.toLowerCase().replace(/\W/g, "")}-${stamp}@test.comunidade.app`,
      password: "SenhaForte123",
    });
    userIds.push(u.id);
    const papel = await prisma.role.findUniqueOrThrow({ where: { code: "FIEL" } });
    await withTenantContext(onde, (tx) =>
      tx.parishMembership.create({
        data: { userId: u.id, parishId: onde, roleId: papel.id, status: "active" },
      }),
    );
    await prisma.user.update({ where: { id: u.id }, data: { onboardedAt: new Date() } });
    return u.id;
  }

  beforeAll(async () => {
    await ensureRolesAndPermissionsSeeded();
    const p = await registerParish({ name: `Paróquia Reinício ${stamp}` });
    const outra = await registerParish({ name: `Paróquia Vizinha ${stamp}` });
    parishId = p.id;
    outraParoquiaId = outra.id;
    parishIds.push(p.id, outra.id);
    secretariaId = await novoMembro("Secretaria Reinicio");
  });

  afterAll(async () => {
    await cleanupTenantData({ userIds, parishIds });
  });

  it("apaga o vínculo E as boas-vindas — os dois portões, não um", async () => {
    const id = await novoMembro("Fiel Novato");

    await reiniciarOnboarding(parishId, id, secretariaId);

    const depois = await withPlatformContext(async (tx) => ({
      vinculos: await tx.parishMembership.count({ where: { userId: id } }),
      conta: await tx.user.findUniqueOrThrow({
        where: { id },
        select: { onboardedAt: true },
      }),
    }));

    // Derrubar só um dos dois testaria metade do fluxo: sem vínculo o app
    // manda para /escolher-paroquia, sem onboardedAt manda para /bem-vindo.
    expect(depois.vinculos).toBe(0);
    expect(depois.conta.onboardedAt).toBeNull();
  });

  it("recusa conta com histórico, e NÃO apaga nada", async () => {
    const id = await novoMembro("Fiel Com Historico");
    await withTenantContext(parishId, (tx) =>
      tx.prayerRequest.create({
        data: { parishId, requesterUserId: id, contentText: "Peço oração pela minha mãe." },
      }),
    );

    await expect(reiniciarOnboarding(parishId, id, secretariaId)).rejects.toThrow(/histórico/);

    // O que importa é o banco, não a mensagem: uma recusa que já apagou
    // metade seria pior do que nenhuma recusa.
    const sobrou = await withPlatformContext((tx) =>
      tx.parishMembership.count({ where: { userId: id } }),
    );
    expect(sobrou).toBe(1);
  });

  it("não alcança quem é de outra paróquia", async () => {
    const deFora = await novoMembro("Fiel Da Vizinha", outraParoquiaId);

    await expect(reiniciarOnboarding(parishId, deFora, secretariaId)).rejects.toThrow(
      /membro ativo desta paróquia/,
    );

    const sobrou = await withPlatformContext((tx) =>
      tx.parishMembership.count({ where: { userId: deFora } }),
    );
    expect(sobrou).toBe(1);
  });

  it("quem já SAIU de outra paróquia continua podendo ser reiniciado", async () => {
    /*
     * O banco tem índice parcial único em `user_id` para status
     * ativo/pendente: dois vínculos VIVOS são impossíveis. O que existe de
     * verdade é um vínculo inativo — o registro de que a pessoa esteve em
     * outra paróquia.
     *
     * Minha primeira versão contava esses inativos junto e recusava
     * justamente quem tinha esse histórico. E o reinício apaga só o
     * vínculo DESTA paróquia: o de lá é memória, não sujeira.
     */
    const id = await novoMembro("Fiel Que Mudou");
    const papel = await prisma.role.findUniqueOrThrow({ where: { code: "FIEL" } });
    await withTenantContext(outraParoquiaId, (tx) =>
      tx.parishMembership.create({
        data: {
          userId: id,
          parishId: outraParoquiaId,
          roleId: papel.id,
          status: "inactive",
          leftAt: new Date(),
        },
      }),
    );

    await reiniciarOnboarding(parishId, id, secretariaId);

    const depois = await withPlatformContext((tx) =>
      tx.parishMembership.findMany({
        where: { userId: id },
        select: { parishId: true, status: true },
      }),
    );
    expect(depois.filter((v) => v.parishId === parishId)).toHaveLength(0);
    expect(depois.filter((v) => v.parishId === outraParoquiaId)).toHaveLength(1);
  });

  it("a lista já diz quem NÃO pode, e só traz gente desta paróquia", async () => {
    const contas = await listarContasReiniciaveis(parishId);
    const nomes = contas.map((c) => c.nome);

    expect(nomes).toContain("Fiel Com Historico");
    const comHistorico = contas.find((c) => c.nome === "Fiel Com Historico")!;
    expect(comHistorico.impedimentos.join(" ")).toMatch(/pedido/);

    // Quem é de outra paróquia nunca esteve aqui.
    expect(nomes).not.toContain("Fiel Da Vizinha");
  });

  it("deixa registro em auditoria — apagar vínculo sem rastro é pior que não apagar", async () => {
    const id = await novoMembro("Fiel Auditado");
    await reiniciarOnboarding(parishId, id, secretariaId);

    const registro = await withTenantContext(parishId, (tx) =>
      tx.auditLog.findFirst({
        where: { parishId, acao: "onboarding.reiniciado", alvoId: id },
        select: { atorId: true, detalhe: true },
      }),
    );
    expect(registro?.atorId).toBe(secretariaId);
    expect(registro?.detalhe).toContain("Fiel Auditado");
  });
});
