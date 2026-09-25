import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ensureRolesAndPermissionsSeeded } from "@/server/auth/seed-rbac";
import { registerParish } from "@/server/modules/parishes/service";
import { registerUser } from "@/server/modules/users/service";
import { createInvitation, acceptInvitation } from "@/server/modules/invitations/service";
import { createGroup } from "@/server/modules/pastorais/service";
import { adicionarMembroPorNome } from "@/server/modules/grupos/service";
import { salvarChamada } from "@/server/modules/grupos/vida-do-grupo";
import { montarRelatorio, paraCsv, resumoDoConselho } from "@/server/modules/relatorios/service";
import { buscar } from "@/server/modules/busca/service";
import { withTenantContext } from "@/server/db/tenant-context";
import { paraOBanco } from "@/lib/grupos/cronograma";
import { cleanupTenantData } from "../helpers/cleanup";

/**
 * Relatórios, painel do conselho e busca: a mesma paróquia vista por
 * quem administra e por quem procura.
 */
describe("relatórios e conselho", () => {
  const stamp = Date.now();
  const userIds: string[] = [];
  const parishIds: string[] = [];
  let parishId: string;
  let eva: string;
  let ivo: string;
  const agora = new Date();

  const conta = async (nome: string, apelido: string) => {
    const u = await registerUser({ fullName: nome, email: `${apelido}-rl-${stamp}@test.comunidade.app`, password: "SenhaForte123" });
    userIds.push(u.id);
    const convite = await createInvitation({ parishId, createdBy: u.id, type: "link", role: "FIEL" });
    await acceptInvitation({ code: convite.code, userId: u.id });
    return u.id;
  };

  beforeAll(async () => {
    await ensureRolesAndPermissionsSeeded();
    const p = await registerParish({ name: `Par Relatorios ${stamp}` });
    parishId = p.id;
    parishIds.push(p.id);
    eva = await conta("Eva Coordena Liturgia", "eva");
    ivo = await conta("Ivo Participa Pouco", "ivo");

    const liturgia = await createGroup(parishId, eva, { name: "Pastoral Litúrgica" });
    await adicionarMembroPorNome(parishId, liturgia.id, "Eva Coordena Liturgia", "coordenador", eva);
    await adicionarMembroPorNome(parishId, liturgia.id, "Ivo Participa Pouco", "membro", eva);
    // Um grupo sem coordenação e sem encontro: tem que aparecer no conselho.
    await createGroup(parishId, eva, { name: "Grupo de Oração Parado" });

    const ontem = new Date(agora.getTime() - 86_400_000);
    const encontro = await withTenantContext(parishId, (tx) =>
      tx.encontroDoGrupo.create({
        data: { parishId, groupId: liturgia.id, createdBy: eva, data: paraOBanco(ontem.toISOString().slice(0, 10)), tema: "Ensaio" },
      }),
    );
    await salvarChamada(parishId, liturgia.id, encontro.id, eva, [
      { userId: eva, presente: true },
      { userId: ivo, presente: false },
    ]);

    await withTenantContext(parishId, (tx) =>
      tx.sacrament.createMany({
        data: [
          { parishId, userId: ivo, type: "batismo", date: new Date(Date.UTC(agora.getFullYear(), 0, 10)), status: "validated" },
          { parishId, userId: eva, type: "batismo", date: new Date(Date.UTC(agora.getFullYear(), 1, 10)) },
          { parishId, userId: eva, type: "crisma", date: new Date(Date.UTC(agora.getFullYear() - 1, 5, 1)) },
        ],
      }),
    );
  });

  afterAll(async () => {
    await cleanupTenantData({ userIds, parishIds });
  });

  it("participação por pastoral conta participantes e presença da chamada", async () => {
    const t = await montarRelatorio(parishId, "pastorais", agora.getFullYear(), agora);
    const liturgia = t.linhas.find((l) => l[0] === "Pastoral Litúrgica")!;
    expect(liturgia.slice(1)).toEqual(["2", "2", "1", "50%", "0"]);
  });

  it("sacramentos do ano ficam no ano, e o CSV abre no Excel brasileiro", async () => {
    const t = await montarRelatorio(parishId, "sacramentos", agora.getFullYear(), agora);
    expect(t.linhas).toEqual([["Batismo", "2", "1"]]);
    const csv = paraCsv(t);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain('"Batismo";"2";"1"');
  });

  it("o conselho vê o grupo sem coordenação e sem encontro", async () => {
    const r = await resumoDoConselho(parishId, agora);
    expect(r.fieis).toBe(2);
    expect(r.servindo).toBe(2);
    expect(r.semCoordenacao.map((p) => p.nome)).toEqual(["Grupo de Oração Parado"]);
    expect(r.paradas.map((p) => p.nome)).toEqual(["Grupo de Oração Parado"]);
  });

  it("a busca acha a pastoral sem acento, e as telas pelo apelido", async () => {
    const r = await buscar(parishId, "liturgica");
    expect(r.pastorais.map((p) => p.nome)).toEqual(["Pastoral Litúrgica"]);
    expect((await buscar(parishId, "confissao")).atalhos.length).toBeGreaterThan(0);
  });
});
