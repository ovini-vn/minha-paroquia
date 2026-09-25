import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ensureRolesAndPermissionsSeeded } from "@/server/auth/seed-rbac";
import { registerParish } from "@/server/modules/parishes/service";
import { registerUser } from "@/server/modules/users/service";
import { createInvitation, acceptInvitation } from "@/server/modules/invitations/service";
import { createGroup } from "@/server/modules/pastorais/service";
import { adicionarMembroPorNome } from "@/server/modules/grupos/service";
import { criarTarefa } from "@/server/modules/grupos/vida-do-grupo";
import {
  meusCompromissos,
  minhaRespostaAoEncontro,
  responderEncontro,
  responderEvento,
  respostasDosEncontros,
  respostasDosEventos,
} from "@/server/modules/compromissos/service";
import { withTenantContext } from "@/server/db/tenant-context";
import { paraOBanco } from "@/lib/grupos/cronograma";
import { cleanupTenantData } from "../helpers/cleanup";

/**
 * A semana inteira de quem serve, numa lista só — e o "vou / não posso"
 * que diz à coordenação quantos esperar.
 */
describe("meus compromissos", () => {
  const stamp = Date.now();
  const userIds: string[] = [];
  const parishIds: string[] = [];
  let parishId: string;
  let lia: string;
  let rui: string;
  let encontroId: string;
  let eventoId: string;
  const agora = new Date("2026-10-01T12:00:00Z");

  const conta = async (nome: string, apelido: string) => {
    const u = await registerUser({ fullName: nome, email: `${apelido}-cp-${stamp}@test.comunidade.app`, password: "SenhaForte123" });
    userIds.push(u.id);
    const convite = await createInvitation({ parishId, createdBy: u.id, type: "link", role: "FIEL" });
    await acceptInvitation({ code: convite.code, userId: u.id });
    return u.id;
  };

  beforeAll(async () => {
    await ensureRolesAndPermissionsSeeded();
    const p = await registerParish({ name: `Par Compromissos ${stamp}` });
    parishId = p.id;
    parishIds.push(p.id);
    lia = await conta("Lia Serve Bastante", "lia");
    rui = await conta("Rui De Fora Sempre", "rui");

    const grupo = await createGroup(parishId, lia, { name: "Pastoral da Acolhida" });
    await adicionarMembroPorNome(parishId, grupo.id, "Lia Serve Bastante", "coordenador", lia);
    const encontro = await withTenantContext(parishId, (tx) =>
      tx.encontroDoGrupo.create({
        data: { parishId, groupId: grupo.id, createdBy: lia, data: paraOBanco("2026-10-04"), tema: "Acolher quem chega" },
      }),
    );
    encontroId = encontro.id;
    await criarTarefa(parishId, grupo.id, encontroId, "Café da acolhida", lia);

    const evento = await withTenantContext(parishId, (tx) =>
      tx.event.create({
        data: { parishId, createdBy: lia, title: "Festa da padroeira", startsAt: new Date("2026-10-12T15:00:00Z") },
      }),
    );
    eventoId = evento.id;
  });

  afterAll(async () => {
    await cleanupTenantData({ userIds, parishIds });
  });

  it("reúne o encontro do grupo e a tarefa assumida, em ordem de data", async () => {
    const lista = await meusCompromissos(parishId, lia, agora);
    expect(lista.map((c) => c.tipo)).toEqual(expect.arrayContaining(["encontro", "tarefa"]));
    const encontro = lista.find((c) => c.tipo === "encontro")!;
    expect(encontro).toMatchObject({ titulo: "Pastoral da Acolhida", encontroId, vai: null });
    expect(lista.find((c) => c.tipo === "tarefa")?.titulo).toBe("Você fica com: Café da acolhida");

    // Quem não é do grupo não carrega o encontro dos outros.
    expect(await meusCompromissos(parishId, rui, agora)).toEqual([]);
  });

  it("vou / não posso: só quem é do grupo responde, e a coordenação vê a conta", async () => {
    await responderEncontro(parishId, lia, encontroId, true);
    expect(await minhaRespostaAoEncontro(parishId, lia, encontroId)).toBe(true);
    await expect(responderEncontro(parishId, rui, encontroId, true)).rejects.toThrow(/Só quem é do grupo/);

    // Trocar de ideia troca a resposta, não soma outra.
    await responderEncontro(parishId, lia, encontroId, false);
    const contagem = (await respostasDosEncontros(parishId, [encontroId])).get(encontroId);
    expect(contagem).toEqual({ vao: 0, naoPodem: 1 });

    const lista = await meusCompromissos(parishId, lia, agora);
    expect(lista.find((c) => c.tipo === "encontro")?.vai).toBe(false);
  });

  it("qualquer pessoa da paróquia responde a um evento", async () => {
    await responderEvento(parishId, rui, eventoId, true);
    await responderEvento(parishId, lia, eventoId, true);
    const r = await respostasDosEventos(parishId, rui, [eventoId]);
    expect(r.minhas.get(eventoId)).toBe(true);
    expect(r.contagens.get(eventoId)).toEqual({ vao: 2, naoPodem: 0 });
  });
});
