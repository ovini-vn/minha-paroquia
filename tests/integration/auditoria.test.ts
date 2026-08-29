import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ensureRolesAndPermissionsSeeded } from "@/server/auth/seed-rbac";
import { registerParish, joinParish, changeMemberRole } from "@/server/modules/parishes/service";
import { registerUser } from "@/server/modules/users/service";
import { setOverride, removeOverride } from "@/server/modules/permission-overrides/service";
import { criarLinkDeNovaSenhaParaMembro } from "@/server/modules/users/password-reset-service";
import { listar, ACOES } from "@/server/modules/auditoria/service";
import { PERMISSIONS } from "@/server/auth/rbac";
import { withTenantContext, withPlatformContext } from "@/server/db/tenant-context";
import { cleanupTenantData } from "../helpers/cleanup";

/**
 * O log existe para responder "quem fez o quê" meses depois. O que importa
 * testar é que ele não tem buraco (mudança sem registro), não tem ruído
 * (registro sem mudança) e não vaza entre paróquias.
 */
describe("histórico de acessos", () => {
  let parishId: string;
  let vizinhaId: string;
  let parocoId: string;
  let fielId: string;
  const userIds: string[] = [];
  const parishIds: string[] = [];
  const stamp = Date.now();

  beforeAll(async () => {
    await ensureRolesAndPermissionsSeeded();
    const [a, b] = await Promise.all([
      registerParish({ name: `Par Auditoria ${stamp}` }),
      registerParish({ name: `Par Vizinha Aud ${stamp}` }),
    ]);
    parishId = a.id;
    vizinhaId = b.id;
    parishIds.push(a.id, b.id);

    const [pe, fiel] = await Promise.all([
      registerUser({ fullName: "Pe. Auditor", email: `pe-aud-${stamp}@test.comunidade.app`, password: "SenhaForte123" }),
      registerUser({ fullName: "Fiel Auditado", email: `fiel-aud-${stamp}@test.comunidade.app`, password: "SenhaForte123" }),
    ]);
    parocoId = pe.id;
    fielId = fiel.id;
    userIds.push(pe.id, fiel.id);

    await joinParish(parishId, parocoId);
    await joinParish(parishId, fielId);

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

  it("trocar o papel de alguém deixa registro com o de e o para", async () => {
    await changeMemberRole(parishId, fielId, "CATEQUISTA", parocoId);

    const registros = await listar(parishId);
    const troca = registros.find((r) => r.acao === ACOES.PAPEL_TROCADO);

    expect(troca).toBeDefined();
    expect(troca?.atorNome).toBe("Pe. Auditor");
    expect(troca?.alvoNome).toBe("Fiel Auditado");
    expect(troca?.detalhe).toMatchObject({ de: "FIEL", para: "CATEQUISTA" });
  });

  it("uma troca RECUSADA não deixa registro", async () => {
    // O log não pode dizer que algo aconteceu quando não aconteceu. Trocar o
    // próprio papel é recusado pelo serviço.
    const antes = (await listar(parishId)).length;

    await expect(changeMemberRole(parishId, parocoId, "FIEL", parocoId)).rejects.toThrow();

    expect((await listar(parishId)).length).toBe(antes);
  });

  it("conceder e revogar permissão são ações distintas no histórico", async () => {
    await setOverride(parishId, fielId, PERMISSIONS.AVISOS_MANAGE, true, parocoId);
    await setOverride(parishId, fielId, PERMISSIONS.AVISOS_MANAGE, false, parocoId);

    const acoes = (await listar(parishId)).map((r) => r.acao);
    expect(acoes).toContain(ACOES.PERMISSAO_CONCEDIDA);
    expect(acoes).toContain(ACOES.PERMISSAO_REVOGADA);
  });

  it("remover permissão que não existe não vira ruído no histórico", async () => {
    const antes = (await listar(parishId)).length;
    await removeOverride(parishId, fielId, PERMISSIONS.CATEQUESE_MANAGE, parocoId);
    expect((await listar(parishId)).length).toBe(antes);
  });

  it("gerar link de nova senha fica registrado", async () => {
    // Antes desta tabela, o rastro era um console.log — que se perde. Gerar
    // acesso à conta de outra pessoa não pode ficar sem registro.
    const r = await criarLinkDeNovaSenhaParaMembro(parishId, fielId, {
      userId: parocoId,
      podeGerenciarPermissoes: true,
    });
    expect(r.ok).toBe(true);

    const registro = (await listar(parishId)).find((x) => x.acao === ACOES.SENHA_LINK_GERADO);
    expect(registro?.atorNome).toBe("Pe. Auditor");
    expect(registro?.alvoNome).toBe("Fiel Auditado");
  });

  it("o histórico de uma paróquia não aparece na outra", async () => {
    // Um log de auditoria que vazasse entre comunidades seria pior que não
    // existir: entregaria quem mexeu no acesso de quem, para fora.
    const daVizinha = await listar(vizinhaId);
    expect(daVizinha).toHaveLength(0);

    expect((await listar(parishId)).length).toBeGreaterThan(0);
  });
});
