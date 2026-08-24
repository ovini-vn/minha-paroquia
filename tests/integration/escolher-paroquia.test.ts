import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { withTenantContext } from "@/server/db/tenant-context";
import { ensureRolesAndPermissionsSeeded } from "@/server/auth/seed-rbac";
import {
  registerParish,
  listParishesForJoin,
  joinParishAsPending,
  listPendingMembers,
  confirmMember,
  rejectMember,
  listActiveMembers,
} from "@/server/modules/parishes/service";
import { registerUser } from "@/server/modules/users/service";
import { cleanupTenantData } from "../helpers/cleanup";

/**
 * O fiel escolhe a paróquia e entra na hora, como PENDENTE. Exigir convite
 * para ver o horário da missa afastava justamente quem o app deveria
 * alcançar — a trava passou para o acesso às PESSOAS.
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

  it("entra na hora, como pendente — sem esperar ninguém", async () => {
    const v = await joinParishAsPending(paroquiaAId, visitanteId);
    expect(v.status).toBe("pendente");
    expect(v.parishId).toBe(paroquiaAId);
  });

  it("pendente NÃO conta como membro da comunidade", async () => {
    // listActiveMembers alimenta as telas que mostram pessoas. Enquanto não
    // for confirmado, o visitante não aparece nelas.
    const ativos = await listActiveMembers(paroquiaAId);
    expect(ativos.some((m) => m.user.id === visitanteId)).toBe(false);

    const pendentes = await listPendingMembers(paroquiaAId);
    expect(pendentes.map((p) => p.user.id)).toContain(visitanteId);
  });

  it("escolher de novo a mesma paróquia não duplica vínculo", async () => {
    await joinParishAsPending(paroquiaAId, visitanteId);
    expect(await listPendingMembers(paroquiaAId)).toHaveLength(1);
  });

  it("trocar de paróquia encerra a anterior — uma por vez", async () => {
    await joinParishAsPending(paroquiaBId, visitanteId);

    expect(await listPendingMembers(paroquiaAId)).toHaveLength(0);
    expect((await listPendingMembers(paroquiaBId)).map((p) => p.user.id)).toContain(visitanteId);
  });

  it("confirmar transforma em membro pleno", async () => {
    await confirmMember(paroquiaBId, visitanteId);

    expect(await listPendingMembers(paroquiaBId)).toHaveLength(0);
    const ativos = await listActiveMembers(paroquiaBId);
    expect(ativos.some((m) => m.user.id === visitanteId)).toBe(true);
  });

  it("recusar encerra o vínculo, e a pessoa deixa de ver a paróquia", async () => {
    const outro = await registerUser({
      fullName: "Visitante Recusado",
      email: `recusado-${stamp}@test.comunidade.app`,
      password: "SenhaForte123",
    });
    userIds.push(outro.id);

    await joinParishAsPending(paroquiaAId, outro.id);
    await rejectMember(paroquiaAId, outro.id);

    expect(await listPendingMembers(paroquiaAId)).toHaveLength(0);
    const restou = await withTenantContext(paroquiaAId, (tx) =>
      tx.parishMembership.findFirst({ where: { userId: outro.id, parishId: paroquiaAId } }),
    );
    expect(restou?.status).toBe("inactive");
    expect(restou?.leftAt).not.toBeNull();
  });

  it("recusa paróquia inexistente", async () => {
    await expect(
      joinParishAsPending("00000000-0000-0000-0000-000000000000", visitanteId),
    ).rejects.toThrow();
  });
});
