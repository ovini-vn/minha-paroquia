import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ensureRolesAndPermissionsSeeded } from "@/server/auth/seed-rbac";
import { registerParish, joinParish } from "@/server/modules/parishes/service";
import { registerUser } from "@/server/modules/users/service";
import { criarLinkDeNovaSenhaParaMembro } from "@/server/modules/users/password-reset-service";
import { withTenantContext, withPlatformContext } from "@/server/db/tenant-context";
import { cleanupTenantData } from "../helpers/cleanup";

/**
 * O link de nova senha é uma TOMADA DE CONTA: quem o recebe entra como a
 * pessoa. Por isso o que importa testar aqui não é o caminho feliz, é o que
 * a função recusa.
 */
describe("link de nova senha gerado pela paróquia", () => {
  let parishId: string;
  let outraParishId: string;
  let fielId: string;
  let parocoId: string;
  let deOutraParoquiaId: string;
  const userIds: string[] = [];
  const parishIds: string[] = [];
  const stamp = Date.now();

  const secretaria = { userId: "secretaria-fake", podeGerenciarPermissoes: false };
  const paroco = { userId: "paroco-fake", podeGerenciarPermissoes: true };

  beforeAll(async () => {
    await ensureRolesAndPermissionsSeeded();
    const [a, b] = await Promise.all([
      registerParish({ name: `Par Senha ${stamp}` }),
      registerParish({ name: `Par Vizinha Senha ${stamp}` }),
    ]);
    parishId = a.id;
    outraParishId = b.id;
    parishIds.push(a.id, b.id);

    const [fiel, pe, vizinho] = await Promise.all([
      registerUser({ fullName: "Fiel Esquecido", email: `fiel-s-${stamp}@test.comunidade.app`, password: "SenhaForte123" }),
      registerUser({ fullName: "Pe. Titular", email: `paroco-s-${stamp}@test.comunidade.app`, password: "SenhaForte123" }),
      registerUser({ fullName: "Alguém de Fora", email: `fora-s-${stamp}@test.comunidade.app`, password: "SenhaForte123" }),
    ]);
    fielId = fiel.id;
    parocoId = pe.id;
    deOutraParoquiaId = vizinho.id;
    userIds.push(fiel.id, pe.id, vizinho.id);

    await joinParish(parishId, fielId);
    await joinParish(parishId, parocoId);
    await joinParish(outraParishId, deOutraParoquiaId);

    // Promove a conta do pároco ao papel PAROCO, que é o que dispara a trava.
    const papelParoco = await withPlatformContext((tx) =>
      tx.role.findUniqueOrThrow({ where: { code: "PAROCO" } }),
    );
    await withTenantContext(parishId, (tx) =>
      tx.parishMembership.updateMany({
        where: { parishId, userId: parocoId },
        data: { roleId: papelParoco.id },
      }),
    );
  });

  afterAll(async () => {
    await cleanupTenantData({ userIds, parishIds });
  });

  it("a secretaria gera link para um fiel", async () => {
    const r = await criarLinkDeNovaSenhaParaMembro(parishId, fielId, secretaria);

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.nome).toBe("Fiel Esquecido");
    expect(r.caminho).toContain("/recuperar-acesso/redefinir?token=");
    // Uma hora de validade: tempo de passar o link, não de esquecê-lo aberto.
    expect(r.expiraEm.getTime()).toBeGreaterThan(Date.now());
    expect(r.expiraEm.getTime()).toBeLessThanOrEqual(Date.now() + 61 * 60 * 1000);
  });

  it("a secretaria NÃO gera link para quem administra a paróquia", async () => {
    // Sem esta recusa, a secretaria geraria um link para o pároco, entraria
    // como ele e assumiria a paróquia — a escalação que o RBAC evita em
    // todo o resto do sistema.
    const r = await criarLinkDeNovaSenhaParaMembro(parishId, parocoId, secretaria);

    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.motivo).toBe("precisa-ser-paroco");
  });

  it("o pároco gera link para quem administra", async () => {
    const r = await criarLinkDeNovaSenhaParaMembro(parishId, parocoId, paroco);
    expect(r.ok).toBe(true);
  });

  it("ninguém gera link para conta de outra paróquia", async () => {
    // Aceitasse e-mail em vez de membro, qualquer painel geraria acesso a
    // qualquer conta da plataforma.
    const r = await criarLinkDeNovaSenhaParaMembro(parishId, deOutraParoquiaId, paroco);

    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.motivo).toBe("nao-e-membro");
  });

  it("nem para uma conta que não existe", async () => {
    const r = await criarLinkDeNovaSenhaParaMembro(
      parishId,
      "00000000-0000-0000-0000-000000000000",
      paroco,
    );
    expect(r.ok).toBe(false);
  });
});
