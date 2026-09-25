import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ensureRolesAndPermissionsSeeded } from "@/server/auth/seed-rbac";
import { registerParish } from "@/server/modules/parishes/service";
import { registerUser } from "@/server/modules/users/service";
import { createInvitation, acceptInvitation } from "@/server/modules/invitations/service";
import { createGroup, expressGroupInterest } from "@/server/modules/pastorais/service";
import { acolherInteressado, dispensarInteresse } from "@/server/modules/grupos/service";
import { medidasDaAdesao } from "@/server/modules/adesao/service";
import { withTenantContext } from "@/server/db/tenant-context";
import { cleanupTenantData } from "../helpers/cleanup";

/** O piloto medido: chegada, resposta a quem se oferece e compromisso. */
describe("adesão da comunidade", () => {
  const stamp = Date.now();
  const userIds: string[] = [];
  const parishIds: string[] = [];
  let parishId: string;
  let coord: string;
  let ana: string;
  let beto: string;

  const conta = async (nome: string, apelido: string) => {
    const u = await registerUser({ fullName: nome, email: `${apelido}-ad-${stamp}@test.comunidade.app`, password: "SenhaForte123" });
    userIds.push(u.id);
    const convite = await createInvitation({ parishId, createdBy: u.id, type: "link", role: "FIEL" });
    await acceptInvitation({ code: convite.code, userId: u.id });
    return u.id;
  };

  beforeAll(async () => {
    await ensureRolesAndPermissionsSeeded();
    parishId = (await registerParish({ name: `Par Adesao ${stamp}` })).id;
    parishIds.push(parishId);
    coord = await conta("Coordenadora Da Acolhida", "coord");
    ana = await conta("Ana Se Oferece", "ana");
    beto = await conta("Beto Tambem", "beto");
    await withTenantContext(parishId, (tx) => tx.user.update({ where: { id: coord }, data: { onboardedAt: new Date() } }));

    const grupo = await createGroup(parishId, coord, { name: "Acolhida" });
    await expressGroupInterest(parishId, grupo.id, ana);
    await expressGroupInterest(parishId, grupo.id, beto);
    await acolherInteressado(parishId, grupo.id, ana, coord);
    await dispensarInteresse(parishId, grupo.id, beto);
    // Dispensar de novo não muda a data da primeira resposta.
    await dispensarInteresse(parishId, grupo.id, beto);
  });

  afterAll(async () => {
    await cleanupTenantData({ userIds, parishIds });
  });

  it("conta chegada, boas-vindas, respostas e compromisso", async () => {
    const m = await medidasDaAdesao(parishId);
    expect(m.fieis).toBe(3);
    expect(m.concluiram).toBe(1);
    expect(m.cadastrosPorSemana.at(-1)!.valor).toBe(3);
    expect(m.interesses).toMatchObject({ total: 2, respondidos: 2, esperando: 0 });
    expect(m.interesses.medianaEmHoras).not.toBeNull();
    // Ana entrou no grupo; Beto foi dispensado e não tem compromisso.
    expect(m.comCompromisso).toBe(1);
  });
});
