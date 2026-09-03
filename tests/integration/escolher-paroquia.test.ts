import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { withTenantContext } from "@/server/db/tenant-context";
import { ensureRolesAndPermissionsSeeded } from "@/server/auth/seed-rbac";
import {
  registerParish,
  listParishesForJoin,
  joinParish,
  listActiveMembers,
  getParishDashboardCounts,
} from "@/server/modules/parishes/service";
import { registerUser } from "@/server/modules/users/service";
import { cadastrarSacerdoteSemConta } from "@/server/modules/priests/service";
import { cleanupTenantData } from "../helpers/cleanup";

/**
 * O fiel escolhe a paróquia e entra — membro pleno, na hora, sem aprovação
 * de ninguém.
 *
 * Já houve um estado "pendente" aqui, herdado do tempo do código de
 * convite. Ele não protegia nada que o papel já não protegesse, e prendia a
 * pessoa num limbo: sem avisos, sem resumo semanal, sem aparecer na
 * contagem, esperando alguém que não sabia que havia alguém esperando.
 */
describe("escolher a paróquia sem convite", () => {
  let paroquiaAId: string;
  let paroquiaBId: string;
  let visitanteId: string;
  const userIds: string[] = [];
  const parishIds: string[] = [];
  const stamp = Date.now();

  beforeAll(async () => {
    await ensureRolesAndPermissionsSeeded();
    const [a, b] = await Promise.all([
      registerParish({ name: `Sao Jose Escolha ${stamp}`, city: "Londrina", state: "PR" }),
      registerParish({ name: `Santa Rita Escolha ${stamp}`, city: "Maringá", state: "PR" }),
    ]);
    paroquiaAId = a.id;
    paroquiaBId = b.id;
    parishIds.push(a.id, b.id);

    const visitante = await registerUser({
      fullName: "Visitante Novo",
      email: `visitante-${stamp}@test.comunidade.app`,
      password: "SenhaForte123",
    });
    visitanteId = visitante.id;
    userIds.push(visitante.id);
  });

  afterAll(async () => {
    await cleanupTenantData({ userIds, parishIds });
  });

  it("lista paróquias por nome e por cidade", async () => {
    // Paróquia é entidade pública: nome e cidade estão na placa da igreja.
    // Listar não expõe pessoa nenhuma.
    const porNome = await listParishesForJoin(`Sao Jose Escolha ${stamp}`);
    expect(porNome.map((p) => p.id)).toContain(paroquiaAId);

    const porCidade = await listParishesForJoin("Maringá");
    expect(porCidade.map((p) => p.id)).toContain(paroquiaBId);
  });

  it("entra na hora como membro pleno — sem esperar ninguém", async () => {
    const v = await joinParish(paroquiaAId, visitanteId);
    expect(v.status).toBe("active");
    expect(v.parishId).toBe(paroquiaAId);
  });

  it("aparece na comunidade e na contagem imediatamente", async () => {
    // É o que o pendente não fazia: ninguém sabia que a pessoa tinha
    // chegado, e ela não recebia nada.
    const ativos = await listActiveMembers(paroquiaAId);
    expect(ativos.some((m) => m.user.id === visitanteId)).toBe(true);

    const counts = await getParishDashboardCounts(paroquiaAId);
    expect(counts.fielCount).toBeGreaterThanOrEqual(1);
  });

  it("a contagem de sacerdotes enxerga quem não tem conta", async () => {
    /*
     * Contava filiação com papel de sacerdote, e um padre sem conta não tem
     * filiação. O painel dizia "0 Sacerdotes" enquanto listava um logo
     * abaixo, e "Falar com um sacerdote" mostrava o mesmo padre ao fiel —
     * visto em produção em 03/09/2026.
     */
    const antes = (await getParishDashboardCounts(paroquiaAId)).sacerdoteCount;

    await cadastrarSacerdoteSemConta(paroquiaAId, {
      nome: "Pe. Sem Conta",
      title: "Vigário",
    });

    const depois = (await getParishDashboardCounts(paroquiaAId)).sacerdoteCount;
    expect(depois).toBe(antes + 1);
  });

  it("escolher de novo a mesma paróquia não duplica vínculo", async () => {
    await joinParish(paroquiaAId, visitanteId);
    const ativos = await listActiveMembers(paroquiaAId);
    expect(ativos.filter((m) => m.user.id === visitanteId)).toHaveLength(1);
  });

  it("trocar de paróquia encerra a anterior — uma por vez", async () => {
    await joinParish(paroquiaBId, visitanteId);

    expect((await listActiveMembers(paroquiaAId)).some((m) => m.user.id === visitanteId)).toBe(
      false,
    );
    expect((await listActiveMembers(paroquiaBId)).some((m) => m.user.id === visitanteId)).toBe(
      true,
    );
  });

  it("a paróquia antiga guarda a saída, não apaga o vínculo", async () => {
    // É o que alimenta o contador de "foram para outra" no painel.
    const antigo = await withTenantContext(paroquiaAId, (tx) =>
      tx.parishMembership.findFirst({ where: { userId: visitanteId, parishId: paroquiaAId } }),
    );
    expect(antigo?.status).toBe("inactive");
    expect(antigo?.leftAt).not.toBeNull();
  });

  it("recusa paróquia inexistente", async () => {
    await expect(
      joinParish("00000000-0000-0000-0000-000000000000", visitanteId),
    ).rejects.toThrow();
  });
});
